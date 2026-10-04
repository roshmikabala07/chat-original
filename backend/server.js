const express = require("express");
const cors = require("cors");

const app = express();


// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());

app.use(express.json());


// =====================================
// HOME ROUTE
// =====================================

app.get("/", (req, res) => {

    res.send("Chat Application Backend is Running!");

});


// =====================================
// TEST API
// =====================================

app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "Backend API is working successfully!"
    });

});


// =====================================
// REGISTER API - TEMPORARY
// =====================================

app.post("/api/register", (req, res) => {

    const { name, email, phone, password } = req.body;

    console.log("=================================");
    console.log("NEW REGISTRATION");
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Phone:", phone);
    console.log("=================================");

    res.json({
        success: true,
        message: "Registration request received!",
        user: {
            name: name,
            email: email,
            phone: phone
        }
    });

});


// =====================================
// LOGIN API - TEMPORARY
// =====================================

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    console.log("=================================");
    console.log("LOGIN REQUEST");
    console.log("Email:", email);
    console.log("=================================");

    if (!email || !password) {

        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });

    }

    res.json({
        success: true,
        message: "Login request received!",
        email: email
    });

});


// =====================================
// MESSAGE API - TEMPORARY
// =====================================

app.post("/api/messages", (req, res) => {

    const { senderid, content } = req.body;

    console.log("=================================");
    console.log("NEW MESSAGE");
    console.log("Sender:", senderid);
    console.log("Message:", content);
    console.log("=================================");

    res.json({
        success: true,
        message: "Message received by backend!",
        data: {
            senderid: senderid,
            content: content
        }
    });

});


// =====================================
// START SERVER
// =====================================

const PORT = 5000;

app.listen(PORT, () => {

    console.log("-----------------------------------------");
    console.log("CHAT APPLICATION BACKEND");
    console.log("-----------------------------------------");
    console.log("Server is running on:");
    console.log("http://localhost:5000");
    console.log("-----------------------------------------");

});