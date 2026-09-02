const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable-generator', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected successfully');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const facultyRoutes = require('./routes/faculty.routes');
const subjectRoutes = require('./routes/subject.routes');
const branchRoutes = require('./routes/branch.routes');
const semesterRoutes = require('./routes/semester.routes');
const sectionRoutes = require('./routes/section.routes');
const roomRoutes = require('./routes/room.routes');
const timeslotRoutes = require('./routes/timeslot.routes');
const timetableRoutes = require('./routes/timetable.routes');
const teacherMappingRoutes = require('./routes/teacherMapping.routes');
const collegeTimingRoutes = require('./routes/collegeTiming.routes');
const fixedSlotRoutes = require('./routes/fixedSlot.routes');
const teacherAvailabilityRoutes = require('./routes/teacherAvailability.routes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/timeslots', timeslotRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/teacher-mapping', teacherMappingRoutes);
app.use('/api/college-timing', collegeTimingRoutes);
app.use('/api/fixed-slots', fixedSlotRoutes);
app.use('/api/teacher-availability', teacherAvailabilityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Timetable Generator API is running',
    version: '1.0.0',
    features: [
      'College Timing Management',
      'Subject Management',
      'Faculty Management',
      'Teacher Mapping',
      'Timetable Generation',
      'Excel Import/Export',
      'PDF Export'
    ],
    timestamp: new Date().toISOString()
  });
});

// College Timing APIs are now handled by collegeTimingRoutes
// See routes/collegeTiming.routes.js for complete CRUD operations

// Subject Management APIs are now handled by the subjectRoutes
// See routes/subject.routes.js for complete CRUD operations

// Faculty Management APIs are now handled by the facultyRoutes
// See routes/faculty.routes.js for complete CRUD operations

// Teacher Mapping APIs are now handled by the teacherMappingRoutes
// See routes/teacherMapping.routes.js for complete CRUD operations

// Timetable Generation API is now handled by timetableRoutes
// See routes/timetable.routes.js for complete CRUD operations

// Export APIs
app.post('/api/export/pdf', (req, res) => {
  const { timetableId } = req.body;
  res.status(200).json({
    success: true,
    message: 'PDF export initiated',
    data: {
      url: `/api/exports/timetable-${timetableId}.pdf`,
      timestamp: new Date().toISOString()
    }
  });
});

app.post('/api/export/excel', (req, res) => {
  const { timetableId } = req.body;
  res.status(200).json({
    success: true,
    message: 'Excel export initiated',
    data: {
      url: `/api/exports/timetable-${timetableId}.xlsx`,
      timestamp: new Date().toISOString()
    }
  });
});

// Import APIs
app.post('/api/import/excel', (req, res) => {
  const { fileData, importType } = req.body; // importType: 'subjects', 'faculty', 'mappings'
  res.status(200).json({
    success: true,
    message: `Excel file imported successfully for ${importType}`,
    data: {
      importedCount: 10,
      importType: importType,
      timestamp: new Date().toISOString()
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;