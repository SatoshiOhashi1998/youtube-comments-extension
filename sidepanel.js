const API_BASE_URL = "http://127.0.0.1:5000";


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


async function loadComments(videoId) {
    const commentsElement = document.getElementById("comments");

    if (!videoId) {
        commentsElement.textContent = "動画が選択されていません";
        return;
    }

    commentsElement.textContent = "コメントを取得中...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/comments/${videoId}?type=video`
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const comments = await response.json();

        displayComments(comments);

    } catch (error) {
        console.error("コメント取得エラー:", error);
        commentsElement.textContent = "コメントを取得できませんでした";
    }
}


function displayComments(comments) {
    const commentsElement = document.getElementById("comments");

    if (comments.length === 0) {
        commentsElement.textContent = "コメントはありません";
        return;
    }

    commentsElement.innerHTML = "";

    comments.forEach(comment => {
        const commentElement = document.createElement("div");
        commentElement.className = "comment";

        const contentElement = document.createElement("div");
        contentElement.className = "comment-content";
        contentElement.textContent = comment.content;

        const dateElement = document.createElement("div");
        dateElement.className = "comment-date";
        dateElement.textContent = comment.created_at;

        commentElement.appendChild(contentElement);
        commentElement.appendChild(dateElement);

        commentsElement.appendChild(commentElement);
    });
}


async function updateVideo(videoId) {
    displayVideoId(videoId);
    await loadComments(videoId);
}


async function updateVideoId() {
    const videoId = await getCurrentVideoId();
    await updateVideo(videoId);
}


// 最初にSide Panelを開いたとき
updateVideoId();


// YouTubeのURL変更通知を受け取る
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "youtube-url-changed") {
        const videoId = getVideoIdFromUrl(message.url);
        updateVideo(videoId);
    }
});