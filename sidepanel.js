async function getCurrentVideoId() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab || !tab.url) {
        return null;
    }

    try {
        const url = new URL(tab.url);

        if (url.hostname !== "www.youtube.com") {
            return null;
        }

        return url.searchParams.get("v");

    } catch (error) {
        console.error(error);
        return null;
    }
}


async function updateVideoId() {
    const videoIdElement = document.getElementById("video-id");

    const videoId = await getCurrentVideoId();

    if (videoId) {
        videoIdElement.textContent = videoId;
    } else {
        videoIdElement.textContent = "YouTubeの動画ページではありません";
    }
}


updateVideoId();