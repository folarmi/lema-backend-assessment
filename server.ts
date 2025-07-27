import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import Database from "better-sqlite3";

type CountResult = { count: number };

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || "4000");
const dbPath = process.env.DB_PATH || "./data/data.db";

const db = new Database(dbPath);

app.use(cors());
app.use(express.json());

const paginationSchema = z.object({
  page: z.string().optional().default("1").transform(Number),
  limit: z.string().optional().default("10").transform(Number),
});

const userIdSchema = z.object({
  userId: z.string().regex(/^\d+$/),
});

const postIdSchema = z.object({
  postId: z.string().regex(/^\d+$/),
});

// List users with pagination
app.get("/users", (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid pagination params" });

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
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid user ID" });

    const { userId } = parsed.data;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// List posts for a user
app.get(
  "/users/:userId/posts",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const paramParsed = userIdSchema.safeParse(req.params);
      const queryParsed = paginationSchema.safeParse(req.query);
      if (!paramParsed.success || !queryParsed.success) {
        return res.status(400).json({ message: "Invalid parameters" });
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
      if (!parsed.success)
        return res.status(400).json({ message: "Invalid post ID" });

      const { postId } = parsed.data;
      const result = db.prepare("DELETE FROM posts WHERE id = ?").run(postId);

      res.json({ deleted: result.changes > 0 });
    } catch (error) {
      next(error);
    }
  }
);

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
