const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const db = new Database("./data/data.db");
const port = 4000;

app.use(cors());
app.use(express.json());

// List users with pagination
app.get("/users", (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const offset = (page - 1) * limit;

  const users = db
    .prepare("SELECT * FROM users LIMIT ? OFFSET ?")
    .all(limit, offset);
  res.json(users);
});

// Get user details by ID
app.get("/users/:userId", (req, res) => {
  const userId = req.params.userId;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
});

// List posts for a user
app.get("/users/:userId/posts", (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 4);
  const offset = (page - 1) * limit;

  const posts = db
    .prepare("SELECT * FROM posts WHERE user_id = ? LIMIT ? OFFSET ?")
    .all(req.params.userId, limit, offset);
  res.json(posts);
});

// Delete a post
app.delete("/posts/:postId", (req, res) => {
  const postId = req.params.postId;
  const result = db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
  res.json({ deleted: result.changes > 0 });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
