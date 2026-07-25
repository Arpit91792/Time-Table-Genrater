# Development Guide

## Project Overview
Smart College Timetable Generator is a full-stack MERN application with:
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Features**: Timetable generation, faculty management, room allocation, PDF/Excel export

## Quick Start

### 1. Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

### 2. Installation
```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd timetable-generator

# Install backend dependencies
cd server
npm install

# Install frontend dependencies  
cd ../client
npm install
```

### 3. Environment Setup

#### Backend (.env file in server/)
```env
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:5174
MONGO_URI=mongodb://localhost:27017/timetable-generator
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
```

#### Frontend (Vite config in client/)
- Proxy is already configured to http://localhost:5001
- Port is set to 5174 (will auto-increment if in use)

### 4. Running the Application

#### Start Backend Server
```bash
cd server
npm run dev  # Uses nodemon for auto-reload
```

#### Start Frontend Development Server
```bash
cd client
npm run dev  # Runs on http://localhost:5174
```

### 5. Accessing the Application
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:5001
- **API Health Check**: http://localhost:5001/health
- **Backend Interface**: http://localhost:5001/public/index.html

## API Testing

### Using curl or Postman

1. **Health Check**
```bash
curl http://localhost:5001/health
```

2. **Register User**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123", "role": "admin"}'
```

3. **Login**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'
```

## Database Structure

### Collections
1. **users** - Authentication and user management
2. **faculty** - Faculty information and availability
3. **branches** - Academic branches/departments
4. **semesters** - Academic semesters
5. **sections** - Class sections
6. **subjects** - Course subjects
7. **rooms** - Classrooms and labs
8. **timeslots** - Time slots for scheduling
9. **timetables** - Generated timetables

### Sample Data
You can use MongoDB Compass or mongosh to insert sample data:

```javascript
// Sample faculty
db.faculty.insertOne({
  facultyId: "F001",
  name: "Prof. John Smith",
  designation: "Professor",
  department: "Computer Science",
  email: "john.smith@college.edu",
  phone: "+1-555-1234",
  inTime: "09:00",
  outTime: "17:00",
  maxClassesPerDay: 4,
  maxClassesPerWeek: 20
})
```

## Features Status

### ✅ Completed
- Project structure and setup
- User authentication (JWT)
- Faculty management CRUD
- Subject management CRUD
- Branch management CRUD
- Room management CRUD
- Dashboard with charts
- Responsive UI with Tailwind CSS
- Protected routes
- Error handling middleware
- Security middleware (helmet, rate limiting)

### 🚧 In Progress
- Timetable generation algorithm
- Drag & drop interface
- PDF/Excel export
- Advanced filtering
- Real-time conflict detection

### 📋 Planned
- Faculty availability calendar
- Room booking system
- Automated conflict resolution
- Batch operations
- Email notifications
- Advanced reporting

## Development Tips

### Code Structure
```
server/
├── controllers/     # Business logic
├── models/         # MongoDB schemas
├── routes/         # API endpoints
├── middleware/     # Custom middleware
└── server.js       # Main entry point

client/
├── src/
│   ├── components/ # Reusable components
│   ├── pages/      # Page components
│   ├── redux/      # State management
│   ├── hooks/      # Custom hooks
│   └── utils/      # Utility functions
```

### Adding New Features

1. **Backend**
   - Create model in `server/models/`
   - Create controller in `server/controllers/`
   - Create routes in `server/routes/`
   - Register route in `server/server.js`

2. **Frontend**
   - Create page in `client/src/pages/`
   - Add route in `client/src/App.jsx`
   - Create components in `client/src/components/`
   - Add API calls in `client/src/redux/` or custom hooks

### Common Tasks

#### Adding a New Model
1. Create `server/models/NewModel.model.js`
2. Define schema with validation
3. Export model
4. Create controller
5. Create routes
6. Register in server.js

#### Adding a New Page
1. Create `client/src/pages/NewPage.jsx`
2. Add route in `client/src/App.jsx`
3. Create components if needed
4. Add to navigation sidebar

#### Adding API Endpoints
1. Add method to controller
2. Add route definition
3. Add validation middleware
4. Test with Postman or curl

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change port in `.env` (backend) or `vite.config.js` (frontend)
   - Kill process: `netstat -ano | findstr :PORT`

2. **MongoDB connection failed**
   - Check if MongoDB is running: `mongod`
   - Verify connection string in `.env`
   - Check firewall settings

3. **Frontend proxy not working**
   - Ensure backend is running on correct port
   - Check `vite.config.js` proxy configuration
   - Verify no CORS issues

4. **JWT authentication issues**
   - Verify JWT_SECRET in `.env`
   - Check token expiration
   - Validate token format

### Debugging
- Backend: Use `console.log()` or debugger
- Frontend: Use React DevTools and browser console
- Database: Use MongoDB Compass or mongosh
- Network: Use browser DevTools Network tab

## Testing

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

### API Testing
- Use Postman collection (to be created)
- Use curl commands
- Write integration tests

## Deployment

### Backend Deployment
1. Set up MongoDB Atlas
2. Configure environment variables
3. Build and deploy to Heroku/Render/Vercel

### Frontend Deployment
1. Build: `npm run build`
2. Deploy build folder to Netlify/Vercel

### Docker Deployment (Optional)
Dockerfile and docker-compose.yml to be added

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create pull request

## Support

For issues and questions:
1. Check existing issues
2. Create new issue with details
3. Contact maintainers

## License
MIT License - see LICENSE file for details