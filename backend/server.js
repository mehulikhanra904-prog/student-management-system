const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const dns = require("dns");

// ======================================================
// DNS CONFIGURATION
// ======================================================

dns.setServers([
    "8.8.8.8",
    "8.8.4.4",
]);

// ======================================================
// ENVIRONMENT CONFIGURATION
// ======================================================

const envPath = path.join(__dirname, ".env");
const nestedEnvPath = path.join(envPath, ".env");

const dotenvPath =
    fs.existsSync(envPath) && fs.statSync(envPath).isDirectory()
        ? nestedEnvPath
        : envPath;

dotenv.config({
    path: dotenvPath,
});

// ======================================================
// ROUTES
// ======================================================

const authRoutes = require("./routes/authRoutes");

// ======================================================
// EXPRESS APP
// ======================================================

const app = express();

// ======================================================
// CORS
// ======================================================

app.use(
    cors({
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
    })
);

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// AUTH ROUTES
// ======================================================

app.use("/api/auth", authRoutes);

// ======================================================
// ROOT ROUTE
// ======================================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Student Management System API is running",
    });
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        ok: true,
        status: "healthy",
        database:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected",
        dns: [
            "8.8.8.8",
            "8.8.4.4",
        ],
    });
});

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
    });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    if (err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({
            success: false,
            message: err.message || "Client error",
        });
    }

    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

// ======================================================
// START SERVER
// ======================================================

const startServer = async () => {
    try {
        // Check MongoDB URI
        if (!process.env.MONGO_URI) {
            throw new Error(
                "MONGO_URI is required to start the backend"
            );
        }

        // Check JWT secret
        if (!process.env.JWT_SECRET) {
            throw new Error(
                "JWT_SECRET is required to start the backend"
            );
        }

        console.log("=================================");
        console.log("Starting Student Management API");
        console.log("=================================");

        console.log("DNS Servers:");
        console.log("Primary DNS: 8.8.8.8");
        console.log("Secondary DNS: 8.8.4.4");

        // Connect MongoDB
        console.log("Connecting to MongoDB...");

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully");

        // Start server
        const PORT = process.env.PORT || 5000;

        app.listen(PORT, "0.0.0.0", () => {
            console.log("---------------------------------");
            console.log(`Server running on port ${PORT}`);
            console.log(`Health: http://localhost:${PORT}/health`);
            console.log("---------------------------------");
        });
    } catch (error) {
        console.error(
            "Failed to start server:",
            error.message
        );

        process.exit(1);
    }
};

// ======================================================
// RUN
// ======================================================

if (require.main === module) {
    startServer();
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {
    app,
    startServer,
};