/**
 * demoData.js  — CSE Demo Dataset
 * Sections A–F · Semester 3 & 5 (Odd) · Mon–Sat
 *
 * KEY FIX: Lab subjects use pre-formed B1+B2 pairs per section.
 *   • B1 and B2 of the SAME lab subject → scheduled simultaneously,
 *     different labs, different faculty, same 2-consecutive-slot window.
 *   • Each section has its OWN pair of lab faculty so no faculty clash.
 *   • Theory faculty are shared across sections (they handle one section
 *     at a time, scheduler prevents clashes via busy map).
 */

let _seq = 1
const uid = (p = 'id') => `${p}_${Date.now()}_${(_seq++).toString(36)}`
const now = () => new Date().toISOString()

// ─────────────────────────────────────────────────────────────────────────────
// 1. COLLEGE TIMING  —  Mon–Sat, 09:00–16:30, 50-min lectures
// ─────────────────────────────────────────────────────────────────────────────
export const COLLEGE_TIMING = {
      _id: uid('ct'),
      collegeName: 'Demo Engineering College',
      academicYear: '2026-2027',
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
      teaBreak: { enabled: false, startTime: '11:30', endTime: '11:40' },
      isActive: true,
      updatedAt: now(),
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FACULTY  (28 members to cover 6 sections × lab pairs without clashes)
// ─────────────────────────────────────────────────────────────────────────────
const mf = (abbr, name, desig, email, maxD, maxW) => ({
      _id: uid('fac'), facultyId: `CSE-${abbr}`, abbr, name,
      designation: desig, department: 'CSE', email,
      phone: '', inTime: '09:00', outTime: '17:00',
      maxClassesPerDay: maxD, maxClassesPerWeek: maxW,
      isActive: true, createdAt: now(),
})

export const FACULTY = [
      // ── Core theory faculty ──────────────────────────────────────────────────
      mf('RT', 'Prof. R. Trivedi', 'Assistant Professor', 'r.trivedi@college.edu', 5, 30),
      mf('MS', 'Dr. M. Sharma', 'Associate Professor', 'm.sharma@college.edu', 4, 24),
      mf('RD', 'Prof. R. Dixit', 'Assistant Professor', 'r.dixit@college.edu', 5, 30),
      mf('MT', 'Prof. M. Tiwari', 'Assistant Professor', 'm.tiwari@college.edu', 5, 30),
      mf('DS', 'Dr. D. Singh', 'Associate Professor', 'd.singh@college.edu', 4, 24),
      mf('DMS', 'Dr. D.M. Saxena', 'Professor', 'dm.saxena@college.edu', 4, 24),
      mf('PA', 'Prof. P. Agarwal', 'Assistant Professor', 'p.agarwal@college.edu', 5, 30),
      mf('TJ', 'Prof. T. Joshi', 'Lecturer', 't.joshi@college.edu', 6, 36),
      mf('RDT', 'Dr. R.D. Tripathi', 'Associate Professor', 'rd.tripathi@college.edu', 4, 24),
      mf('AC', 'Prof. A. Choudhary', 'Assistant Professor', 'a.choudhary@college.edu', 5, 30),
      mf('PK', 'Prof. P. Kumar', 'Assistant Professor', 'p.kumar@college.edu', 5, 30),
      mf('SR', 'Dr. S. Rao', 'Associate Professor', 's.rao@college.edu', 4, 24),
      mf('CGS', 'Dr. C.G. Shukla', 'Professor', 'cg.shukla@college.edu', 4, 24),
      mf('HOD', 'Dr. H.O. Dwivedi', 'HOD', 'hod.cse@college.edu', 3, 12),

      // ── Lab faculty pool — enough for 6 sections × 3 lab pairs ──────────────
      // DSA Lab (CS306) — 6 section pairs: 6 B1 + 6 B2
      mf('L1A', 'Prof. Y. Dubey', 'Lecturer', 'y.dubey@college.edu', 6, 36),
      mf('L1B', 'Prof. K. Mishra', 'Lecturer', 'k.mishra@college.edu', 6, 36),
      mf('L1C', 'Prof. S. Pandey', 'Assistant Professor', 's.pandey@college.edu', 5, 30),
      mf('L1D', 'Prof. A. Verma', 'Lecturer', 'a.verma@college.edu', 6, 36),
      mf('L1E', 'Prof. N. Rastogi', 'Assistant Professor', 'n.rastogi@college.edu', 5, 30),
      mf('L1F', 'Prof. R. Bansod', 'Lecturer', 'r.bansod@college.edu', 6, 36),

      // OOP Lab (CS307) — 6 section pairs
      mf('L2A', 'Prof. D. Sharma', 'Lecturer', 'd.sharma@college.edu', 6, 36),
      mf('L2B', 'Prof. P. Wadhwa', 'Assistant Professor', 'p.wadhwa@college.edu', 5, 30),
      mf('L2C', 'Prof. V. Khare', 'Assistant Professor', 'v.khare@college.edu', 5, 30),
      mf('L2D', 'Prof. A. Jain', 'Assistant Professor', 'a.jain@college.edu', 5, 30),
      mf('L2E', 'Prof. A. Aditya', 'Assistant Professor', 'a.aditya@college.edu', 5, 30),
      mf('L2F', 'Prof. M. Chaudhari', 'Lecturer', 'm.chaudhari@college.edu', 6, 36),

      // Prog PR Lab (CS308) / OS,DBMS,CN Labs (Sem5) — shared from above pool + these
      mf('L3A', 'Prof. T. Srivastava', 'Lecturer', 't.srivastava@college.edu', 6, 36),
      mf('L3B', 'Prof. H. Nair', 'Lecturer', 'h.nair@college.edu', 6, 36),
]

const facByAbbr = {}
FACULTY.forEach(f => { facByAbbr[f.abbr] = f })
const fac = (abbr) => facByAbbr[abbr]

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUBJECTS — 9 Sem-3 + 10 Sem-5 per section × 6 sections = 114 total
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']

const SEM3T = [  // Theory subjects
      { code: 'CS301', name: 'Data Structures and Algorithms', type: 'Theory', hours: 4, credits: 4, lec: 4, prac: 0 },
      { code: 'CS302', name: 'Digital Electronics', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
      { code: 'CS303', name: 'Mathematics III', type: 'Theory', hours: 4, credits: 4, lec: 4, prac: 0 },
      { code: 'CS304', name: 'Object Oriented Programming', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
      { code: 'CS305', name: 'Computer Organization and Architecture', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
      { code: 'HS301', name: 'Indian Philosophy and Human Ethics', type: 'Theory', hours: 2, credits: 2, lec: 2, prac: 0 },
]
const SEM3L = [  // Lab subjects
      { code: 'CS306', name: 'DSA Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
      { code: 'CS307', name: 'OOP Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
      { code: 'CS308', name: 'Programming Practicals', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
]
const SEM5T = [
      { code: 'CS501', name: 'Operating Systems', type: 'Theory', hours: 4, credits: 4, lec: 4, prac: 0 },
      { code: 'CS502', name: 'Computer Networks', type: 'Theory', hours: 4, credits: 4, lec: 4, prac: 0 },
      { code: 'CS503', name: 'Database Management Systems', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
      { code: 'CS504', name: 'Theory of Computation', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
      { code: 'CS505', name: 'Software Engineering', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
      { code: 'CS506', name: 'Algorithm Design and Analysis', type: 'Theory', hours: 3, credits: 3, lec: 3, prac: 0 },
      { code: 'HS501', name: 'Indian Philosophy and Human Ethics', type: 'Theory', hours: 2, credits: 2, lec: 2, prac: 0 },
]
const SEM5L = [
      { code: 'CS507', name: 'OS Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
      { code: 'CS508', name: 'DBMS Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
      { code: 'CS509', name: 'Networks Lab', type: 'Lab', hours: 2, credits: 1, lec: 0, prac: 2 },
]

export const SUBJECTS = []
const subjectIds = {}   // code+section → _id

for (const sec of SECTIONS) {
      for (const t of [...SEM3T, ...SEM3L]) {
            const code = `${t.code}-${sec}`
            const s = {
                  _id: uid('sub'), subjectCode: code, subjectName: t.name,
                  semester: 3, branch: 'CSE', section: sec,
                  theoryOrLab: t.type, hoursPerWeek: t.hours, credits: t.credits,
                  lecturesRequired: t.lec, practicalRequired: t.prac,
                  isActive: true, createdAt: now()
            }
            SUBJECTS.push(s)
            subjectIds[code] = s._id
      }
      for (const t of [...SEM5T, ...SEM5L]) {
            const code = `${t.code}-${sec}`
            const s = {
                  _id: uid('sub'), subjectCode: code, subjectName: t.name,
                  semester: 5, branch: 'CSE', section: sec,
                  theoryOrLab: t.type, hoursPerWeek: t.hours, credits: t.credits,
                  lecturesRequired: t.lec, practicalRequired: t.prac,
                  isActive: true, createdAt: now()
            }
            SUBJECTS.push(s)
            subjectIds[code] = s._id
      }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TEACHER MAPPINGS
//
//  Rule: In each lab session, B1 and B2 must have DIFFERENT subjects.
//        They run simultaneously — B1 does subject X, B2 does subject Y.
//
//  Sem-3 has 3 lab subjects: CS306 (DSA Lab), CS307 (OOP Lab), CS308 (Prog PR)
//  We create 3 lab sessions per section, each pairing two different subjects:
//    Session 1: B1=CS306  B2=CS307
//    Session 2: B1=CS307  B2=CS308
//    Session 3: B1=CS308  B2=CS306
//
//  Sem-5 has 3 lab subjects: CS507 (OS Lab), CS508 (DBMS Lab), CS509 (CN Lab)
//    Session 1: B1=CS507  B2=CS508
//    Session 2: B1=CS508  B2=CS509
//    Session 3: B1=CS509  B2=CS507
//
//  Each section gets its own dedicated lab faculty so no faculty clash.
// ─────────────────────────────────────────────────────────────────────────────

const LAB_ROOMS = ['LAB-CS1', 'LAB-CS2', 'LAB-CS3', 'LAB-CS4', 'LAB-NET', 'LAB-DS']

// Per-section lab faculty pool — 2 faculty per session × 3 sessions = 6 per section
// We reuse the lab faculty (L1A–L3B) spread across sections
const LAB_FAC_POOL = {
      A: { b1: ['L1A', 'L2A', 'L3A'], b2: ['L1B', 'L2B', 'L3B'] },
      B: { b1: ['L1C', 'L2C', 'L1A'], b2: ['L1D', 'L2D', 'L1C'] },
      C: { b1: ['L1E', 'L2E', 'L1B'], b2: ['L1F', 'L2F', 'L1D'] },
      D: { b1: ['L1A', 'L2A', 'L3A'], b2: ['L2B', 'L1B', 'L3B'] }, // diff time from A
      E: { b1: ['L1C', 'L2C', 'L1E'], b2: ['L1D', 'L2D', 'L1F'] },
      F: { b1: ['L1E', 'L2E', 'L3A'], b2: ['L2F', 'L1F', 'L3B'] },
}

// Sem-3 lab session pairs: [b1SubBase, b2SubBase]
const SEM3_LAB_SESSIONS = [
      ['CS306', 'CS307'],  // Session 1: DSA Lab (B1) + OOP Lab (B2)
      ['CS307', 'CS308'],  // Session 2: OOP Lab (B1) + Prog PR (B2)
      ['CS308', 'CS306'],  // Session 3: Prog PR (B1) + DSA Lab (B2)
]

// Sem-5 lab session pairs: [b1SubBase, b2SubBase]
const SEM5_LAB_SESSIONS = [
      ['CS507', 'CS508'],  // Session 1: OS Lab (B1) + DBMS Lab (B2)
      ['CS508', 'CS509'],  // Session 2: DBMS Lab (B1) + CN Lab (B2)
      ['CS509', 'CS507'],  // Session 3: CN Lab (B1) + OS Lab (B2)
]

// Theory faculty per subject
const THEORY_FAC = {
      3: { CS301: 'RD', CS302: 'DMS', CS303: 'MS', CS304: 'PA', CS305: 'RT', HS301: 'TJ' },
      5: { CS501: 'DS', CS502: 'CGS', CS503: 'RDT', CS504: 'AC', CS505: 'SR', CS506: 'PK', HS501: 'TJ' },
}

const CR_ROOMS = ['CR-101', 'CR-102', 'CR-103', 'CR-201', 'CR-202', 'CR-203', 'CR-301', 'CR-302']

export const TEACHER_MAPPINGS = []

const makeMapping = (facObj, subCode, subName, sem, sec, type, lth, lpr, batch, pRoom, cRoom) => {
      const total = lth + lpr
      return {
            _id: uid('map'),
            facultyId: facObj._id,
            facultyName: facObj.name,
            subjectId: subjectIds[subCode],
            subjectCode: subCode,
            subjectName: subName,
            semester: sem,
            branch: 'CSE',
            section: sec,
            batch,
            subjectType: type,
            loadTheory: lth,
            loadPractical: lpr,
            lectureHoursPerWeek: lth,
            practicalHoursPerWeek: lpr,
            totalHoursPerWeek: total,
            classesPerWeek: total,
            facultyMaxLoad: facObj.maxClassesPerWeek,
            currentAssignedLoad: total,
            preferredRoom: cRoom || '',
            preferredLab: pRoom || '',
            priority: 'Medium',
            status: 'Active',
            createdAt: now(),
      }
}

for (const sec of SECTIONS) {
      const secIdx = SECTIONS.indexOf(sec)
      const cRoom = CR_ROOMS[secIdx % CR_ROOMS.length]
      const pool = LAB_FAC_POOL[sec]

      // ── Sem-3 Theory ────────────────────────────────────────────────────────
      for (const [base, abbr] of Object.entries(THEORY_FAC[3])) {
            const code = `${base}-${sec}`
            const subj = SUBJECTS.find(s => s.subjectCode === code)
            if (!subj || !fac(abbr)) continue
            TEACHER_MAPPINGS.push(makeMapping(fac(abbr), code, subj.subjectName, 3, sec, 'Theory', subj.lecturesRequired, 0, 'NA', '', cRoom))
      }

      // ── Sem-3 Labs: 3 sessions, each with B1 (subjectX) + B2 (subjectY different) ─
      SEM3_LAB_SESSIONS.forEach(([b1Base, b2Base], idx) => {
            const b1Code = `${b1Base}-${sec}`
            const b2Code = `${b2Base}-${sec}`
            const b1Subj = SUBJECTS.find(s => s.subjectCode === b1Code)
            const b2Subj = SUBJECTS.find(s => s.subjectCode === b2Code)
            const b1Fac = fac(pool.b1[idx])
            const b2Fac = fac(pool.b2[idx])
            if (!b1Subj || !b2Subj || !b1Fac || !b2Fac) return
            const r1 = LAB_ROOMS[(secIdx * 2) % LAB_ROOMS.length]
            const r2 = LAB_ROOMS[(secIdx * 2 + 1) % LAB_ROOMS.length]
            TEACHER_MAPPINGS.push(makeMapping(b1Fac, b1Code, b1Subj.subjectName, 3, sec, 'Practical', 0, 2, 'B1', r1, ''))
            TEACHER_MAPPINGS.push(makeMapping(b2Fac, b2Code, b2Subj.subjectName, 3, sec, 'Practical', 0, 2, 'B2', r2, ''))
      })

      // ── Sem-5 Theory ────────────────────────────────────────────────────────
      for (const [base, abbr] of Object.entries(THEORY_FAC[5])) {
            const code = `${base}-${sec}`
            const subj = SUBJECTS.find(s => s.subjectCode === code)
            if (!subj || !fac(abbr)) continue
            TEACHER_MAPPINGS.push(makeMapping(fac(abbr), code, subj.subjectName, 5, sec, 'Theory', subj.lecturesRequired, 0, 'NA', '', cRoom))
      }

      // ── Sem-5 Labs: 3 sessions, each with B1 (subjectX) + B2 (subjectY different) ─
      SEM5_LAB_SESSIONS.forEach(([b1Base, b2Base], idx) => {
            const b1Code = `${b1Base}-${sec}`
            const b2Code = `${b2Base}-${sec}`
            const b1Subj = SUBJECTS.find(s => s.subjectCode === b1Code)
            const b2Subj = SUBJECTS.find(s => s.subjectCode === b2Code)
            const b1Fac = fac(pool.b1[idx])
            const b2Fac = fac(pool.b2[idx])
            if (!b1Subj || !b2Subj || !b1Fac || !b2Fac) return
            const r1 = LAB_ROOMS[(secIdx * 2 + 2) % LAB_ROOMS.length]
            const r2 = LAB_ROOMS[(secIdx * 2 + 3) % LAB_ROOMS.length]
            TEACHER_MAPPINGS.push(makeMapping(b1Fac, b1Code, b1Subj.subjectName, 5, sec, 'Practical', 0, 2, 'B1', r1, ''))
            TEACHER_MAPPINGS.push(makeMapping(b2Fac, b2Code, b2Subj.subjectName, 5, sec, 'Practical', 0, 2, 'B2', r2, ''))
      })
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FIXED ACTIVITY SLOTS
//    • Sports    Wed  P7 15:00–15:50  Section-scope
//    • Library   Fri  P6 14:10–15:00  Section-scope
//    • Mentoring Mon  P8 15:50–16:30  Section-scope
//    • TRP       Sat  P8 15:50–16:30  Section-scope  (locked)
//    • SAC       Sat  P6 14:10–15:00  Semester-scope
//    • Placement Thu  P6-P7 14:10–15:50 Semester-scope
// ─────────────────────────────────────────────────────────────────────────────
export const FIXED_SLOTS = []

for (const sem of [3, 5]) {
      for (const sec of SECTIONS) {
            const base = { semester: sem, branch: 'CSE', section: sec, scope: 'Section', locked: true, isActive: true }
            FIXED_SLOTS.push({ ...base, _id: uid('fs'), activityName: 'Sports & Physical Activity', activityType: 'Sports', type: 'Sports', day: 'Wednesday', startTime: '15:00', endTime: '15:50', duration: 50 })
            FIXED_SLOTS.push({ ...base, _id: uid('fs'), activityName: 'Library Period', activityType: 'Library', type: 'Library', day: 'Friday', startTime: '14:10', endTime: '15:00', duration: 50 })
            FIXED_SLOTS.push({ ...base, _id: uid('fs'), activityName: 'Faculty Mentoring', activityType: 'Mentoring', type: 'Mentoring', day: 'Monday', startTime: '15:50', endTime: '16:30', duration: 40 })
            FIXED_SLOTS.push({ ...base, _id: uid('fs'), activityName: 'TRP (Transport)', activityType: 'Custom', type: 'Custom', day: 'Saturday', startTime: '15:50', endTime: '16:30', duration: 40 })
      }
      FIXED_SLOTS.push({ _id: uid('fs'), semester: sem, branch: 'CSE', scope: 'Semester', activityName: 'Placement Seminar', activityType: 'Placement', type: 'Placement', day: 'Thursday', startTime: '14:10', endTime: '15:50', duration: 100, locked: true, isActive: true })
      FIXED_SLOTS.push({ _id: uid('fs'), semester: sem, branch: 'CSE', scope: 'Semester', activityName: 'SAC Activity', activityType: 'Activity', type: 'Activity', day: 'Saturday', startTime: '14:10', endTime: '15:00', duration: 50, locked: true, isActive: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. LOADER / CLEARER
// ─────────────────────────────────────────────────────────────────────────────
export function loadDemoData() {
      try {
            localStorage.setItem('tt_college_timing', JSON.stringify(COLLEGE_TIMING))
            localStorage.setItem('tt_faculty', JSON.stringify(FACULTY))
            localStorage.setItem('tt_subjects', JSON.stringify(SUBJECTS))
            localStorage.setItem('tt_teacher_mappings', JSON.stringify(TEACHER_MAPPINGS))
            localStorage.setItem('tt_fixed_slots', JSON.stringify(FIXED_SLOTS))
            localStorage.setItem('tt_timetables', JSON.stringify([]))
            return {
                  success: true,
                  message: 'Demo data loaded',
                  summary: {
                        collegeTiming: 1,
                        faculty: FACULTY.length,
                        subjects: SUBJECTS.length,
                        teacherMappings: TEACHER_MAPPINGS.length,
                        fixedSlots: FIXED_SLOTS.length,
                  },
            }
      } catch (err) {
            return { success: false, message: err.message }
      }
}

export function clearDemoData() {
      ['tt_college_timing', 'tt_faculty', 'tt_subjects',
            'tt_teacher_mappings', 'tt_fixed_slots', 'tt_timetables']
            .forEach(k => localStorage.removeItem(k))
      return { success: true, message: 'All demo data cleared' }
}
