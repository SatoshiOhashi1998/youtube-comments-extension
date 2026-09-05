function getYouTubeVideoTitle() {
    const titleElement = document.querySelector("h1.ytd-watch-metadata");

    if (!titleElement) {
        return null;
    }

    return titleElement.textContent.trim();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "get-youtube-title") {
        const title = getYouTubeVideoTitle();

        sendResponse({
            title: title
        });
    }
});