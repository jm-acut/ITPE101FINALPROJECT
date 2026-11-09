import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import supabase from "./src/config/database.js";

dotenv.config();

const app = express();

app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to NEXUS PC API"
    });
});

app.get("/api/v1/health", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("categories")
            .select("id")
            .limit(1);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: "NEXUS PC API and Supabase are connected.",
            database: "Connected"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed.",
            error: error.message
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`NEXUS PC server running on port ${PORT}`);
});