chrome.runtime.onInstalled.addListener(() => {
    console.log("My YouTube Comments installed");
});


chrome.sidePanel
    .setPanelBehavior({
        openPanelOnActionClick: true
    })
    .catch(console.error);


// YouTubeのページが更新されたとき
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.runtime.sendMessage({
            type: "youtube-url-changed",
            url: changeInfo.url
        });
    }
});
