const API_BASE_URL = "http://127.0.0.1:5000";
let editingCommentId = null;
let otherCommentsVisible = false;

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
            `${API_BASE_URL}/api/comments/${videoId}?type=youtube`
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

        const metaElement = document.createElement("div");
        metaElement.className = "comment-meta";

        const typeElement = document.createElement("span");
        typeElement.className = "comment-type";
        typeElement.textContent = comment.media_type;

        const dateElement = document.createElement("span");
        dateElement.className = "comment-date";
        dateElement.textContent = comment.created_at;

        metaElement.appendChild(typeElement);
        metaElement.appendChild(dateElement);

        const editButton = document.createElement("button");
        editButton.textContent = "編集";

        editButton.addEventListener("click", () => {
            editComment(comment);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "削除";

        deleteButton.addEventListener("click", () => {
            deleteComment(comment);
        });

        commentElement.appendChild(contentElement);
        commentElement.appendChild(metaElement);
        commentElement.appendChild(editButton);
        commentElement.appendChild(deleteButton);

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

async function postComment() {
    const videoId = await getCurrentVideoId();
    const inputElement = document.getElementById("comment-input");
    const content = inputElement.value.trim();

    if (!videoId) {
        alert("YouTubeの動画ページではありません");
        return;
    }

    if (!content) {
        return;
    }

    try {
        let response;

        if (editingCommentId !== null) {
            // コメント編集
            response = await fetch(
                `${API_BASE_URL}/api/comments/${editingCommentId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        content: content
                    })
                }
            );
        } else {
            // 新規コメント投稿
            response = await fetch(
                `${API_BASE_URL}/api/comments/${videoId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        media_type: "youtube",
                        content: content
                    })
                }
            );
        }

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        // 入力欄をクリア
        inputElement.value = "";

        // 編集状態を解除
        editingCommentId = null;

        document.getElementById("post-comment-button").textContent = "投稿";
        document.getElementById("cancel-edit-button").hidden = true;

        // コメント一覧を再取得
        await loadComments(videoId);

    } catch (error) {
        console.error("コメント保存エラー:", error);
        alert("コメントを保存できませんでした");
    }
}

function editComment(comment) {
    const inputElement = document.getElementById("comment-input");
    const postButton = document.getElementById("post-comment-button");
    const cancelButton = document.getElementById("cancel-edit-button");

    editingCommentId = comment.id;

    inputElement.value = comment.content;
    inputElement.focus();

    postButton.textContent = "更新";
    cancelButton.hidden = false;
}

async function deleteComment(comment) {
    const confirmed = confirm(
        "このコメントを削除しますか？"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/comments/${comment.id}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const videoId = await getCurrentVideoId();

        await loadComments(videoId);

    } catch (error) {
        console.error("コメント削除エラー:", error);
        alert("コメントを削除できませんでした");
    }
}

async function loadOtherComments(videoId) {
    if (!videoId) {
        return [];
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/comments/${videoId}/others?exclude_type=youtube`
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error("その他のコメント取得エラー:", error);
        alert("その他のコメントを取得できませんでした");
        return [];
    }
}

document
    .getElementById("post-comment-button")
    .addEventListener("click", postComment);


document
    .getElementById("cancel-edit-button")
    .addEventListener("click", () => {
        const inputElement = document.getElementById("comment-input");
        const postButton = document.getElementById("post-comment-button");
        const cancelButton = document.getElementById("cancel-edit-button");

        editingCommentId = null;

        inputElement.value = "";
        postButton.textContent = "投稿";
        cancelButton.hidden = true;
    });

document
    .getElementById("toggle-other-comments-button")
    .addEventListener("click", async () => {
        const button = document.getElementById(
            "toggle-other-comments-button"
        );

        const videoId = await getCurrentVideoId();

        if (!videoId) {
            return;
        }

        if (otherCommentsVisible) {
            // 非表示にする
            otherCommentsVisible = false;
            button.textContent = "その他のコメントを表示";

            await loadComments(videoId);

        } else {
            // 表示する
            const otherComments = await loadOtherComments(videoId);

            otherCommentsVisible = true;
            button.textContent = "その他のコメントを非表示";

            // YouTubeコメントを取得
            const response = await fetch(
                `${API_BASE_URL}/api/comments/${videoId}?type=youtube`
            );

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const youtubeComments = await response.json();

            // 2種類をまとめて表示
            displayComments([
                ...youtubeComments,
                ...otherComments
            ]);
        }
    });
