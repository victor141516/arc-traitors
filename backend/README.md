# Arc Riders Backend API

Backend server for the Arc Riders voting system with admin dashboard.

## Environment Variables

Before running the server, you must configure the required environment variables. The application uses Zod for validation to ensure all environment variables meet security requirements.

### Required Variables

- **`ADMIN_PASSWORD`**: Admin authentication password
  - Minimum 8 characters
  - Must include at least one uppercase letter
  - Must include at least one lowercase letter
  - Must include at least one number
  - Must include at least one special character (@$!%\*?&)

### Optional Variables

- **`CORS_ORIGINS`**: Comma-separated list of allowed CORS origins (default: `http://localhost:5173,http://localhost:5174`)
- **`PORT`**: Server port number (default: `33000`)
- **`NODE_ENV`**: Environment mode - `development`, `production`, or `test` (default: `production`)

### Example Configuration

Create a `.env` file in the backend directory:

```env
ADMIN_PASSWORD=MySecure123!
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,https://yourdomain.com
PORT=33000
NODE_ENV=development
```

## Installation

To install dependencies:

```bash
bun install
```

## Running the Server

To run in development:

```bash
bun run index.ts
```

The server will validate all environment variables on startup and display helpful error messages if any are invalid or missing.

## API Endpoints

- `POST /api/vote` - Submit a vote for a player
- `GET /api/leaderboard` - Get top 20 players with most votes
- `GET /api/recent` - Get recent reports
- `GET /api/player/:playerName` - Get player details
- `GET /api/search` - Search players by name
- `GET /health` - Health check endpoint

### Admin Endpoints

- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/reports` - Get all reports (requires admin auth)
- `DELETE /api/admin/reports/:id` - Delete a report (requires admin auth)
- `DELETE /api/admin/player/:playerName` - Delete all reports for a player (requires admin auth)
- `GET /api/admin/bans` - Get active bans (requires admin auth)
- `DELETE /api/admin/bans/:ip` - Revoke a ban (requires admin auth)

## Security Features

- Environment variable validation with Zod
- Strong password requirements for admin authentication
- Rate limiting (1 request per 30 seconds)
- Automatic IP banning for excessive requests
- CORS protection
- Input validation and sanitization

This project was created using `bun init` in bun v1.2.14. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
