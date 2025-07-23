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

  // Get total number of users
  const total = db.prepare("SELECT COUNT(*) as count FROM users").get().count;

  // Get users for this page
  const users = db
    .prepare("SELECT * FROM users LIMIT ? OFFSET ?")
    .all(limit, offset);

  // Prepare address lookup query
  const getAddress = db.prepare("SELECT * FROM addresses WHERE user_id = ?");

  // Combine user with address
  const usersWithAddresses = users.map((user) => ({
    ...user,
    address: getAddress.get(user.id) || null,
  }));

  // Send both data and total count
  res.json({
    data: usersWithAddresses,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
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
  const userId = req.params.userId;

  // Get paginated posts
  const posts = db
    .prepare("SELECT * FROM posts WHERE user_id = ? LIMIT ? OFFSET ?")
    .all(userId, limit, offset);

  // Get total count of posts for this user
  const total = db
    .prepare("SELECT COUNT(*) AS count FROM posts WHERE user_id = ?")
    .get(userId).count;

  const totalPages = Math.ceil(total / limit);

  res.json({
    data: posts,
    total,
    page,
    limit,
    totalPages,
  });
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
