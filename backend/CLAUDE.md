# Backend Architecture Guide

This document describes the backend conventions and patterns for AI agents and developers.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via pg driver)
- **Documentation**: Swagger/OpenAPI 3.0
- **Authentication**: JWT (to be implemented)

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.ts      # App config (env vars)
│   │   ├── database.ts   # PostgreSQL connection pool
│   │   ├── swagger.ts    # Swagger/OpenAPI config
│   │   └── init.sql      # Initial DB schema
│   ├── controllers/      # Request handlers
│   ├── entities/         # Database models/entities
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # Authentication middleware
│   │   └── errorHandler.ts
│   ├── repositories/     # Data access layer
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic layer
│   ├── types/            # TypeScript types
│   ├── utils/            # Helper utilities
│   └── index.ts          # App entry point
├── docker-compose.yml    # PostgreSQL container
├── .env                  # Environment variables
└── .env.example          # Environment template
```

## API Documentation (Swagger)

Swagger UI is available at: `http://localhost:3001/api/docs`

### Adding Swagger Annotations

Every route must have JSDoc comments with Swagger annotations:

```typescript
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a paginated list of users
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users', authenticate, userController.getAll);
```

### Adding New Schemas

Add schemas in `src/config/swagger.ts` under `components.schemas`:

```typescript
schemas: {
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'email', 'name'],
  },
}
```

### Common Swagger Patterns

**POST with request body:**
```typescript
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: User created
 */
```

**Path parameters:**
```typescript
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
```

## Database Access

Use the `db` module from `config/database.ts`:

```typescript
import { db } from '../config/database';

// Simple query
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction
const user = await db.transaction(async (client) => {
  const { rows: [user] } = await client.query(
    'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
    [email, name]
  );
  await client.query(
    'INSERT INTO user_settings (user_id) VALUES ($1)',
    [user.id]
  );
  return user;
});
```

## Error Handling

Use `AppError` for operational errors:

```typescript
import { AppError } from '../utils/AppError';

// In a controller or service
if (!user) {
  throw new AppError('User not found', 404);
}
```

## Layered Architecture

1. **Routes** → Define endpoints and Swagger docs
2. **Controllers** → Handle HTTP request/response
3. **Services** → Business logic
4. **Repositories** → Database access
5. **Entities** → Data models

## Environment Variables

```bash
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5433
DB_NAME=hackathon_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret
JWT_EXPIRES_IN=1d
```

## Commands

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Build for production
npm start        # Run production build
npm run db:up    # Start PostgreSQL container
npm run db:down  # Stop PostgreSQL container
npm run db:logs  # View database logs
```

## Key Conventions

1. **Always add Swagger annotations** to routes
2. **Use transactions** for multi-step database operations
3. **Throw AppError** for known error conditions
4. **Keep controllers thin** - business logic goes in services
5. **Use parameterized queries** - never concatenate SQL strings
