# 📚 Novel API

A comprehensive REST API for a novel platform built with Node.js, Express, TypeScript, and PostgreSQL with Prisma ORM.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4.x-black?style=flat-square&logo=express)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat-square&logo=postgresql)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black?style=flat-square&logo=socketdotio)

## ✨ Features

### Core Features
- 🔐 **JWT Authentication** - Access token & refresh token
- 👥 **Role-Based Access Control** - Admin, Author, User roles
- 📚 **Novel Management** - CRUD with cover upload
- 📖 **Chapter Management** - CRUD with auto-numbering & scheduled publishing
- 🏷️ **Genre Management** - Admin only

### User Interactions
- 🔖 **Bookmarks** - Save favorite novels
- 💬 **Comments** - Nested comments with replies
- ❤️ **Comment Likes** - Like/unlike comments
- ⭐ **Ratings** - 1-5 rating with auto-calculated average
- 📜 **Reading History** - Auto-recorded when logged in
- 👥 **Follow System** - Follow your favorite authors
- 📋 **Reading Lists** - Create custom reading collections
- 📊 **Reading Progress** - Track reading position across novels

### Discovery & Recommendations
- 📈 **Trending Novels** - Based on views, ratings, and recent activity
- 🎯 **Personalized Recommendations** - Based on reading history and preferences
- 🔗 **Similar Novels** - Find novels with matching genres/authors

### Content Management
- 📅 **Scheduled Publishing** - Schedule chapters for future release
- 🚨 **Report System** - Report inappropriate content
- 🔍 **Content Moderation** - Admin tools for managing reports

### Real-time Features
- 🔔 **WebSocket Notifications** - Real-time updates
- 📡 **Live Activity Feed** - Stay updated

### Admin Features
- 📊 **Dashboard Statistics** - Platform overview
- 👤 **User Management** - Role management
- 📝 **Content Moderation** - Manage all content
- 📋 **Report Management** - Review and resolve reports

### Technical Features
- 📄 **Pagination, Sorting, Filtering**
- 📖 **Swagger Documentation**
- 🔒 **Rate Limiting**
- 📝 **Request Logging**

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ / Bun |
| Framework | Express.js |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |
| Real-time | Socket.io |
| Logging | Morgan |
| Docs | Swagger/OpenAPI |

## 🚀 Installation

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL 15+
- Redis (optional, for caching)

### Setup

1. Clone repository
```bash
git clone https://github.com/manggaladev/novel-api.git
cd novel-api
```

2. Install dependencies
```bash
bun install
# or
npm install
```

3. Setup environment variables
```bash
cp .env.example .env
# Edit .env according to your database configuration
```

4. Setup database
```bash
bun run db:push
# or for development with migration
bun run db:migrate
```

5. (Optional) Seed initial data
```bash
bun run db:seed
```

6. Start server
```bash
bun run dev
```

Server runs at `http://localhost:3000`

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| POST | `/api/auth/refresh` | Refresh token | ❌ |
| POST | `/api/auth/logout` | Logout | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |

### Novels
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/novels` | List novels (pagination, filter, search) | ❌ |
| GET | `/api/novels/trending` | Trending novels | ❌ |
| GET | `/api/novels/popular` | Popular novels | ❌ |
| GET | `/api/novels/latest` | Latest novels | ❌ |
| GET | `/api/novels/:id` | Get novel by ID | ❌ |
| GET | `/api/novels/:id/similar` | Get similar novels | ❌ |
| GET | `/api/novels/slug/:slug` | Get novel by slug | ❌ |
| POST | `/api/novels` | Create novel | ✅ |
| PUT | `/api/novels/:id` | Update novel | ✅ (Owner/Admin) |
| DELETE | `/api/novels/:id` | Delete novel | ✅ (Owner/Admin) |

### Chapters
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/chapters/scheduled` | Get scheduled chapters | ✅ (Author/Admin) |
| GET | `/api/chapters/novel/:novelId` | List chapters | ❌ |
| GET | `/api/chapters/:id` | Get chapter with content | ❌ |
| POST | `/api/chapters/novel/:novelId` | Create chapter | ✅ (Owner/Admin) |
| PUT | `/api/chapters/:id` | Update chapter | ✅ (Owner/Admin) |
| DELETE | `/api/chapters/:id` | Delete chapter | ✅ (Owner/Admin) |

### Genres
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/genres` | List genres | ❌ |
| GET | `/api/genres/:id` | Get genre | ❌ |
| POST | `/api/genres` | Create genre | ✅ Admin |
| PUT | `/api/genres/:id` | Update genre | ✅ Admin |
| DELETE | `/api/genres/:id` | Delete genre | ✅ Admin |

### Bookmarks
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/bookmarks` | User's bookmarks | ✅ |
| POST | `/api/bookmarks/:novelId` | Add bookmark | ✅ |
| DELETE | `/api/bookmarks/:novelId` | Remove bookmark | ✅ |

### Comments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/comments/chapter/:chapterId` | Chapter comments (nested) | ❌ |
| GET | `/api/comments/:id/replies` | Get replies | ❌ |
| GET | `/api/comments/my` | User's comments | ✅ |
| POST | `/api/comments/chapter/:chapterId` | Add comment | ✅ |
| PUT | `/api/comments/:id` | Update comment | ✅ (Owner) |
| DELETE | `/api/comments/:id` | Delete comment | ✅ (Owner/Admin) |

### Comment Likes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/comments/:id/like` | Like comment | ✅ |
| DELETE | `/api/comments/:id/like` | Unlike comment | ✅ |

### Ratings
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/ratings/:novelId` | Novel ratings & stats | ❌ |
| GET | `/api/ratings/:novelId/me` | User's rating | ✅ |
| POST | `/api/ratings/:novelId` | Rate novel | ✅ |
| DELETE | `/api/ratings/:novelId` | Remove rating | ✅ |

### Reading History
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/history` | User's reading history | ✅ |
| DELETE | `/api/history` | Clear all history | ✅ |
| DELETE | `/api/history/:id` | Delete history entry | ✅ |

### Follows
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/follows/:userId` | Follow user | ✅ |
| DELETE | `/api/follows/:userId` | Unfollow user | ✅ |
| GET | `/api/follows/followers/:userId` | Get followers | ❌ |
| GET | `/api/follows/following/:userId` | Get following | ❌ |
| GET | `/api/follows/status/:userId` | Check follow status | Optional |

### Reading Lists
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/reading-lists` | My reading lists | ✅ |
| GET | `/api/reading-lists/:id` | Get list | ❌ (public) |
| POST | `/api/reading-lists` | Create list | ✅ |
| PUT | `/api/reading-lists/:id` | Update list | ✅ (Owner) |
| DELETE | `/api/reading-lists/:id` | Delete list | ✅ (Owner) |
| POST | `/api/reading-lists/:id/novels/:novelId` | Add novel to list | ✅ |
| DELETE | `/api/reading-lists/:id/novels/:novelId` | Remove novel | ✅ |

### Notifications
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get notifications | ✅ |
| PUT | `/api/notifications/:id/read` | Mark as read | ✅ |
| PUT | `/api/notifications/read-all` | Mark all as read | ✅ |
| DELETE | `/api/notifications/:id` | Delete notification | ✅ |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/stats` | Dashboard statistics | ✅ Admin |
| GET | `/api/admin/users` | List all users | ✅ Admin |
| PUT | `/api/admin/users/:id/role` | Update user role | ✅ Admin |
| GET | `/api/admin/novels` | List all novels | ✅ Admin |
| GET | `/api/admin/activity` | Admin activity log | ✅ Admin |

### Reading Progress
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/progress/recent` | Get recently read novels | ✅ |
| GET | `/api/progress/:novelId` | Get reading progress for novel | ✅ |
| PUT | `/api/progress/:novelId/:chapterId` | Update reading progress | ✅ |

### Recommendations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/recommendations` | Get personalized recommendations | ✅ |

### Reports
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/reports` | Report content | ✅ |
| GET | `/api/reports` | Get all reports | ✅ Admin |
| GET | `/api/reports/:id` | Get report details | ✅ Admin |
| PUT | `/api/reports/:id/resolve` | Resolve report | ✅ Admin |

## 🔌 WebSocket Events

Connect to the WebSocket server at `/socket.io/`

### Authentication
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-access-token' }
});

socket.on('authenticated', () => {
  console.log('Connected to WebSocket');
});

socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `authenticate` | Client → Server | Send token for auth |
| `authenticated` | Server → Client | Auth confirmed |
| `notification` | Server → Client | New notification |

## 📖 Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### Sorting
- `sort` - Field to sort by
- `order` - `asc` or `desc`

### Filtering Novels
- `status` - ONGOING, COMPLETED, HIATUS
- `genre` - Genre slug
- `search` - Search in title/author

## 🔐 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/novel_api?schema=public"

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

## 📁 Project Structure

```
novel-api/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
├── src/
│   ├── config/            # Configuration files
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   ├── validation/        # Zod schemas
│   ├── app.ts             # Express app
│   └── index.ts           # Entry point
├── uploads/               # Uploaded files
├── package.json
├── tsconfig.json
└── README.md
```

## 👤 Roles & Permissions

| Role | Permissions |
|------|-------------|
| **ADMIN** | All operations, user management, all novels |
| **AUTHOR** | Create novels, manage own novels & chapters |
| **USER** | Read novels, add bookmarks, comments, ratings |

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run db:push` | Push schema to database |
| `bun run db:migrate` | Run migrations |
| `bun run db:studio` | Open Prisma Studio |
| `bun run db:seed` | Seed database |
| `bun run lint` | Lint code |

## 📄 License

MIT License - see [LICENSE](LICENSE) file.


