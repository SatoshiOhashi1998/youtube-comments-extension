chrome.runtime.onInstalled.addListener(() => {
    console.log("My YouTube Comments installed");
});

chrome.sidePanel
    .setPanelBehavior({
        openPanelOnActionClick: true
    })
    .catch(console.error);
