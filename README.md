# 🎓 EduManage — Student Management System

Full-stack Student Management System using React, Vite, Node.js, Express, MongoDB and JWT authentication.

## Features
- Admin registration/login with JWT
- bcrypt password hashing
- Complete student CRUD
- Search by name, email or roll number
- Course filtering
- Attendance tracking
- DSA, DBMS, OS and AI marks
- Active/inactive status
- Dashboard analytics
- Responsive UI
- REST API and health endpoint
- Render-ready single service

## Architecture
React/Vite → Express REST API → Mongoose → MongoDB Atlas

Express serves the production Vite build, so the complete application can run on one Render Web Service.

## Local setup
1. Clone this repository.
2. Run npm install.
3. Configure MONGODB_URI, JWT_SECRET and PORT.
4. Run npm run build.
5. Run npm start.
6. Open http://localhost:5000.

For frontend development, run npm run dev inside frontend.

## API
POST /api/auth/register — register admin
POST /api/auth/login — login
GET /api/auth/me — current user
GET /api/students — list/search/filter students
POST /api/students — create student
GET /api/students/:id — student details
PUT /api/students/:id — update student
DELETE /api/students/:id — delete student
GET /api/dashboard — dashboard metrics
GET /api/health — health check

## Render deployment
The repository includes render.yaml.

Blueprint deployment:
1. Render → New → Blueprint.
2. Select this GitHub repository.
3. Render reads render.yaml.
4. Set MONGODB_URI to your MongoDB Atlas connection string.
5. JWT_SECRET is generated automatically.
6. Deploy.
7. Verify /api/health.

Manual Web Service:
Build Command: npm install && npm run build
Start Command: npm start
Health Check: /api/health
Runtime: Node

## MongoDB Atlas
Create a MongoDB Atlas cluster and database user, configure network access, and set the connection string as MONGODB_URI.

## Security
Never commit database credentials, JWT secrets or .env files.

## Author
Mehuli Khanra
GitHub: https://github.com/mehulikhanra904-prog
Repository: https://github.com/mehulikhanra904-prog/student-management-system
