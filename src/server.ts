import { Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import Database from "better-sqlite3";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";

type CountResult = { count: number };

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || "4000");
const dbPath = process.env.DB_PATH || "./data/data.db";
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

const db = new Database(dbPath);
app.use(helmet());
app.use(express.json());

app.use(
  cors({
    origin: ["https://lema-fullstack-app.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val.trim(), 10)),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((val) => parseInt(val.trim(), 10)),
});

const userIdSchema = z.object({
  userId: z.string().min(1),
});

const postIdSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
});

const createPostSchema = z.object({
  userId: z.string().trim().min(1, "Post ID is required"),
  title: z.string().trim().min(1, { message: "Title is required" }),
  body: z.string().trim().min(1, { message: "Body is required" }),
});

// List users with pagination
app.get("/users", (req: Request, res: Response, next: NextFunction) => {
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
      .get() as CountResult;
    const total = result?.count ?? 0;

    const users = db
      .prepare("SELECT * FROM users LIMIT ? OFFSET ?")
      .all(limit, offset);
    const getAddress = db.prepare("SELECT * FROM addresses WHERE user_id = ?");

    const usersWithAddresses = users.map((user: any) => ({
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
  } catch (error) {
    next(error);
  }
});

// Get user details by ID
app.get("/users/:userId", (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    next(error);
  }
});

// List posts for a user with pagination
app.get(
  "/users/:userId/posts",
  (req: Request, res: Response, next: NextFunction) => {
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
        .get(userId) as { count: number } | undefined;

      const total = result?.count ?? 0;

      res.json({
        data: posts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a post
app.delete(
  "/posts/:postId",
  (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      next(error);
    }
  }
);

// *** New POST /posts endpoint with full validation & sanitization ***
app.post("/posts", (req: Request, res: Response, next: NextFunction) => {
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
    const uuid = uuidv4();

    const result = db
      .prepare(
        "INSERT INTO posts (id, user_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(uuid, userId, title, body, now);

    const newPost = db.prepare("SELECT * FROM posts WHERE id = ?").get(uuid);

    res.status(201).json(newPost);
  } catch (error) {
    next(error);
  }
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
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
