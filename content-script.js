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



async function waitForYouTubeVideoTitle(videoId) {
    for (let i = 0; i < 40; i++) {

        const currentVideoId = getYouTubeVideoId();

        if (currentVideoId !== videoId) {
            return null;
        }

        const title = getYouTubeVideoTitle();

        if (title) {
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

    lastVideoId = videoId;

const title = await waitForYouTubeVideoTitle(
    videoId
);

    // 待っている間に別のShortsへ移動していた場合は、
    // 古い動画の通知を送らない
    const currentVideoId = getYouTubeVideoId();

    if (currentVideoId !== videoId) {
        return;
    }

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
    const url = window.location.href;
    const videoId = getYouTubeVideoId();

    console.log(
        "Shorts監視:",
        url,
        "ID:",
        videoId,
        "last:",
        lastVideoId
    );

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