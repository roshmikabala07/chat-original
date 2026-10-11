
const API_URL = "http://localhost:5000";

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const switchButton = document.getElementById("switchButton");
const authForm = document.getElementById("authForm");

const nameField = document.getElementById("nameField");
const phoneField = document.getElementById("phoneField");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const submitButton = document.getElementById("submitButton");
const switchLabel = document.getElementById("switchLabel");
const message = document.getElementById("message");

let isRegistering = false;

function showMessage(text, success = false) {
    message.textContent = text;
    message.style.color = success ? "#16803d" : "#c0392b";
}

function setMode(registerMode) {
    isRegistering = registerMode;
    authForm.reset();
    showMessage("");

    nameField.classList.toggle("hidden", !registerMode);
    phoneField.classList.toggle("hidden", !registerMode);
    nameInput.required = registerMode;

    loginTab.classList.toggle("active", !registerMode);
    registerTab.classList.toggle("active", registerMode);

    formTitle.textContent = registerMode
        ? "Create your account"
        : "Welcome back!";

    formSubtitle.textContent = registerMode
        ? "Join Connect and start chatting."
        : "Login to continue chatting.";

    submitButton.textContent = registerMode ? "Create Account" : "Login";

    switchLabel.textContent = registerMode
        ? "Already have an account?"
        : "Don't have an account?";

    switchButton.textContent = registerMode ? "Login" : "Register";
}

loginTab.addEventListener("click", () => setMode(false));
registerTab.addEventListener("click", () => setMode(true));

switchButton.addEventListener("click", () => {
    setMode(!isRegistering);
});

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("Please wait...");

    const endpoint = isRegistering ? "/api/register" : "/api/login";

    const data = {
        email: emailInput.value.trim(),
        password: passwordInput.value
    };

    if (isRegistering) {
        data.name = nameInput.value.trim();
        data.phone = phoneInput.value.trim();
    }

    try {
        const response = await fetch(API_URL + endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            showMessage(result.message || "Something went wrong.");
            return;
        }

        showMessage(result.message, true);

        if (!isRegistering) {
            sessionStorage.setItem(
                "chatUser",
                JSON.stringify(result.user)
            );

            setTimeout(() => {
                window.location.href = "chat.html";
            }, 700);
        } else {
            authForm.reset();
        }
    } catch (error) {
        console.error(error);
        showMessage(
            "Cannot connect to the server. Make sure your backend is running."
        );
    }
});

setMode(false);
