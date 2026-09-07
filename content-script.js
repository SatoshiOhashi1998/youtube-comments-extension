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

    // Shorts
    const shortsTitleElement = document.querySelector(
        "h1.ytShortsVideoTitleViewModelShortsVideoTitle"
    );

    if (shortsTitleElement) {
        const title = shortsTitleElement.textContent.trim();

        if (title) {
            return title;
        }
    }

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

    // 最終手段として document.title
    const documentTitle = document.title;

    if (documentTitle) {
        return documentTitle
            .replace(/\s*-\s*YouTube\s*$/, "")
            .trim();
    }

    return null;
}



async function waitForYouTubeVideoTitle(videoId, oldTitle = null) {
    const url = new URL(window.location.href);
    const isShorts = url.pathname.startsWith("/shorts/");
    const isLive = url.pathname.startsWith("/live/");

    for (let i = 0; i < 40; i++) {

        const currentVideoId = getYouTubeVideoId();

        // 別の動画へ移動していたら中止
        if (currentVideoId !== videoId) {
            return null;
        }

        const title = getYouTubeVideoTitle();

        if (title) {

            // Shorts / Live
            // YouTube側のDOM・document.titleの更新を少し待つ
            if (isShorts || isLive) {

                if (i >= 2) {
                    return title;
                }
            }

            // 通常動画
            // 前のタイトルから変わるまで待つ
            else {
                if (!oldTitle || title !== oldTitle) {
                    return title;
                }
            }
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

    // 待っている間に別の動画へ移動していた場合は、
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