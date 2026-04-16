# Quick Start Guide

## What's Already Set Up

✅ **Backend Server**
- Express.js API running on port 3001
- MySQL database connected (quantum2_db)
- JWT authentication with refresh tokens
- 40 database tables loaded and ready
- Default admin user created

✅ **Frontend Client**
- React app with Vite
- Tailwind CSS styling
- React Router navigation
- Authentication context
- Login page and layout

✅ **Database**
- Database: `quantum2_db`
- User: `quant`
- Password: `715525`
- All schema tables created
- Seed data loaded

## Starting the Application

### Option 1: Start Both at Once (Recommended)

```bash
# Install concurrently if not already installed
npm install

# Start both server and client
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend client on http://localhost:5173

### Option 2: Start Separately

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

## Accessing the Application

1. Open your browser to: http://localhost:5173

2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`

3. You should see the dashboard (currently a placeholder)

## Testing the API

The backend API is available at http://localhost:3001/api

### Test Authentication

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

You'll receive a response with access and refresh tokens:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "displayName": "System Administrator",
    "role": "ADMIN"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Test Protected Endpoint

```bash
# Use the accessToken from login response
curl http://localhost:3001/api/dashboard/metrics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Database Access

You can connect to the database directly:

```bash
mysql -h 127.0.0.1 -u quant -p715525 quantum2_db
```

Useful queries:
```sql
-- Check all tables
SHOW TABLES;

-- View users
SELECT id, username, display_name, role FROM users;

-- Check manufacturers
SELECT * FROM manufacturers;

-- View stock summary
SELECT * FROM v_stock_summary;

-- Dashboard metrics
SELECT * FROM v_dashboard_metrics;
```

## Project Structure Overview

```
new_update_attempt/
├── server/          # Backend API
│   ├── src/
│   │   ├── config/      # DB connection, constants
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Auth, validation, errors
│   │   ├── models/      # Database queries
│   │   ├── routes/      # API routes
│   │   └── utils/       # Helpers
│   └── .env         # Backend environment
├── client/          # Frontend React app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # State management
│   │   ├── lib/         # API client
│   │   └── pages/       # Route pages
│   └── .env         # Frontend environment
└── .info/           # Documentation
```

## Next Development Steps

The system has the foundation in place. Here's what to build next:

### 1. Dashboard Module
- Implement dashboard metrics endpoint
- Create widget components
- Show recent orders tables

### 2. Inventory Module
- Build device list with pagination
- Add search and filters
- Create device detail page

### 3. Goods In (Purchase Orders)
- PO creation form
- Stock receiving interface
- IMEI scanning input

### 4. Goods Out (Sales Orders)
- Order creation workflow
- Inventory selection
- Picking/shipping interface

Continue with QC, Repair, and other modules as needed.

## Troubleshooting

### Server won't start
- Check MySQL is running: `systemctl status mysql`
- Verify database connection in server/.env
- Check port 3001 is available: `lsof -i :3001`

### Client won't start
- Check port 5173 is available: `lsof -i :5173`
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Can't login
- Verify admin user exists: `node server/src/utils/seed.js`
- Check browser console for errors
- Verify API is accessible: `curl http://localhost:3001/health`

### Database connection fails
- Confirm credentials: user=quant, password=715525
- Check MySQL is listening on 127.0.0.1:3306
- Verify database exists: `mysql -h 127.0.0.1 -u quant -p715525 -e "SHOW DATABASES;"`

## Development Tips

1. **Auto-reload**: Both server (nodemon) and client (Vite) have hot reload enabled

2. **API Testing**: Use the browser DevTools Network tab or install the React Query DevTools

3. **Database Changes**: If you modify the schema, update both:
   - Database (run SQL)
   - Code (models, types, etc.)

4. **Environment Variables**: Never commit real API keys to git. Keep them in .env files

5. **Logging**: Server logs go to console. Check terminal for errors.

## Creating a New Admin User

If needed, you can create additional users directly in the database:

```sql
-- First, hash a password (use bcrypt in Node.js)
-- Then insert the user
INSERT INTO users (username, display_name, email, password_hash, role)
VALUES ('newuser', 'New User', 'user@example.com', 'HASHED_PASSWORD', 'VIEWER');
```

Or modify the seed script in `server/src/utils/seed.js`.

## Support

For questions or issues:
1. Check this guide and README.md
2. Review the code comments
3. Check the database schema in .info/
4. Review the API documentation in the prompt

---

**Happy coding!** 🚀
