// ============================
// REGISTER
// ============================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const phone = document.getElementById("registerPhone").value;
        const password = document.getElementById("registerPassword").value;

        alert(
            "Registration successful!\n\n" +
            "Name: " + name +
            "\nEmail: " + email
        );

        window.location.href = "index.html";
    });
}


// ============================
// LOGIN
// ============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        if (email !== "" && password !== "") {

            localStorage.setItem("currentUser", email);

            window.location.href = "chat.html";

        } else {

            alert("Please enter email and password.");

        }
    });
}


// ============================
// SEND MESSAGE
// ============================

function sendMessage() {

    const input = document.getElementById("messageInput");
    const messages = document.getElementById("messages");

    if (!input || !messages) {
        return;
    }

    const messageText = input.value.trim();

    if (messageText === "") {
        return;
    }

    const messageDiv = document.createElement("div");

    messageDiv.classList.add("message", "sent");

    messageDiv.innerHTML = `
        <span class="message-user">You</span>
        <p>${messageText}</p>
        <small>Now</small>
    `;

    messages.appendChild(messageDiv);

    input.value = "";

    messages.scrollTop = messages.scrollHeight;
}


// ============================
// LOGOUT
// ============================

function logout() {

    localStorage.removeItem("currentUser");

    window.location.href = "index.html";
}


// ============================
// GROUP CHAT
// ============================

function showGroupMessage() {

    alert("Group Chat feature will be connected to the backend later.");
}


// ============================
// ADMIN
// ============================

function manageUsers() {

    alert("User management will be connected to the backend.");
}

function manageChats() {

    alert("Chat management will be connected to the backend.");
}

function manageGroups() {

    alert("Group management will be connected to the backend.");
}