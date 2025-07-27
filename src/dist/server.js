"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const helmet_1 = __importDefault(require("helmet"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || "4000");
const dbPath = process.env.DB_PATH || "./data/data.db";
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
const db = new better_sqlite3_1.default(dbPath);
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express_1.default.json());
const paginationSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val.trim(), 10)),
    limit: zod_1.z
        .string()
        .optional()
        .default("10")
        .transform((val) => parseInt(val.trim(), 10)),
});
const userIdSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
});
const postIdSchema = zod_1.z.object({
    postId: zod_1.z.string().min(1, "Post ID is required"),
});
const createPostSchema = zod_1.z.object({
    userId: zod_1.z.string().trim().min(1, "Post ID is required"),
    title: zod_1.z.string().trim().min(1, { message: "Title is required" }),
    body: zod_1.z.string().trim().min(1, { message: "Body is required" }),
});
// List users with pagination
app.get("/users", (req, res, next) => {
    try {
        const parsed = paginationSchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid pagination params",
                errors: parsed.error.format(),
            });
        }
        const { page, limit } = parsed.data;
        const offset = (page - 1) * limit;
        const result = db
            .prepare("SELECT COUNT(*) as count FROM users")
            .get();
        const total = result?.count ?? 0;
        const users = db
            .prepare("SELECT * FROM users LIMIT ? OFFSET ?")
            .all(limit, offset);
        const getAddress = db.prepare("SELECT * FROM addresses WHERE user_id = ?");
        const usersWithAddresses = users.map((user) => ({
            ...user,
            address: getAddress.get(user.id) || null,
        }));
        res.json({
            data: usersWithAddresses,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        next(error);
    }
});
// Get user details by ID
app.get("/users/:userId", (req, res, next) => {
    try {
        const parsed = userIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ message: "Invalid user ID", errors: parsed.error.format() });
        }
        const { userId } = parsed.data;
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        next(error);
    }
});
// List posts for a user with pagination
app.get("/users/:userId/posts", (req, res, next) => {
    try {
        const paramParsed = userIdSchema.safeParse(req.params);
        const queryParsed = paginationSchema.safeParse(req.query);
        if (!paramParsed.success || !queryParsed.success) {
            return res.status(400).json({
                message: "Invalid parameters",
                errors: {
                    ...(paramParsed.error
                        ? { params: paramParsed.error.format() }
                        : {}),
                    ...(queryParsed.error ? { query: queryParsed.error.format() } : {}),
                },
            });
        }
        const { userId } = paramParsed.data;
        const { page, limit } = queryParsed.data;
        const offset = (page - 1) * limit;
        const posts = db
            .prepare("SELECT * FROM posts WHERE user_id = ? LIMIT ? OFFSET ?")
            .all(userId, limit, offset);
        const result = db
            .prepare("SELECT COUNT(*) AS count FROM posts WHERE user_id = ?")
            .get(userId);
        const total = result?.count ?? 0;
        res.json({
            data: posts,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        next(error);
    }
});
// Delete a post
app.delete("/posts/:postId", (req, res, next) => {
    try {
        const parsed = postIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ message: "Invalid post ID", errors: parsed.error.format() });
        }
        const { postId } = parsed.data;
        const result = db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
        res.json({ deleted: result.changes > 0 });
    }
    catch (error) {
        next(error);
    }
});
// *** New POST /posts endpoint with full validation & sanitization ***
app.post("/posts", (req, res, next) => {
    try {
        const parsed = createPostSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid post data",
                errors: parsed.error.format(),
            });
        }
        const { userId, title, body } = parsed.data;
        const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const now = new Date().toISOString();
        const result = db
            .prepare("INSERT INTO posts (user_id, title, body, created_at) VALUES (?, ?, ?, ?)")
            .run(userId, title, body, now);
        const newPost = db
            .prepare("SELECT * FROM posts WHERE id = ?")
            .get(result.lastInsertRowid);
        res.status(201).json(newPost);
    }
    catch (error) {
        next(error);
    }
});
// Global error handler with stacktrace in development
app.use((err, req, res, _next) => {
    console.error("Unhandled error:", err);
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({
        status,
        message,
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});
app.listen(port, () => {
    console.log(`✅ Backend running at http://localhost:${port}`);
});
