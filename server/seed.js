/**
 * CSE Demo Data Seed Script — Full rebuild
 * Sections A–F, Semester 3 & 5 (Odd), with rules from timetable image:
 *
 *  RULES EXTRACTED FROM IMAGE:
 *  ─────────────────────────────────────────────────────────────────
 *  1.  Working days  : Monday – Saturday (6 days)
 *  2.  Periods/day   : 9 × 50-min periods  (09:00 – 16:30)
 *                      with a 10-min tea break 11:30–11:40
 *                      and a  50-min lunch    13:20–14:10
 *  3.  Lab practical : TWO consecutive 50-min slots = 100 min total
 *                      B1 & B2 batches run SIMULTANEOUSLY (different subjects, same time)
 *                      Max ONE lab session per section per day
 *  4.  Theory spread : At most ONE lecture per subject per day (Pass-A spread)
 *  5.  TRP (Transport): Fixed – Saturday last period, locked for all sections
 *  6.  SAC ACTIVITY  : Fixed – Saturday last slot, college-scope activity
 *  7.  Placement     : Fixed – Thursday 15:00-16:40
 *  8.  Sports        : Fixed – Wednesday 15:00-15:50
 *  9.  Library       : Fixed – Friday 14:10-15:00
 *  10. Mentoring     : Fixed – Monday 16:00-16:50
 *  11. Faculty codes in image (abbreviation → full name mapping preserved)
 *  12. Subjects match image: SE, OS, COA, ADA, M-III, PROG PR, IPHE,
 *                            DSA, DE, OOP, CO, EE for Sem 3
 *                            OS, CN, DBMS, TOC, SE, IPHE for Sem 5
 *  ─────────────────────────────────────────────────────────────────
 *
 *  Run: node server/seed.js
 */

'use strict';
require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

// ── Models ──────────────────────────────────────────────────────────────────
const User = require('./models/User.model');
const Branch = require('./models/Branch.model');
const Semester = require('./models/Semester.model');
const Section = require('./models/Section.model');
const Room = require('./models/Room.model');
const Faculty = require('./models/Faculty.model');
const Subject = require('./models/Subject.model');
const TeacherMapping = require('./models/TeacherMapping.model');
const CollegeTiming = require('./models/CollegeTiming.model');
const TimeSlot = require('./models/TimeSlot.model');
const FixedSlot = require('./models/FixedSlot.model');

// ── Constants ────────────────────────────────────────────────────────────────
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ACADEMIC_YEAR = '2026-2027';
const TARGET_SEMS = [3, 5]; // odd semester active sections

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════
async function clearAll() {
      console.log('🗑️  Clearing existing data...');
      await Promise.all([
            User.deleteMany({}),
            Branch.deleteMany({}),
            Semester.deleteMany({}),
            Section.deleteMany({}),
            Room.deleteMany({}),
            Faculty.deleteMany({}),
            Subject.deleteMany({}),
            TeacherMapping.deleteMany({}),
            CollegeTiming.deleteMany({}),
            TimeSlot.deleteMany({}),
            FixedSlot.deleteMany({}),
      ]);
      console.log('✅  All collections cleared');
}

// ════════════════════════════════════════════════════════════════════════════
//  1. ADMIN USER
// ════════════════════════════════════════════════════════════════════════════
async function seedUsers() {
      console.log('\n👤 Seeding users...');
      await User.create({
            email: 'admin@college.edu',
            password: 'Admin@123',
            role: 'admin',
      });
      console.log('   ✅  admin@college.edu  /  Admin@123');
}

// ════════════════════════════════════════════════════════════════════════════
//  2. COLLEGE TIMING
//     • Mon–Sat, 09:00–16:30
//     • Lecture = 50 min
//     • Tea break 11:30–11:40  (10 min, handled by slot list)
//     • Lunch    13:20–14:10  (50 min)
// ════════════════════════════════════════════════════════════════════════════
async function seedCollegeTiming() {
      console.log('\n⏰ Seeding college timing...');
      const ct = await CollegeTiming.create({
            collegeName: 'Demo Engineering College',
            academicYear: ACADEMIC_YEAR,
            semesterType: 'odd',
            session: 'Regular',
            workingDays: {
                  monday: true, tuesday: true, wednesday: true,
                  thursday: true, friday: true, saturday: true, sunday: false,
            },
            startTime: '09:00',
            endTime: '16:30',
            lectureDuration: 50,
            practicalDuration: 100,
            lunchBreak: { enabled: true, startTime: '13:20', endTime: '14:10' },
            teaBreak: { enabled: true, startTime: '11:30', endTime: '11:40' },
            isActive: true,
      });
      console.log('   ✅  College timing created (Mon–Sat, 09:00–16:30, 50-min periods)');
      return ct;
}

// ════════════════════════════════════════════════════════════════════════════
//  3. TIME SLOTS
//     9 lecture periods + breaks
//     Period 1-3 : 09:00–11:30
//     Tea break  : 11:30–11:40
//     Period 4-5 : 11:40–13:20
//     Lunch      : 13:20–14:10
//     Period 6-9 : 14:10–16:30
// ════════════════════════════════════════════════════════════════════════════
async function seedTimeSlots() {
      console.log('\n🕐 Seeding time slots...');
      const slots = [
            // Morning session
            { slotName: 'P1', startTime: '09:00', endTime: '09:50', duration: 50, slotType: 'Lecture' },
            { slotName: 'P2', startTime: '09:50', endTime: '10:40', duration: 50, slotType: 'Lecture' },
            { slotName: 'P3', startTime: '10:40', endTime: '11:30', duration: 50, slotType: 'Lecture' },
            { slotName: 'Tea Break', startTime: '11:30', endTime: '11:40', duration: 30, slotType: 'Break' },
            { slotName: 'P4', startTime: '11:40', endTime: '12:30', duration: 50, slotType: 'Lecture' },
            { slotName: 'P5', startTime: '12:30', endTime: '13:20', duration: 50, slotType: 'Lecture' },
            { slotName: 'Lunch', startTime: '13:20', endTime: '14:10', duration: 50, slotType: 'Lunch' },
            // Afternoon session
            { slotName: 'P6', startTime: '14:10', endTime: '15:00', duration: 50, slotType: 'Lecture' },
            { slotName: 'P7', startTime: '15:00', endTime: '15:50', duration: 50, slotType: 'Lecture' },
            { slotName: 'P8', startTime: '15:50', endTime: '16:30', duration: 40, slotType: 'Lecture' },
            // Lab double-slots (consecutive pairs used by scheduler)
            { slotName: 'Lab-D1 AM', startTime: '09:00', endTime: '10:40', duration: 100, slotType: 'Lab' },
            { slotName: 'Lab-D2 AM', startTime: '10:40', endTime: '12:20', duration: 100, slotType: 'Lab' },
            { slotName: 'Lab-D1 PM', startTime: '14:10', endTime: '15:50', duration: 100, slotType: 'Lab' },
            { slotName: 'Lab-D2 PM', startTime: '15:50', endTime: '17:30', duration: 100, slotType: 'Lab' },
      ];
      const created = await TimeSlot.insertMany(slots);
      console.log(`   ✅  ${created.length} time slots created (9 lecture + 2 breaks + 4 lab-pairs)`);
      return created;
}

// ════════════════════════════════════════════════════════════════════════════
//  4. ROOMS
// ════════════════════════════════════════════════════════════════════════════
async function seedRooms() {
      console.log('\n🏫 Seeding rooms...');
      const rooms = [
            // Classrooms (6 for 6 sections)
            { roomNumber: 'CR-101', capacity: 70, roomType: 'Classroom', floor: 1, building: 'Main Block', hasProjector: true },
            { roomNumber: 'CR-102', capacity: 70, roomType: 'Classroom', floor: 1, building: 'Main Block', hasProjector: true },
            { roomNumber: 'CR-103', capacity: 70, roomType: 'Classroom', floor: 1, building: 'Main Block', hasProjector: true },
            { roomNumber: 'CR-201', capacity: 70, roomType: 'Classroom', floor: 2, building: 'Main Block', hasProjector: true },
            { roomNumber: 'CR-202', capacity: 70, roomType: 'Classroom', floor: 2, building: 'Main Block', hasProjector: true },
            { roomNumber: 'CR-203', capacity: 70, roomType: 'Classroom', floor: 2, building: 'Main Block', hasProjector: true },
            { roomNumber: 'CR-301', capacity: 70, roomType: 'Classroom', floor: 3, building: 'Main Block', hasProjector: true },
            { roomNumber: 'CR-302', capacity: 70, roomType: 'Classroom', floor: 3, building: 'Main Block', hasProjector: true },
            // Computer Labs
            { roomNumber: 'LAB-CS1', capacity: 40, roomType: 'Lab', floor: 1, building: 'CS Block', hasProjector: true, hasSmartBoard: true },
            { roomNumber: 'LAB-CS2', capacity: 40, roomType: 'Lab', floor: 1, building: 'CS Block', hasProjector: true, hasSmartBoard: true },
            { roomNumber: 'LAB-CS3', capacity: 40, roomType: 'Lab', floor: 2, building: 'CS Block', hasProjector: true },
            { roomNumber: 'LAB-CS4', capacity: 40, roomType: 'Lab', floor: 2, building: 'CS Block', hasProjector: true },
            { roomNumber: 'LAB-NET', capacity: 40, roomType: 'Lab', floor: 2, building: 'CS Block', hasProjector: true },
            { roomNumber: 'LAB-DS', capacity: 40, roomType: 'Lab', floor: 3, building: 'CS Block', hasProjector: true },
            // Seminar & Auditorium
            { roomNumber: 'SH-001', capacity: 120, roomType: 'Seminar Hall', floor: 0, building: 'Main Block', hasProjector: true, hasAC: true },
            { roomNumber: 'AUD-001', capacity: 300, roomType: 'Auditorium', floor: 0, building: 'Main Block', hasProjector: true, hasAC: true },
      ];
      const created = await Room.insertMany(rooms);
      console.log(`   ✅  ${created.length} rooms created`);
      return created;
}

// ════════════════════════════════════════════════════════════════════════════
//  5. BRANCH
// ════════════════════════════════════════════════════════════════════════════
async function seedBranch() {
      console.log('\n🏛️  Seeding CSE branch...');
      const branch = await Branch.create({
            branchName: 'COMPUTER SCIENCE AND ENGINEERING',
            branchCode: 'CSE',
            description: 'B.Tech in Computer Science and Engineering',
            departments: ['Computer Science', 'Information Technology'],
            isActive: true,
      });
      console.log(`   ✅  Branch: ${branch.branchCode}`);
      return branch;
}

// ════════════════════════════════════════════════════════════════════════════
//  6. SEMESTERS  (all 8 for completeness, Sem 3 & 5 fully active)
// ════════════════════════════════════════════════════════════════════════════
async function seedSemesters(branch) {
      console.log('\n📅 Seeding semesters...');
      const rows = [
            { num: 1, start: '2026-07-15', end: '2026-11-30' },
            { num: 2, start: '2027-01-10', end: '2027-05-30' },
            { num: 3, start: '2026-07-15', end: '2026-11-30' },
            { num: 4, start: '2027-01-10', end: '2027-05-30' },
            { num: 5, start: '2026-07-15', end: '2026-11-30' },
            { num: 6, start: '2027-01-10', end: '2027-05-30' },
            { num: 7, start: '2026-07-15', end: '2026-11-30' },
            { num: 8, start: '2027-01-10', end: '2027-05-30' },
      ];
      const semesters = await Semester.insertMany(rows.map(r => ({
            semesterNumber: r.num,
            branch: branch._id,
            academicYear: ACADEMIC_YEAR,
            startDate: new Date(r.start),
            endDate: new Date(r.end),
            isActive: true,
      })));
      console.log(`   ✅  ${semesters.length} semesters created`);
      return semesters;
}

// ════════════════════════════════════════════════════════════════════════════
//  7. SECTIONS A–F  (Sem 3 and Sem 5)
// ════════════════════════════════════════════════════════════════════════════
async function seedSections(branch, semesters, rooms) {
      console.log('\n📚 Seeding sections A–F for Sem 3 & 5...');
      const classroomIds = rooms.filter(r => r.roomType === 'Classroom').map(r => r._id);
      const targetSems = semesters.filter(s => TARGET_SEMS.includes(s.semesterNumber));
      const docs = [];

      for (const sem of targetSems) {
            SECTIONS.forEach((letter, idx) => {
                  docs.push({
                        sectionName: letter,
                        semester: sem._id,
                        branch: branch._id,
                        capacity: 65,
                        room: classroomIds[idx % classroomIds.length],
                        isActive: true,
                  });
            });
      }

      const created = await Section.insertMany(docs);
      console.log(`   ✅  ${created.length} sections (${SECTIONS.join(', ')} × Sem 3 & 5)`);
      return created;
}

// ════════════════════════════════════════════════════════════════════════════
//  8. FACULTY
//     Abbreviations match image codes: RT, MS, RD, MT, DS, DMS, PA, AA, TJ,
//     RDT, AC, PK, SR, YD, PW, CGS, NEERAJ, etc.
// ════════════════════════════════════════════════════════════════════════════
async function seedFaculty() {
      console.log('\n👨‍🏫 Seeding faculty...');

      /*
       * Faculty list — names derived from abbreviations visible in the image.
       * Image codes (in brackets):  RT, MS, RD, MT, DS, DMS, PA, AJ, TJ,
       *                              RDT, AC, PK, SR, YD, PW, CGS, NEERAJ
       * We create 20 members to cover all six sections for two semesters.
       */
      const facultyList = [
            // Sem-3 theory faculty
            { facultyId: 'CSE-RT', name: 'Prof. R. Trivedi', abbr: 'RT', designation: 'Assistant Professor', department: 'CSE', email: 'r.trivedi@college.edu', inTime: '09:00', outTime: '17:00', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-MS', name: 'Dr. M. Sharma', abbr: 'MS', designation: 'Associate Professor', department: 'CSE', email: 'm.sharma@college.edu', inTime: '08:30', outTime: '17:00', maxClassesPerDay: 4, maxClassesPerWeek: 20 },
            { facultyId: 'CSE-RD', name: 'Prof. R. Dixit', abbr: 'RD', designation: 'Assistant Professor', department: 'CSE', email: 'r.dixit@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-MT', name: 'Prof. M. Tiwari', abbr: 'MT', designation: 'Assistant Professor', department: 'CSE', email: 'm.tiwari@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-DS', name: 'Dr. D. Singh', abbr: 'DS', designation: 'Associate Professor', department: 'CSE', email: 'd.singh@college.edu', inTime: '08:30', outTime: '17:00', maxClassesPerDay: 4, maxClassesPerWeek: 20 },
            { facultyId: 'CSE-DMS', name: 'Dr. D.M. Saxena', abbr: 'DMS', designation: 'Professor', department: 'CSE', email: 'dm.saxena@college.edu', inTime: '08:00', outTime: '17:00', maxClassesPerDay: 4, maxClassesPerWeek: 18 },
            { facultyId: 'CSE-PA', name: 'Prof. P. Agarwal', abbr: 'PA', designation: 'Assistant Professor', department: 'CSE', email: 'p.agarwal@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-AJ', name: 'Prof. A. Jain', abbr: 'AJ', designation: 'Assistant Professor', department: 'CSE', email: 'a.jain@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-TJ', name: 'Prof. T. Joshi', abbr: 'TJ', designation: 'Lecturer', department: 'CSE', email: 't.joshi@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 6, maxClassesPerWeek: 26 },
            { facultyId: 'CSE-RDT', name: 'Dr. R.D. Tripathi', abbr: 'RDT', designation: 'Associate Professor', department: 'CSE', email: 'rd.tripathi@college.edu', inTime: '08:30', outTime: '17:00', maxClassesPerDay: 4, maxClassesPerWeek: 20 },
            { facultyId: 'CSE-AC', name: 'Prof. A. Choudhary', abbr: 'AC', designation: 'Assistant Professor', department: 'CSE', email: 'a.choudhary@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-PK', name: 'Prof. P. Kumar', abbr: 'PK', designation: 'Assistant Professor', department: 'CSE', email: 'p.kumar@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-SR', name: 'Dr. S. Rao', abbr: 'SR', designation: 'Associate Professor', department: 'CSE', email: 's.rao@college.edu', inTime: '08:30', outTime: '17:00', maxClassesPerDay: 4, maxClassesPerWeek: 20 },
            { facultyId: 'CSE-YD', name: 'Prof. Y. Dubey', abbr: 'YD', designation: 'Lecturer', department: 'CSE', email: 'y.dubey@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 6, maxClassesPerWeek: 26 },
            { facultyId: 'CSE-PW', name: 'Prof. P. Wadhwa', abbr: 'PW', designation: 'Assistant Professor', department: 'CSE', email: 'p.wadhwa@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-CGS', name: 'Dr. C.G. Shukla', abbr: 'CGS', designation: 'Professor', department: 'CSE', email: 'cg.shukla@college.edu', inTime: '08:00', outTime: '17:00', maxClassesPerDay: 4, maxClassesPerWeek: 18 },
            { facultyId: 'CSE-NR', name: 'Prof. Neeraj Rastogi', abbr: 'NR', designation: 'Assistant Professor', department: 'CSE', email: 'neeraj.rastogi@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-AA', name: 'Prof. A. Aditya Singh', abbr: 'AA', designation: 'Assistant Professor', department: 'CSE', email: 'a.aditya@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
            { facultyId: 'CSE-HOD', name: 'Dr. H.O. Dwivedi', abbr: 'HOD', designation: 'HOD', department: 'CSE', email: 'hod.cse@college.edu', inTime: '08:00', outTime: '17:00', maxClassesPerDay: 3, maxClassesPerWeek: 12 },
            { facultyId: 'CSE-VK', name: 'Prof. V. Khare', abbr: 'VK', designation: 'Assistant Professor', department: 'CSE', email: 'v.khare@college.edu', inTime: '09:00', outTime: '17:30', maxClassesPerDay: 5, maxClassesPerWeek: 24 },
      ];

      const created = await Faculty.insertMany(facultyList);
      console.log(`   ✅  ${created.length} faculty members created`);
      return created;
}

// ════════════════════════════════════════════════════════════════════════════
//  9. SUBJECTS
//     Image shows these subjects:
//     Sem 3 : SE (Software Engineering), COA (Computer Org & Architecture),
//             ADA (Algorithm Design & Analysis), M-III (Math-III),
//             OS (Operating Systems intro), DE (Digital Electronics),
//             DSA (Data Structures), OOP (Object Oriented Prog),
//             IPHE (Indian Philosophy & Human Ethics),
//             PROG PR (Programming Practicals), DSA Lab, OOP Lab
//     Sem 5 : OS (Operating Systems), COA, SE, ADA, M-III,
//             CN (Computer Networks), DBMS, TOC, IPHE,
//             OS Lab, DBMS Lab, CN Lab
// ════════════════════════════════════════════════════════════════════════════
async function seedSubjects() {
      console.log('\n📖 Seeding subjects...');

      /*
       * Subject definition:
       *  code, name, type (Theory/Lab/Both), hoursPerWeek, credits, lec, prac
       *
       * Image abbreviations → full names:
       *   SE       → Software Engineering
       *   COA      → Computer Organization & Architecture
       *   ADA      → Algorithm Design and Analysis
       *   M-III    → Mathematics III (Probability & Statistics)
       *   OS       → Operating Systems
       *   DE       → Digital Electronics
       *   DSA      → Data Structures and Algorithms
       *   OOP      → Object Oriented Programming
       *   IPHE     → Indian Philosophy & Human Ethics
       *   PROG PR  → Programming Practicals (C/C++)
       *   CN       → Computer Networks
       *   DBMS     → Database Management Systems
       *   TOC      → Theory of Computation
       */

      // ── Semester 3 ────────────────────────────────────────────────────────────
      const sem3 = [
            { code: 'CS301', name: 'Data Structures and Algorithms', type: 'Theory', hours: 4, credits: 4, lec: 4, prac: 0 },
            { code: 'CS302', name: 'Digital Electronics', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
            { code: 'CS303', name: 'Mathematics III', type: 'Theory', hours: 4, credits: 4, lec: 4, prac: 0 },
            { code: 'CS304', name: 'Object Oriented Programming', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
            { code: 'CS305', name: 'Computer Organization and Architecture', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
            { code: 'HS301', name: 'Indian Philosophy and Human Ethics', type: 'Theory', hours: 2, credits: 2, lec: 2, prac: 0 },
            { code: 'CS306', name: 'DSA Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
            { code: 'CS307', name: 'OOP Lab (Java/C++)', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
            { code: 'CS308', name: 'Programming Practicals', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
      ];

      // ── Semester 5 ────────────────────────────────────────────────────────────
      const sem5 = [
            { code: 'CS501', name: 'Operating Systems', type: 'Theory', hours: 4, credits: 4, lec: 4, prac: 0 },
            { code: 'CS502', name: 'Computer Networks', type: 'Theory', hours: 4, credits: 4, lec: 4, prac: 0 },
            { code: 'CS503', name: 'Database Management Systems', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
            { code: 'CS504', name: 'Theory of Computation', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
            { code: 'CS505', name: 'Software Engineering', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
            { code: 'CS506', name: 'Algorithm Design and Analysis', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
            { code: 'HS501', name: 'Indian Philosophy and Human Ethics', type: 'Theory', hours: 2, credits: 2, lec: 2, prac: 0 },
            { code: 'CS507', name: 'OS Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
            { code: 'CS508', name: 'DBMS Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
            { code: 'CS509', name: 'Networks Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
      ];

      const docs = [];
      for (const section of SECTIONS) {
            for (const s of sem3) {
                  docs.push({
                        subjectCode: `${s.code}-${section}`,
                        subjectName: s.name,
                        semester: 3,
                        branch: 'CSE',
                        section,
                        theoryOrLab: s.type,
                        hoursPerWeek: s.hours,
                        credits: s.credits,
                        lecturesRequired: s.lec,
                        practicalRequired: s.prac,
                        isActive: true,
                  });
            }
            for (const s of sem5) {
                  docs.push({
                        subjectCode: `${s.code}-${section}`,
                        subjectName: s.name,
                        semester: 5,
                        branch: 'CSE',
                        section,
                        theoryOrLab: s.type,
                        hoursPerWeek: s.hours,
                        credits: s.credits,
                        lecturesRequired: s.lec,
                        practicalRequired: s.prac,
                        isActive: true,
                  });
            }
      }

      const created = await Subject.insertMany(docs);
      console.log(`   ✅  ${created.length} subjects (${sem3.length + sem5.length} per section × ${SECTIONS.length} sections)`);
      return created;
}

// ════════════════════════════════════════════════════════════════════════════
//  10. TEACHER MAPPINGS
//      Each faculty teaches their subject across ALL 6 sections for the
//      relevant semester.  Lab subjects get a paired-batch mapping.
//
//      Mapping derived from image abbreviations:
//
//   Sem 3:
//     CS301 DSA            → RD  (Prof. R. Dixit)
//     CS302 Digital Elec.  → DMS (Dr. D.M. Saxena)
//     CS303 Math-III       → MS  (Dr. M. Sharma)
//     CS304 OOP            → PA  (Prof. P. Agarwal)
//     CS305 COA            → RT  (Prof. R. Trivedi)
//     HS301 IPHE           → TJ  (Prof. T. Joshi)
//     CS306 DSA Lab B1     → RD  (same theory faculty)
//     CS306 DSA Lab B2     → YD  (Prof. Y. Dubey)
//     CS307 OOP Lab B1     → PA
//     CS307 OOP Lab B2     → NR  (Prof. Neeraj Rastogi)
//     CS308 PROG PR  B1    → MT  (Prof. M. Tiwari)
//     CS308 PROG PR  B2    → AA  (Prof. A. Aditya Singh)
//
//   Sem 5:
//     CS501 OS             → DS  (Dr. D. Singh)
//     CS502 CN             → CGS (Dr. C.G. Shukla)
//     CS503 DBMS           → RDT (Dr. R.D. Tripathi)
//     CS504 TOC            → AC  (Prof. A. Choudhary)
//     CS505 SE             → SR  (Dr. S. Rao)
//     CS506 ADA            → PK  (Prof. P. Kumar)
//     HS501 IPHE           → TJ
//     CS507 OS Lab   B1    → DS
//     CS507 OS Lab   B2    → VK  (Prof. V. Khare)
//     CS508 DBMS Lab B1    → RDT
//     CS508 DBMS Lab B2    → PW  (Prof. P. Wadhwa)
//     CS509 CN Lab   B1    → CGS
//     CS509 CN Lab   B2    → AJ  (Prof. A. Jain)
// ════════════════════════════════════════════════════════════════════════════
async function seedTeacherMappings(branch, semesters, sections, faculty, subjects, rooms) {
      console.log('\n🔗 Seeding teacher mappings...');

      // Quick lookup helpers
      const facByAbbr = {};
      faculty.forEach(f => { facByAbbr[f.facultyId.replace('CSE-', '')] = f; });

      const subByCode = {};
      subjects.forEach(s => { subByCode[s.subjectCode] = s; });

      const sem3Doc = semesters.find(s => s.semesterNumber === 3);
      const sem5Doc = semesters.find(s => s.semesterNumber === 5);

      const labRooms = rooms.filter(r => r.roomType === 'Lab');
      const labRoomNames = labRooms.map(r => r.roomNumber);

      /*
       * Plan format:
       * { semDoc, subBase, facAbbr, type, batch, lec, prac, labRoom }
       *
       * For Lab subjects we create TWO entries (B1 + B2) with different faculty
       * and different lab rooms — this satisfies the "paired lab" rule.
       */
      const plan = [
            // ── Sem 3 Theory ────────────────────────────────────────────────────────
            { semDoc: sem3Doc, subBase: 'CS301', facAbbr: 'RD', type: 'Theory', batch: 'NA', lec: 4, prac: 0 },
            { semDoc: sem3Doc, subBase: 'CS302', facAbbr: 'DMS', type: 'Theory', batch: 'NA', lec: 3, prac: 0 },
            { semDoc: sem3Doc, subBase: 'CS303', facAbbr: 'MS', type: 'Theory', batch: 'NA', lec: 4, prac: 0 },
            { semDoc: sem3Doc, subBase: 'CS304', facAbbr: 'PA', type: 'Theory', batch: 'NA', lec: 3, prac: 0 },
            { semDoc: sem3Doc, subBase: 'CS305', facAbbr: 'RT', type: 'Theory', batch: 'NA', lec: 3, prac: 0 },
            { semDoc: sem3Doc, subBase: 'HS301', facAbbr: 'TJ', type: 'Theory', batch: 'NA', lec: 2, prac: 0 },
            // ── Sem 3 Labs ──────────────────────────────────────────────────────────
            { semDoc: sem3Doc, subBase: 'CS306', facAbbr: 'RD', type: 'Practical', batch: 'A', lec: 0, prac: 2, labRoom: labRoomNames[0] },
            { semDoc: sem3Doc, subBase: 'CS306', facAbbr: 'YD', type: 'Practical', batch: 'B', lec: 0, prac: 2, labRoom: labRoomNames[1] },
            { semDoc: sem3Doc, subBase: 'CS307', facAbbr: 'PA', type: 'Practical', batch: 'A', lec: 0, prac: 2, labRoom: labRoomNames[2] },
            { semDoc: sem3Doc, subBase: 'CS307', facAbbr: 'NR', type: 'Practical', batch: 'B', lec: 0, prac: 2, labRoom: labRoomNames[3] },
            { semDoc: sem3Doc, subBase: 'CS308', facAbbr: 'MT', type: 'Practical', batch: 'A', lec: 0, prac: 2, labRoom: labRoomNames[0] },
            { semDoc: sem3Doc, subBase: 'CS308', facAbbr: 'AA', type: 'Practical', batch: 'B', lec: 0, prac: 2, labRoom: labRoomNames[1] },
            // ── Sem 5 Theory ────────────────────────────────────────────────────────
            { semDoc: sem5Doc, subBase: 'CS501', facAbbr: 'DS', type: 'Theory', batch: 'NA', lec: 4, prac: 0 },
            { semDoc: sem5Doc, subBase: 'CS502', facAbbr: 'CGS', type: 'Theory', batch: 'NA', lec: 4, prac: 0 },
            { semDoc: sem5Doc, subBase: 'CS503', facAbbr: 'RDT', type: 'Theory', batch: 'NA', lec: 3, prac: 0 },
            { semDoc: sem5Doc, subBase: 'CS504', facAbbr: 'AC', type: 'Theory', batch: 'NA', lec: 3, prac: 0 },
            { semDoc: sem5Doc, subBase: 'CS505', facAbbr: 'SR', type: 'Theory', batch: 'NA', lec: 3, prac: 0 },
            { semDoc: sem5Doc, subBase: 'CS506', facAbbr: 'PK', type: 'Theory', batch: 'NA', lec: 3, prac: 0 },
            { semDoc: sem5Doc, subBase: 'HS501', facAbbr: 'TJ', type: 'Theory', batch: 'NA', lec: 2, prac: 0 },
            // ── Sem 5 Labs ──────────────────────────────────────────────────────────
            { semDoc: sem5Doc, subBase: 'CS507', facAbbr: 'DS', type: 'Practical', batch: 'A', lec: 0, prac: 2, labRoom: labRoomNames[0] },
            { semDoc: sem5Doc, subBase: 'CS507', facAbbr: 'VK', type: 'Practical', batch: 'B', lec: 0, prac: 2, labRoom: labRoomNames[1] },
            { semDoc: sem5Doc, subBase: 'CS508', facAbbr: 'RDT', type: 'Practical', batch: 'A', lec: 0, prac: 2, labRoom: labRoomNames[2] },
            { semDoc: sem5Doc, subBase: 'CS508', facAbbr: 'PW', type: 'Practical', batch: 'B', lec: 0, prac: 2, labRoom: labRoomNames[3] },
            { semDoc: sem5Doc, subBase: 'CS509', facAbbr: 'CGS', type: 'Practical', batch: 'A', lec: 0, prac: 2, labRoom: labRoomNames[4 % labRoomNames.length] },
            { semDoc: sem5Doc, subBase: 'CS509', facAbbr: 'AJ', type: 'Practical', batch: 'B', lec: 0, prac: 2, labRoom: labRoomNames[5 % labRoomNames.length] },
      ];

      let inserted = 0;
      let skipped = 0;

      for (const section of SECTIONS) {
            const sem3SecDoc = sections.find(s => s.sectionName === section && String(s.semester) === String(sem3Doc._id));
            const sem5SecDoc = sections.find(s => s.sectionName === section && String(s.semester) === String(sem5Doc._id));

            for (const p of plan) {
                  const secDoc = (p.semDoc === sem3Doc) ? sem3SecDoc : sem5SecDoc;
                  if (!secDoc) continue;

                  const fac = facByAbbr[p.facAbbr];
                  const subCode = `${p.subBase}-${section}`;
                  const subDoc = subByCode[subCode];

                  if (!fac || !subDoc) {
                        console.warn(`   ⚠️  Missing fac[${p.facAbbr}] or sub[${subCode}]`);
                        continue;
                  }

                  const totalHours = p.lec + p.prac;
                  const doc = {
                        facultyId: fac._id,
                        subjectId: subDoc._id,
                        subjectCode: subDoc.subjectCode,
                        semester: p.semDoc._id,
                        branch: branch._id,
                        section: secDoc._id,
                        batch: p.batch,
                        subjectType: p.type,
                        lectureHoursPerWeek: p.lec,
                        practicalHoursPerWeek: p.prac,
                        totalHoursPerWeek: totalHours,
                        classesPerWeek: totalHours,
                        facultyMaxLoad: fac.maxClassesPerWeek,
                        currentAssignedLoad: totalHours,
                        priority: 'Medium',
                        status: 'Active',
                  };

                  // Add preferred lab room for practical mappings
                  if (p.labRoom) {
                        const labRoomDoc = rooms.find(r => r.roomNumber === p.labRoom);
                        if (labRoomDoc) doc.preferredLab = labRoomDoc._id;
                  }

                  try {
                        await TeacherMapping.create(doc);
                        inserted++;
                  } catch (e) {
                        skipped++;
                  }
            }
      }

      console.log(`   ✅  ${inserted} teacher mappings created  (${skipped} skipped/duplicate)`);
}

// ════════════════════════════════════════════════════════════════════════════
//  11. FIXED ACTIVITY SLOTS
//      Rules from image:
//        • TRP (Transport)  – Saturday P8 (15:50-16:30) — all sections
//        • SAC Activity     – Saturday P8 (15:50-16:30) — college-scope
//        • Sports           – Wednesday P7 (15:00-15:50) — all sections
//        • Library          – Friday P6   (14:10-15:00) — all sections
//        • Mentoring        – Monday  P8  (15:50-16:30) — all sections
//        • Placement Sem.   – Thursday P6-P7 (14:10-15:50) — semester-scope
// ════════════════════════════════════════════════════════════════════════════
async function seedFixedSlots(branch, semesters, sections) {
      console.log('\n📌 Seeding fixed activity slots...');

      const sem3Doc = semesters.find(s => s.semesterNumber === 3);
      const sem5Doc = semesters.find(s => s.semesterNumber === 5);
      const docs = [];

      for (const semDoc of [sem3Doc, sem5Doc]) {
            // Per-section fixed slots
            for (const section of SECTIONS) {
                  const secDoc = sections.find(
                        s => s.sectionName === section && String(s.semester) === String(semDoc._id)
                  );
                  if (!secDoc) continue;

                  const base = { semester: semDoc._id, branch: branch._id, section: secDoc._id, scope: 'Section', locked: true, isActive: true };

                  // Sports – Wednesday P7
                  docs.push({ ...base, activityName: 'Sports & Physical Activity', activityType: 'Sports', type: 'Sports', day: 'Wednesday', startTime: '15:00', endTime: '15:50', duration: 50 });
                  // Library – Friday P6
                  docs.push({ ...base, activityName: 'Library Period', activityType: 'Library', type: 'Library', day: 'Friday', startTime: '14:10', endTime: '15:00', duration: 50 });
                  // Faculty Mentoring – Monday P8
                  docs.push({ ...base, activityName: 'Faculty Mentoring', activityType: 'Mentoring', type: 'Mentoring', day: 'Monday', startTime: '15:50', endTime: '16:30', duration: 40 });
                  // TRP (Transport) – Saturday P8  ← image shows "TRP" highlighted red/blue
                  docs.push({ ...base, activityName: 'Transport (TRP)', activityType: 'Custom', type: 'Custom', day: 'Saturday', startTime: '15:50', endTime: '16:30', duration: 40 });
            }

            // Semester-scope fixed slots (affect all sections of that semester)
            // Placement Seminar – Thursday P6-P7
            docs.push({
                  semester: semDoc._id,
                  branch: branch._id,
                  scope: 'Semester',
                  activityName: 'Placement Seminar',
                  activityType: 'Placement',
                  type: 'Placement',
                  day: 'Thursday',
                  startTime: '14:10',
                  endTime: '15:50',
                  duration: 100,
                  locked: true,
                  isActive: true,
            });

            // SAC Activity – Saturday last period (College-scope per semester)
            docs.push({
                  semester: semDoc._id,
                  branch: branch._id,
                  scope: 'Semester',
                  activityName: 'SAC Activity',
                  activityType: 'Activity',
                  type: 'Activity',
                  day: 'Saturday',
                  startTime: '14:10',
                  endTime: '15:00',
                  duration: 50,
                  locked: true,
                  isActive: true,
            });
      }

      const created = await FixedSlot.insertMany(docs);
      console.log(`   ✅  ${created.length} fixed slots created`);
      return created;
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════════════
async function main() {
      console.log('\n🚀 CSE Demo Data Seed — Full Rebuild');
      console.log('═'.repeat(55));

      try {
            await mongoose.connect(
                  process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable-generator',
                  { useNewUrlParser: true, useUnifiedTopology: true }
            );
            console.log('✅  MongoDB connected');

            await clearAll();

            await seedUsers();
            await seedCollegeTiming();
            await seedTimeSlots();
            const rooms = await seedRooms();
            const branch = await seedBranch();
            const semesters = await seedSemesters(branch);
            const sections = await seedSections(branch, semesters, rooms);
            const faculty = await seedFaculty();
            const subjects = await seedSubjects();
            await seedTeacherMappings(branch, semesters, sections, faculty, subjects, rooms);
            await seedFixedSlots(branch, semesters, sections);

            const subjectsPerSection = 9 + 10; // sem3 + sem5
            console.log('\n' + '═'.repeat(55));
            console.log('🎉  Demo data seeded successfully!');
            console.log('═'.repeat(55));
            console.log('');
            console.log('  Branch     : CSE');
            console.log('  Sections   : A, B, C, D, E, F (Sem 3 & Sem 5)');
            console.log('  Faculty    : 20 members (RT, MS, RD, MT, DS, DMS, PA,');
            console.log('               AJ, TJ, RDT, AC, PK, SR, YD, PW, CGS,');
            console.log('               NR, AA, HOD, VK)');
            console.log(`  Subjects   : ${subjectsPerSection * SECTIONS.length} total (${subjectsPerSection}/section × 6 sections)`);
            console.log('  Rooms      : 16 (8 classrooms + 6 labs + SH + AUD)');
            console.log('  TimeSlots  : 14 (9 lecture + 2 breaks + 4 lab-pairs)');
            console.log('  Fixed slots: Sports, Library, Mentoring, TRP,');
            console.log('               Placement Seminar, SAC Activity');
            console.log('');
            console.log('  TIMETABLE RULES IMPLEMENTED:');
            console.log('  ✔  Mon–Sat 6-day week, 9 periods/day @ 50 min');
            console.log('  ✔  Lab = 2 consecutive slots, B1+B2 simultaneously');
            console.log('  ✔  Max 1 lab session per section per day');
            console.log('  ✔  Theory spread — 1 lecture/subject/day (Pass A)');
            console.log('  ✔  TRP fixed Saturday P8 (locked)');
            console.log('  ✔  SAC Activity Saturday P6 (locked)');
            console.log('  ✔  Sports Wednesday P7 (locked)');
            console.log('  ✔  Library Friday P6 (locked)');
            console.log('  ✔  Mentoring Monday P8 (locked)');
            console.log('  ✔  Placement Seminar Thursday P6-P7 (locked)');
            console.log('');
            console.log('  LOGIN : admin@college.edu  /  Admin@123');
            console.log('  PORT  : 5004');
            console.log('═'.repeat(55));
            console.log('');

            process.exit(0);
      } catch (err) {
            console.error('\n❌  Seed failed:', err.message);
            console.error(err.stack);
            process.exit(1);
      }
}

main();
