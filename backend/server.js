
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Chat Application Backend is Running!");
});

function validId(value) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0;
}

// ================= REGISTRATION =================

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (
            typeof name !== "string" || !name.trim() ||
            typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || password.length < 6
        ) {
            return res.status(400).json({
                message: "Enter a name, valid email and password of at least 6 characters."
            });
        }

        const [existing] = await db.execute(
            "SELECT userid FROM users WHERE email = ?",
            [email.trim()]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "This email is already registered."
            });
        }

        const hashed = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            `INSERT INTO users (name, email, phone, password)
             VALUES (?, ?, ?, ?)`,
            [
                name.trim(),
                email.trim(),
                typeof phone === "string" && phone.trim()
                    ? phone.trim()
                    : null,
                hashed
            ]
        );

        res.status(201).json({
            success: true,
            message: "Registration successful!",
            user: {
                userid: result.insertId,
                name: name.trim(),
                email: email.trim(),
                phone: phone || null
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);
        res.status(500).json({ message: "Registration failed." });
    }
});

// ================= LOGIN =================

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Enter your email and password."
            });
        }

        const [users] = await db.execute(
            `SELECT userid, name, email, phone, password
             FROM users WHERE email = ?`,
            [email.trim()]
        );

        if (
            !users.length ||
            !(await bcrypt.compare(password, users[0].password))
        ) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        res.json({
            success: true,
            message: "Login successful!",
            user: {
                userid: user.userid,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Login failed." });
    }
});

// ================= USERS =================

app.get("/api/users/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!validId(userId)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        const [users] = await db.execute(
            `SELECT userid, name, email
             FROM users WHERE userid <> ?
             ORDER BY name`,
            [userId]
        );

        res.json({ users });
    } catch (error) {
        console.error("Users error:", error.message);
        res.status(500).json({ message: "Could not load users." });
    }
});

// ================= DIRECT MESSAGES =================

app.get("/api/messages/:userId/:otherUserId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const otherId = Number(req.params.otherUserId);

        if (!validId(userId) || !validId(otherId)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        const [messages] = await db.execute(
            `SELECT messageid, senderid, receiverid, content, status, createdAt
             FROM messages
             WHERE groupid IS NULL
               AND (
                 (senderid = ? AND receiverid = ?)
                 OR (senderid = ? AND receiverid = ?)
               )
             ORDER BY createdAt ASC, messageid ASC`,
            [userId, otherId, otherId, userId]
        );

        res.json({ messages });
    } catch (error) {
        console.error("Direct messages error:", error.message);
        res.status(500).json({ message: "Could not load messages." });
    }
});

app.post("/api/messages", async (req, res) => {
    try {
        const senderId = Number(req.body.senderid);
        const receiverId = Number(req.body.receiverid);
        const content = typeof req.body.content === "string"
            ? req.body.content.trim()
            : "";

        if (
            !validId(senderId) ||
            !validId(receiverId) ||
            senderId === receiverId ||
            !content ||
            content.length > 5000
        ) {
            return res.status(400).json({
                message: "Enter a valid recipient and message."
            });
        }

        const [users] = await db.execute(
            "SELECT userid FROM users WHERE userid IN (?, ?)",
            [senderId, receiverId]
        );

        if (users.length !== 2) {
            return res.status(404).json({
                message: "Sender or recipient not found."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO messages
             (senderid, receiverid, groupid, content, status, createdAt)
             VALUES (?, ?, NULL, ?, 'sent', NOW())`,
            [senderId, receiverId, content]
        );

        res.status(201).json({
            success: true,
            message: "Message sent!",
            messageid: result.insertId
        });
    } catch (error) {
        console.error("Send direct message error:", error.message);
        res.status(500).json({ message: "Could not send message." });
    }
});

// ================= CREATE GROUP =================

app.post("/api/groups", async (req, res) => {
    let connection;
    let transactionStarted = false;

    try {
        const groupName = typeof req.body.groupName === "string"
            ? req.body.groupName.trim()
            : "";
        const creatorId = Number(req.body.creatorId);

        if (
            !groupName ||
            groupName.length > 100 ||
            !validId(creatorId)
        ) {
            return res.status(400).json({
                message: "Enter a group name and valid creator ID."
            });
        }

        const [users] = await db.execute(
            "SELECT userid FROM users WHERE userid = ?",
            [creatorId]
        );

        if (!users.length) {
            return res.status(404).json({
                message: "Creator account not found."
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [group] = await connection.execute(
            "INSERT INTO group_chats (groupName) VALUES (?)",
            [groupName]
        );

        await connection.execute(
            `INSERT INTO group_members (groupid, userid, role)
             VALUES (?, ?, 'admin')`,
            [group.insertId, creatorId]
        );

        await connection.commit();
        transactionStarted = false;

        res.status(201).json({
            success: true,
            message: "Group created successfully!",
            group: {
                groupid: group.insertId,
                groupName
            }
        });
    } catch (error) {
        if (connection && transactionStarted) {
            await connection.rollback();
        }

        console.error("Create group error:", error.message);
        res.status(500).json({
            message: "Could not create group. Check your group table columns."
        });
    } finally {
        if (connection) connection.release();
    }
});

// ================= LIST USER GROUPS =================

app.get("/api/groups/user/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!validId(userId)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        const [groups] = await db.execute(
            `SELECT g.groupid, g.groupName, g.createdAt
             FROM group_chats g
             JOIN group_members gm ON gm.groupid = g.groupid
             WHERE gm.userid = ?
             ORDER BY g.createdAt DESC`,
            [userId]
        );

        res.json({ groups });
    } catch (error) {
        console.error("List groups error:", error.message);
        res.status(500).json({ message: "Could not load groups." });
    }
});

// ================= ADD GROUP MEMBER =================

app.post("/api/groups/:groupId/members", async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);
        const userId = Number(req.body.userId);

        if (!validId(groupId) || !validId(userId)) {
            return res.status(400).json({
                message: "Invalid group or user ID."
            });
        }

        const [groups] = await db.execute(
            "SELECT groupid FROM group_chats WHERE groupid = ?",
            [groupId]
        );

        const [users] = await db.execute(
            "SELECT userid FROM users WHERE userid = ?",
            [userId]
        );

        if (!groups.length || !users.length) {
            return res.status(404).json({
                message: "Group or user not found."
            });
        }

        const [existing] = await db.execute(
            `SELECT userid FROM group_members
             WHERE groupid = ? AND userid = ?`,
            [groupId, userId]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "This user is already in the group."
            });
        }

        await db.execute(
            `INSERT INTO group_members (groupid, userid, role)
             VALUES (?, ?, 'member')`,
            [groupId, userId]
        );

        res.status(201).json({
            success: true,
            message: "Member added successfully!"
        });
    } catch (error) {
        console.error("Add member error:", error.message);
        res.status(500).json({ message: "Could not add member." });
    }
});

// ================= SEND GROUP MESSAGE =================

app.post("/api/groups/:groupId/messages", async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);
        const senderId = Number(req.body.senderId);
        const content = typeof req.body.content === "string"
            ? req.body.content.trim()
            : "";

        if (
            !validId(groupId) ||
            !validId(senderId) ||
            !content ||
            content.length > 5000
        ) {
            return res.status(400).json({
                message: "Enter a valid group and message."
            });
        }

        const [membership] = await db.execute(
            `SELECT userid FROM group_members
             WHERE groupid = ? AND userid = ?`,
            [groupId, senderId]
        );

        if (!membership.length) {
            return res.status(403).json({
                message: "You are not a member of this group."
            });
        }

        // Use the sender as receiver for schema compatibility.
        // Group messages are distinguished by their non-NULL groupid.
        const [result] = await db.execute(
            `INSERT INTO messages
             (senderid, receiverid, groupid, content, status, createdAt)
             VALUES (?, ?, ?, ?, 'sent', NOW())`,
            [senderId, senderId, groupId, content]
        );

        res.status(201).json({
            success: true,
            message: "Group message sent!",
            messageid: result.insertId
        });
    } catch (error) {
        console.error("Send group message error:", error.message);
        res.status(500).json({
            message: "Could not send group message. Check messages table."
        });
    }
});

// ================= READ GROUP MESSAGES =================

app.get("/api/groups/:groupId/messages", async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);
        const userId = Number(req.query.userId);

        if (!validId(groupId) || !validId(userId)) {
            return res.status(400).json({
                message: "Valid group and user IDs are required."
            });
        }

        const [membership] = await db.execute(
            `SELECT userid FROM group_members
             WHERE groupid = ? AND userid = ?`,
            [groupId, userId]
        );

        if (!membership.length) {
            return res.status(403).json({
                message: "You are not a member of this group."
            });
        }

        const [messages] = await db.execute(
            `SELECT messageid, senderid, content, status, createdAt
             FROM messages
             WHERE groupid = ?
             ORDER BY createdAt ASC, messageid ASC`,
            [groupId]
        );

        res.json({ messages });
    } catch (error) {
        console.error("Read group messages error:", error.message);
        res.status(500).json({
            message: "Could not load group messages."
        });
    }
});

// ================= TEST DATABASE =================

app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT DATABASE() AS databaseName"
        );

        res.json({
            success: true,
            database: rows[0].databaseName
        });
    } catch (error) {
        console.error("Database test error:", error.message);
        res.status(500).json({ message: "Database connection failed." });
    }
});

// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await db.query("SELECT 1");
        console.log("MySQL connected successfully!");
        console.log("Database:", process.env.DB_NAME || "chat");

        app.listen(PORT, () => {
            console.log(`Backend running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
        process.exit(1);
    }
}

startServer();
