# Smart College Timetable Generator

A professional college ERP timetable system with intelligent scheduling and Excel-like interfaces.

## 🎯 Features

### **Multi-Step Timetable Wizard**
1. **College Timing** - Set working hours, lecture durations, breaks
2. **Subject Details** - Excel-like spreadsheet for subject management
3. **Faculty Details** - Faculty information and availability
4. **Teacher Mapping** - Map faculty to subjects with teaching loads
5. **Generate Timetable** - Intelligent conflict-free scheduling

### **Intelligent Scheduling Algorithm**
- Constraint-based scheduling engine
- Prevents faculty, room, and section clashes
- Honors faculty availability and load limits
- Distributes lectures evenly across days
- Supports theory (50 min) and practical (100 min) sessions

### **Excel-Like Interfaces**
- Copy-paste from Excel
- Import/Export Excel files
- Search, filter, and sort
- Undo/Redo operations
- Keyboard navigation
- Resizable columns

### **Bulk Operations**
- **NEW: Bulk section creation (A to Z)**
- Import/Export Excel templates
- Batch subject management
- Multi-faculty assignment

### **Multiple Views & Exports**
- Section-wise timetable view
- Faculty-wise timetable view
- Classroom-wise usage view
- Lab-wise practical schedule
- Export to PDF, Excel, CSV
- Print and download options

## 🏗️ Architecture

### **Frontend (React + Vite + Tailwind CSS)**
- Modern, responsive dashboard
- Multi-step wizard interface
- Excel-like spreadsheet components
- Real-time validation and feedback

### **Backend (Node.js + Express)**
- RESTful API for all operations
- Excel file processing (xlsx)
- Timetable generation engine
- PDF and Excel export functionality

### **Database (Mock Data - Expandable to MongoDB)**
- College settings and timing
- Subjects and course details
- Faculty information
- Teacher mappings
- Generated timetables

## 🚀 Quick Start

### **1. Start Backend Server**
```bash
cd server
npm install
npm run dev
```
Backend runs on: `http://localhost:5002`

### **2. Start Frontend Server**
```bash
cd client
npm install
npm run dev
```
Frontend runs on: `http://localhost:5174`

### **3. Access the Application**
- Dashboard: `http://localhost:5174/dashboard`
- API Health: `http://localhost:5002/api/health`
- API Docs: `http://localhost:5002/public/index.html`

## 📋 API Endpoints

### **College Timing**
- `POST /api/college-timing` - Save college timing settings
- `GET /api/college-timing` - Get current timing settings

### **Section Management**
- `POST /api/sections` - Create single section
- `POST /api/sections/bulk` - **NEW: Create bulk sections (A to Z)**
- `GET /api/sections` - Get all sections
- `PUT /api/sections/:id` - Update section
- `DELETE /api/sections/:id` - Delete section

#### **Bulk Section Creation Examples:**

**Method 1: Create sections from letter range (A to Z)**
```json
POST /api/sections/bulk
{
  "semester": "65a1b2c3d4e5f6a7b8c9d0e1",
  "branch": "65a1b2c3d4e5f6a7b8c9d0e2",
  "startLetter": "A",
  "endLetter": "Z",
  "capacity": 60
}
```

**Method 2: Create from custom sections array**
```json
POST /api/sections/bulk
{
  "semester": "65a1b2c3d4e5f6a7b8c9d0e1",
  "branch": "65a1b2c3d4e5f6a7b8c9d0e2",
  "sections": [
    {"sectionName": "A", "capacity": 60, "classTeacher": "65a1b2c3d4e5f6a7b8c9d0e3"},
    {"sectionName": "B", "capacity": 55, "classTeacher": "65a1b2c3d4e5f6a7b8c9d0e4"},
    {"sectionName": "C", "capacity": 50}
  ]
}
```

### **Subject Management**
- `POST /api/subjects` - Save subjects
- `GET /api/subjects` - Get all subjects

### **Faculty Management**
- `POST /api/faculty` - Save faculty
- `GET /api/faculty` - Get all faculty

### **Teacher Mapping**
- `POST /api/teacher-mapping` - Save teacher mappings
- `GET /api/teacher-mapping` - Get all mappings

### **Timetable Generation**
- `POST /api/timetable/generate` - Generate timetable

### **Export/Import**
- `POST /api/export/pdf` - Export to PDF
- `POST /api/export/excel` - Export to Excel
- `POST /api/import/excel` - Import from Excel

## 🔧 Development

### **Frontend Structure**
```
client/
├── src/
│   ├── components/
│   │   ├── common/          # Shared components
│   │   └── layout/          # Layout components
│   ├── pages/
│   │   └── Dashboard.jsx    # Main dashboard
│   ├── App.jsx              # Routing
│   └── main.jsx             # Entry point
├── public/
└── package.json
```

### **Backend Structure**
```
server/
├── server.js                # Main server with all APIs
├── public/                  # Static files
└── package.json             # Dependencies
```

## 🎨 UI Design
- Modern professional interface
- Blue + White theme
- Rounded cards and soft shadows
- Glassmorphism effects
- Fully responsive (Desktop, Tablet, Mobile)

## 📊 Key Algorithms

### **Timetable Generation Rules**
1. No faculty can teach two classes simultaneously
2. No classroom can contain two classes simultaneously
3. One section cannot have two lectures simultaneously
4. Faculty daily/weekly load limits are respected
5. Lunch breaks remain empty
6. Theory = 50 minutes, Practical = 100 minutes
7. Practical sessions occupy two consecutive slots
8. Subjects distributed evenly across the week

### **Priority System**
- Avoid faculty clashes (highest priority)
- Respect faculty availability times
- Balance faculty workload
- Minimize free periods
- Distribute subjects across days

## 🔄 Excel Integration

### **Supported Features**
- Import subjects/faculty from Excel
- Export timetables to Excel
- Copy-paste from Excel
- Excel-style keyboard shortcuts
- Bulk operations

### **Excel Templates**
- Subjects template with required columns
- Faculty template with availability data
- Teacher mapping template

## 📱 Responsive Design
- Desktop: Full-featured interface
- Tablet: Optimized touch interface
- Mobile: Simplified navigation

## 🔮 Future Enhancements
1. Real MongoDB database integration
2. Advanced scheduling algorithms
3. Email notifications
4. Room booking system
5. Batch operations
6. Advanced reporting
7. User authentication
8. Role-based access control

## 📝 License
MIT License - See LICENSE file for details

---

**Note**: This is a professional-grade timetable system designed for college administration. The system automatically handles complex scheduling constraints and provides multiple export options for easy distribution.