<!-- # Node.js + Express + TypeScript + SQLite Backend

This is a simple backend server for handling blog posts and users, built with Express, TypeScript, and SQLite using `better-sqlite3`.

## 🚀 Features

- REST API (CRUD for Posts and Users)
- SQLite database (embedded, no external setup)
- Zod-based input validation
- CORS protection with environment-based origin config
- Secure headers with Helmet
- Custom error handler
- Timestamps for post creation (`created_at` field)

## 🔧 Setup Instructions

1. **Clone the repository and navigate into the backend folder:**

```bash
git clone https://github.com/folarmi/lema-backend-assessment.git
cd lema-backend-assessment
```'' -->

Social Media Backend API
This project is a Node.js backend API built with Express.js and SQLite for managing users and posts in a social media application. It includes features like user management, post creation, deletion, and pagination, with security features and input validation.
Table of Contents

Features
Tech Stack
Prerequisites
Installation
Configuration
Database Setup
Running the Application
API Endpoints
Error Handling
Contributing
License

Features

User Management: Retrieve user details and list users with pagination.
Post Management: Create, delete, and list posts for specific users with pagination.
Security: Implements CORS, Helmet for HTTP headers, and input validation/sanitization using Zod.
Error Handling: Centralized error handling with detailed responses, including stack traces in development mode.
Environment Configuration: Uses dotenv for environment variable management.

Tech Stack

Node.js: Runtime environment.
Express.js: Web framework for building the API.
SQLite: Lightweight database using better-sqlite3.
Zod: Schema validation and sanitization.
Helmet: Security middleware for HTTP headers.
CORS: Configurable Cross-Origin Resource Sharing.
dotenv: Environment variable management.

Prerequisites

Node.js: Version 16 or higher.
npm: Node package manager (comes with Node.js).
SQLite: Ensure SQLite is installed or use the better-sqlite3 package which includes it.

Installation

Clone the repository:git clone <repository-url>
cd <repository-directory>

Install dependencies:npm install

Configuration
Create a .env file in the project root with the following variables:
PORT=4000
DB_PATH=./data/data.db
ALLOWED_ORIGINS=http://localhost:3000,http://example.com
NODE_ENV=development

PORT: The port the server will run on (default: 4000).
DB_PATH: Path to the SQLite database file.
ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins.
NODE_ENV: Set to development for detailed error stack traces or production for minimal error output.

Database Setup
The project uses SQLite as the database. Ensure the database file specified in DB_PATH exists and has the following schema:
CREATE TABLE users (
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
email TEXT NOT NULL UNIQUE
);

CREATE TABLE addresses (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
street TEXT,
city TEXT,
country TEXT,
FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE posts (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
title TEXT NOT NULL,
body TEXT NOT NULL,
created_at TEXT NOT NULL,
FOREIGN KEY (user_id) REFERENCES users(id)
);

You can initialize the database by running a script or manually creating the tables using an SQLite client.
Running the Application

Start the server:npm start

The server will run at http://localhost:4000 (or the port specified in .env).
Use a tool like Postman or cURL to test the API endpoints.

API Endpoints
Users

GET /users

Description: Retrieve a paginated list of users with their addresses.
Query Parameters:
page (optional, default: 1): Page number.
limit (optional, default: 10): Number of users per page.

Response:{
"data": [{ "id": "1", "name": "John Doe", "email": "john@example.com", "address": {...} }, ...],
"total": 50,
"page": 1,
"limit": 10,
"totalPages": 5
}

GET /users/:userId

Description: Retrieve details of a specific user by ID.
Parameters:
userId: The ID of the user.

Response:{ "id": "1", "name": "John Doe", "email": "john@example.com" }

GET /users/:userId/posts

Description: Retrieve a paginated list of posts for a specific user.
Parameters:
userId: The ID of the user.

Query Parameters:
page (optional, default: 1): Page number.
limit (optional, default: 10): Number of posts per page.

Response:{
"data": [{ "id": "1", "user_id": "1", "title": "Post Title", "body": "Post Body", "created_at": "2025-07-27T15:49:00Z" }, ...],
"total": 20,
"page": 1,
"limit": 10,
"totalPages": 2
}

Posts

POST /posts

Description: Create a new post for a user.
Body:{
"userId": "1",
"title": "New Post",
"body": "This is the post content"
}

Response (201 Created):{ "id": "123", "user_id": "1", "title": "New Post", "body": "This is the post content", "created_at": "2025-07-27T15:49:00Z" }

DELETE /posts/:postId

Description: Delete a post by ID.
Parameters:
postId: The ID of the post to delete.

Response:{ "deleted": true }

Error Handling
The API includes a global error handler that returns structured error responses:
{
"status": 500,
"message": "Internal Server Error",
"method": "GET",
"path": "/users",
"timestamp": "2025-07-27T15:49:00Z",
"stack": "Error: ... (only in development mode)"
}

Validation Errors: Returns 400 status with detailed error messages from Zod.
Not Found: Returns 404 for missing users or posts.
CORS Errors: Returns 403 for unauthorized origins.

Contributing

Fork the repository.
Create a new branch (git checkout -b feature/your-feature).
Commit your changes (git commit -m 'Add your feature').
Push to the branch (git push origin feature/your-feature).
Open a Pull Request.

License
This project is licensed under the MIT License.
