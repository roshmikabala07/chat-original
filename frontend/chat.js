
const API_URL = "http://localhost:5000";

let currentUser;

try {
    currentUser = JSON.parse(
        sessionStorage.getItem("chatUser") || "null"
    );
} catch {
    currentUser = null;
}

if (!currentUser) {
    window.location.href = "index.html";
} else {
    startChatApp();
}

function startChatApp() {
    const userList = document.getElementById("userList");
    const groupList = document.getElementById("groupList");
    const chatTitle = document.getElementById("chatTitle");
    const messagesBox = document.getElementById("messages");
    const messageForm = document.getElementById("messageForm");
    const messageInput = document.getElementById("messageInput");
    const sendButton = messageForm.querySelector("button");
    const statusText = document.getElementById("status");

    let selectedChat = null;
    let refreshTimer = null;
    let lastMessageSignature = "";

    document.getElementById("currentUserName").textContent =
        currentUser.name;

    function showStatus(text) {
        statusText.textContent = text;
    }

    function makeButton(text, className, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.className = className;
        button.addEventListener("click", onClick);
        return button;
    }

    async function apiRequest(path, options = {}) {
        const response = await fetch(API_URL + path, {
            ...options,
            headers: {
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...options.headers
            }
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message || `Request failed (${response.status}).`
            );
        }

        return result;
    }

    document.getElementById("logoutButton").addEventListener("click", () => {
        if (refreshTimer) clearInterval(refreshTimer);
        sessionStorage.removeItem("chatUser");
        window.location.href = "index.html";
    });

    function selectChat(chat) {
        selectedChat = chat;
        lastMessageSignature = "";

        chatTitle.replaceChildren();

        const title = document.createElement("span");
        title.textContent = chat.type === "group"
            ? `Group: ${chat.groupName}`
            : `Chat with ${chat.name}`;

        chatTitle.appendChild(title);

        if (chat.type === "group") {
            const addButton = makeButton(
                "Add Member",
                "",
                addGroupMember
            );

            addButton.id = "addMemberButton";
            chatTitle.appendChild(addButton);
        }

        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();

        loadMessages();
    }

    // ---------------- LOAD PEOPLE ----------------

    async function loadUsers() {
        try {
            const result = await apiRequest(
                `/api/users/${currentUser.userid}`
            );

            userList.replaceChildren();

            if (result.users.length === 0) {
                userList.textContent = "No other users yet.";
                return;
            }

            result.users.forEach(user => {
                const button = makeButton(
                    user.name,
                    "user-item",
                    () => selectChat({
                        type: "user",
                        userid: user.userid,
                        name: user.name
                    })
                );

                if (
                    selectedChat?.type === "user" &&
                    Number(selectedChat.userid) === Number(user.userid)
                ) {
                    button.classList.add("selected");
                }

                userList.appendChild(button);
            });
        } catch (error) {
            showStatus("Users: " + error.message);
        }
    }

    // ---------------- LOAD GROUPS ----------------

    async function loadGroups() {
        try {
            const result = await apiRequest(
                `/api/groups/user/${currentUser.userid}`
            );

            groupList.replaceChildren();

            if (result.groups.length === 0) {
                groupList.textContent = "No groups yet.";
                return;
            }

            result.groups.forEach(group => {
                const button = makeButton(
                    group.groupName,
                    "group-item",
                    () => selectChat({
                        type: "group",
                        groupid: group.groupid,
                        groupName: group.groupName
                    })
                );

                if (
                    selectedChat?.type === "group" &&
                    Number(selectedChat.groupid) === Number(group.groupid)
                ) {
                    button.classList.add("selected");
                }

                groupList.appendChild(button);
            });
        } catch (error) {
            showStatus("Groups: " + error.message);
        }
    }

    // ---------------- CREATE GROUP ----------------

    document.getElementById("createGroupButton")
        .addEventListener("click", async () => {
            const answer = prompt("Enter a name for your group:");

            if (answer === null || !answer.trim()) return;

            const groupName = answer.trim();

            if (groupName.length > 100) {
                showStatus("Group name must be 100 characters or fewer.");
                return;
            }

            try {
                const result = await apiRequest("/api/groups", {
                    method: "POST",
                    body: JSON.stringify({
                        groupName,
                        creatorId: currentUser.userid
                    })
                });

                await loadGroups();

                selectChat({
                    type: "group",
                    groupid: result.group.groupid,
                    groupName: result.group.groupName
                });

                showStatus(result.message);
            } catch (error) {
                showStatus("Create group: " + error.message);
            }
        });

    // ---------------- ADD MEMBER ----------------

    async function addGroupMember() {
        if (!selectedChat || selectedChat.type !== "group") return;

        const answer = prompt(
            "Enter the registered user's numeric ID:"
        );

        if (answer === null || !answer.trim()) return;

        const userId = Number(answer);

        if (!Number.isSafeInteger(userId) || userId < 1) {
            showStatus("Enter a valid numeric user ID.");
            return;
        }

        try {
            const result = await apiRequest(
                `/api/groups/${selectedChat.groupid}/members`,
                {
                    method: "POST",
                    body: JSON.stringify({ userId })
                }
            );

            showStatus(result.message);
        } catch (error) {
            showStatus("Add member: " + error.message);
        }
    }

    // ---------------- LOAD MESSAGES ----------------

    async function loadMessages() {
        if (!selectedChat) return;

        try {
            let path;

            if (selectedChat.type === "group") {
                path =
                    `/api/groups/${selectedChat.groupid}/messages` +
                    `?userId=${currentUser.userid}`;
            } else {
                path =
                    `/api/messages/${currentUser.userid}` +
                    `/${selectedChat.userid}`;
            }

            const result = await apiRequest(path);

            // Do not rebuild the conversation when nothing changed.
            const signature = JSON.stringify(
                result.messages.map(msg => [
                    msg.messageid,
                    msg.senderid,
                    msg.content,
                    msg.createdAt
                ])
            );

            if (signature === lastMessageSignature) return;

            lastMessageSignature = signature;
            messagesBox.replaceChildren();

            if (result.messages.length === 0) {
                const empty = document.createElement("p");
                empty.className = "empty-state";
                empty.textContent = "No messages yet. Say hello!";
                messagesBox.appendChild(empty);
                return;
            }

            result.messages.forEach(msg => {
                const bubble = document.createElement("div");

                bubble.className =
                    Number(msg.senderid) === Number(currentUser.userid)
                        ? "message mine"
                        : "message";

                if (selectedChat.type === "group") {
                    const sender = document.createElement("div");
                    sender.className = "sender";
                    sender.textContent =
                        Number(msg.senderid) === Number(currentUser.userid)
                            ? "You"
                            : `User ${msg.senderid}`;

                    bubble.appendChild(sender);
                }

                const content = document.createElement("div");
                content.textContent = msg.content;

                const time = document.createElement("small");
                time.textContent = msg.createdAt
                    ? new Date(msg.createdAt).toLocaleString()
                    : "";

                bubble.append(content, time);
                messagesBox.appendChild(bubble);
            });

            messagesBox.scrollTop = messagesBox.scrollHeight;
            showStatus("");
        } catch (error) {
            showStatus("Messages: " + error.message);
        }
    }

    // ---------------- SEND MESSAGE ----------------

    messageForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!selectedChat) {
            showStatus("Select a person or group first.");
            return;
        }

        const content = messageInput.value.trim();

        if (!content) return;

        sendButton.disabled = true;

        try {
            if (selectedChat.type === "group") {
                await apiRequest(
                    `/api/groups/${selectedChat.groupid}/messages`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            senderId: currentUser.userid,
                            content
                        })
                    }
                );
            } else {
                await apiRequest("/api/messages", {
                    method: "POST",
                    body: JSON.stringify({
                        senderid: currentUser.userid,
                        receiverid: selectedChat.userid,
                        content
                    })
                });
            }

            messageInput.value = "";
            lastMessageSignature = "";
            await loadMessages();
            messageInput.focus();
            showStatus("");
        } catch (error) {
            showStatus("Send failed: " + error.message);
        } finally {
            sendButton.disabled = false;
        }
    });

    // ---------------- START ----------------

    messageInput.disabled = true;
    sendButton.disabled = true;

    loadUsers();
    loadGroups();

    refreshTimer = setInterval(() => {
        loadUsers();
        loadGroups();

        if (selectedChat) {
            loadMessages();
        }
    }, 3000);

    window.addEventListener("beforeunload", () => {
        if (refreshTimer) clearInterval(refreshTimer);
    });
}
