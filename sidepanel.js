async function getCurrentVideoId() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab || !tab.url) {
        return null;
    }

    return getVideoIdFromUrl(tab.url);
}


function getVideoIdFromUrl(urlString) {
    try {
        const url = new URL(urlString);

        if (url.hostname !== "www.youtube.com") {
            return null;
        }

        return url.searchParams.get("v");

    } catch (error) {
        console.error(error);
        return null;
    }
}


function displayVideoId(videoId) {
    const videoIdElement = document.getElementById("video-id");

    if (videoId) {
        videoIdElement.textContent = videoId;
    } else {
        videoIdElement.textContent = "YouTubeの動画ページではありません";
    }
}


async function updateVideoId() {
    const videoId = await getCurrentVideoId();
    displayVideoId(videoId);
}


// 最初にSide Panelを開いたとき
updateVideoId();


// YouTubeのURL変更通知を受け取る
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "youtube-url-changed") {
        const videoId = getVideoIdFromUrl(message.url);
        displayVideoId(videoId);
    }
});