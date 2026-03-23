# 📚 Novel API

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-black?style=flat-square&logo=express)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

A comprehensive REST API for a novel platform built with Node.js, Express, TypeScript, and Prisma ORM.

## ✨ Features

### Core Features
- 🔐 **JWT Authentication** - Access token & refresh token
- 👥 **Role-Based Access Control** - Admin, Author, User roles
- 📚 **Novel Management** - CRUD with cover upload
- 📖 **Chapter Management** - CRUD with auto-numbering & scheduled publishing
- 🏷️ **Genre Management** - Admin only
- 🔖 **Bookmarks** - Save favorite novels
- ⭐ **Ratings** - 1-5 rating with auto-calculated average
- 📜 **Reading History** - Auto-recorded
- 💬 **Nested Comments** - Reply to comments with threading
- ❤️ **Comment Likes** - Like/unlike comments
- 👥 **Follow System** - Follow your favorite authors

### Technical Features
- 📁 **File Upload** - Cover images with Multer
- 🔍 **Search & Filter** - Full-text search, genre filter
- 📄 **Pagination** - Cursor and offset based
- 🛡️ **Security** - Helmet, CORS, Rate limiting

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 4.x
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL / SQLite
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Zod

## 📦 Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/manggaladev/novel-api.git
cd novel-api

# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Setup database
bun run db:generate
bun run db:push

# Start development server
bun run dev
```

### Docker

```bash
docker-compose up -d
```

## 🚀 Usage

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/novels` | List novels |
| POST | `/api/novels` | Create novel (author) |
| GET | `/api/novels/:id` | Get novel details |
| GET | `/api/novels/:id/chapters` | Get novel chapters |
| POST | `/api/novels/:id/ratings` | Rate novel |

### API Documentation

Full API documentation available at `/api/docs` when running the server.

## 📁 Project Structure

```
novel-api/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # Express app
│   ├── routes/           # API routes
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middlewares/      # Express middlewares
│   ├── validators/       # Zod schemas
│   └── utils/            # Utilities
├── prisma/
│   └── schema.prisma     # Database schema
├── uploads/              # Uploaded files
├── package.json
├── tsconfig.json
└── README.md
```

## 📄 License

[MIT License](LICENSE)

