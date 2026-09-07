console.log("My YouTube Comments: content-script.js loaded");
let lastVideoId = null;

function getYouTubeVideoId() {
    const url = new URL(window.location.href);

    if (url.hostname !== "www.youtube.com") {
        return null;
    }

    // 通常の動画
    const videoId = url.searchParams.get("v");

    if (videoId) {
        return videoId;
    }

    // Shorts
    const shortsMatch = url.pathname.match(
        /^\/shorts\/([^/?]+)/
    );

    if (shortsMatch) {
        return shortsMatch[1];
    }

    // Live
    const liveMatch = url.pathname.match(
        /^\/live\/([^/?]+)/
    );

    if (liveMatch) {
        return liveMatch[1];
    }

    return null;
}



function getYouTubeVideoTitle() {

    // 通常の動画ページ
    const titleElement = document.querySelector(
        "h1.ytd-watch-metadata"
    );

    if (titleElement) {
        const title = titleElement.textContent.trim();

        if (title) {
            return title;
        }
    }

    // Shortsなどでは document.title が使える
    const documentTitle = document.title;

    if (documentTitle) {
        // YouTubeのページタイトルは
        // 「動画タイトル - YouTube」になることがある
        return documentTitle
            .replace(/\s*-\s*YouTube\s*$/, "")
            .trim();
    }

    return null;
}



async function waitForYouTubeVideoTitle(videoId, oldTitle = null) {
    for (let i = 0; i < 40; i++) {

        const currentVideoId = getYouTubeVideoId();
        const title = getYouTubeVideoTitle();

        if (
            currentVideoId === videoId &&
            title &&
            title !== oldTitle
        ) {
            return title;
        }

        await new Promise(resolve => {
            setTimeout(resolve, 250);
        });
    }

    return null;
}


async function notifyVideoChanged() {
    const videoId = getYouTubeVideoId();

    if (!videoId) {
        return;
    }

    if (videoId === lastVideoId) {
        return;
    }

    // 現在表示されているタイトルを保存
    const oldTitle = getYouTubeVideoTitle();

    lastVideoId = videoId;

    // 新しい動画のタイトルになるまで待つ
    const title = await waitForYouTubeVideoTitle(
        videoId,
        oldTitle
    );

    console.log(
        "YouTube動画変更:",
        videoId,
        title
    );

    chrome.runtime.sendMessage({
        type: "youtube-video-changed",
        videoId: videoId,
        title: title
    });
}


/*
 * 初回
 */
notifyVideoChanged();


/*
 * YouTubeはSPAなので、URLの変化を監視する
 */
setInterval(() => {
    notifyVideoChanged();
}, 500);


/*
 * Side Panelからタイトルを要求された場合
 */
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (message.type === "get-youtube-title") {

            waitForYouTubeVideoTitle(message.videoId)
                .then(title => {
                    sendResponse({
                        title: title
                    });
                });

            return true;
        }
    }
);