const Timetable = require('../models/Timetable.model');
const FixedSlot = require('../models/FixedSlot.model');
const TeacherAvailability = require('../models/TeacherAvailability.model');
const { generateSchedule, buildTimeSlots, validateSameSubjectSameDay, validatePairedLabSessions, validateLabDailyLimit } = require('../utils/scheduler');

const collectBlockingConflicts = (slots) => {
      const sameSubject = validateSameSubjectSameDay(slots || []);
      const paired = validatePairedLabSessions(slots || []);
      const dailyLimit = validateLabDailyLimit(slots || []);
      return [...sameSubject, ...paired, ...dailyLimit];
};

// @desc    Get all timetables
// @route   GET /api/timetable
// @access  Private
exports.getAllTimetables = async (req, res, next) => {
      try {
            const timetables = await Timetable.find()
                  .populate('branch', 'branchName branchCode')
                  .populate('semester', 'semesterNumber academicYear')
                  .populate('section', 'sectionName capacity')
                  .populate('generatedBy', 'email')
                  .populate('slots.subject', 'subjectName subjectCode')
                  .populate('slots.faculty', 'name designation')
                  .populate('slots.room', 'roomNumber capacity')
                  .populate('slots.slot', 'slotName startTime endTime');

            res.status(200).json({
                  success: true,
                  count: timetables.length,
                  data: timetables
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get single timetable
// @route   GET /api/timetable/:id
// @access  Private
exports.getTimetable = async (req, res, next) => {
      try {
            const timetable = await Timetable.findById(req.params.id)
                  .populate('branch', 'branchName branchCode')
                  .populate('semester', 'semesterNumber academicYear')
                  .populate('section', 'sectionName capacity')
                  .populate('generatedBy', 'email')
                  .populate('slots.subject', 'subjectName subjectCode')
                  .populate('slots.faculty', 'name designation')
                  .populate('slots.room', 'roomNumber capacity')
                  .populate('slots.slot', 'slotName startTime endTime');

            if (!timetable) {
                  return res.status(404).json({
                        success: false,
                        message: 'Timetable not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: timetable
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Generate timetable (Enhanced version)
// @route   POST /api/timetable/generate
// @access  Private/Admin
exports.generateTimetable = async (req, res, next) => {
      try {
            const {
                  collegeTiming,
                  subjects,
                  faculty,
                  teacherMappings,
                  branch,
                  semester,
                  section,
                  type = 'Weekly',
                  name = `Timetable - ${new Date().toLocaleDateString()}`
            } = req.body;

            // Validate input data
            if (!collegeTiming || !subjects || !faculty || !teacherMappings) {
                  return res.status(400).json({
                        success: false,
                        message: 'Missing required data: collegeTiming, subjects, faculty, and teacherMappings are required'
                  });
            }

            // Define Odd/Even semester constants
            const ODD_SEMS = [1, 3, 5, 7];
            const EVEN_SEMS = [2, 4, 6, 8];

            // Get semester type from college timing
            const semType = collegeTiming.semesterType || 'odd';
            const allowedSems = semType === 'odd' ? ODD_SEMS : EVEN_SEMS;

            // Filter subjects based on semester type
            const filteredSubjects = subjects.filter(subject =>
                  allowedSems.includes(Number(subject.semester))
            );

            // Validate that we have subjects for the selected semester type
            if (filteredSubjects.length === 0) {
                  return res.status(400).json({
                        success: false,
                        message: `No subjects found for ${semType === 'odd' ? 'Odd (1,3,5,7)' : 'Even (2,4,6,8)'} semesters. Please add subjects with the correct semester number.`
                  });
            }

            // Generate time slots based on college timing
            const slots = buildTimeSlots(collegeTiming);
            const fixedSlots = Array.isArray(req.body.fixedSlots) ? req.body.fixedSlots : await FixedSlot.find({ isActive: true });
            const teacherAvailabilities = Array.isArray(req.body.teacherAvailability) ? req.body.teacherAvailability : await TeacherAvailability.find({ isActive: true });

            // Generate timetable using deterministic scheduling algorithm
            const generatedSchedule = await generateSchedule({
                  collegeTiming,
                  subjects: filteredSubjects,
                  faculty,
                  teacherMappings,
                  fixedSlots,
                  teacherAvailabilities
            });

            const blockingConflicts = (generatedSchedule.conflicts || []).filter(conflict =>
                  ['sameSubjectSameDay', 'pairedLabMismatch', 'labDailyLimit'].includes(conflict.type)
            );
            if (blockingConflicts.length > 0) {
                  return res.status(409).json({
                        success: false,
                        message: 'Timetable could not be generated because hard scheduling conflicts remain.',
                        error: blockingConflicts[0].message || 'Hard timetable conflict detected.',
                        conflicts: blockingConflicts,
                        report: generatedSchedule.report,
                        data: generatedSchedule
                  });
            }

            const stats = generatedSchedule.stats || {
                  totalSubjects: filteredSubjects.length,
                  totalFaculty: faculty.length,
                  filledSlots: Array.isArray(generatedSchedule.slots) ? generatedSchedule.slots.length : 0,
                  conflictCount: generatedSchedule.stats?.conflictCount || 0
            };

            // Create timetable document
            const timetableData = {
                  name,
                  branch: branch || 'CSE', // Default if not provided
                  semester: semester || 3,  // Default if not provided
                  section: section || 'A',  // Default if not provided
                  type,
                  collegeTiming,
                  subjects: filteredSubjects,
                  faculty,
                  teacherMappings,
                  schedule: generatedSchedule,
                  slots: slots.map(slot => ({
                        slot: slot.id,
                        day: slot.day,
                        startTime: slot.startTime,
                        endTime: slot.endTime
                  })),
                  generatedDate: new Date(),
                  generatedBy: req.user ? req.user.id : null,
                  isPublished: false,
                  version: 1,
                  conflicts: generatedSchedule.conflicts || [],
                  stats,
                  semesterType: semType
            };

            const timetable = await Timetable.create(timetableData);

            res.status(201).json({
                  success: true,
                  message: 'Timetable generated successfully',
                  data: {
                        ...timetable.toObject(),
                        summary: {
                              totalSubjects: filteredSubjects.length,
                              totalFaculty: faculty.length,
                              totalMappings: teacherMappings.length,
                              scheduleDuration: type,
                              conflictsResolved: stats.conflictCount,
                              totalSlots: slots.length,
                              filledSlots: stats.filledSlots,
                              utilizationRate: Math.round((stats.filledSlots / slots.length) * 100),
                              semesterType: semType,
                              semesterLabel: semType === 'odd' ? 'Odd (1,3,5,7)' : 'Even (2,4,6,8)'
                        }
                  }
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Update timetable
// @route   PUT /api/timetable/:id
// @access  Private/Admin
exports.updateTimetable = async (req, res, next) => {
      try {
            const updatedSlots = req.body.schedule?.slots;
            if (Array.isArray(updatedSlots)) {
                  const conflicts = collectBlockingConflicts(updatedSlots);
                  if (conflicts.length > 0) {
                        return res.status(409).json({
                              success: false,
                              message: 'Timetable update rejected: hard conflict detected.',
                              conflicts
                        });
                  }
            }

            const timetable = await Timetable.findByIdAndUpdate(
                  req.params.id,
                  req.body,
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!timetable) {
                  return res.status(404).json({
                        success: false,
                        message: 'Timetable not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: timetable
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Delete timetable
// @route   DELETE /api/timetable/:id
// @access  Private/Admin
exports.deleteTimetable = async (req, res, next) => {
      try {
            const timetable = await Timetable.findByIdAndDelete(req.params.id);

            if (!timetable) {
                  return res.status(404).json({
                        success: false,
                        message: 'Timetable not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Timetable deleted successfully'
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Publish timetable
// @route   PUT /api/timetable/:id/publish
// @access  Private/Admin
exports.publishTimetable = async (req, res, next) => {
      try {
            const timetable = await Timetable.findByIdAndUpdate(
                  req.params.id,
                  { isPublished: true },
                  { new: true }
            );

            if (!timetable) {
                  return res.status(404).json({
                        success: false,
                        message: 'Timetable not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Timetable published successfully',
                  data: timetable
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Lock a generated slot and create a FixedSlot to preserve it
// @route   POST /api/timetables/:id/lock-slot
// @access  Private/Admin
exports.lockSlot = async (req, res, next) => {
      try {
            const timetable = await Timetable.findById(req.params.id);
            if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found' });

            const { slotId } = req.body;
            if (!slotId) return res.status(400).json({ success: false, message: 'slotId is required' });

            // The generated schedule may be in timetable.schedule.slots or timetable.slots
            const generatedSlots = (timetable.schedule && timetable.schedule.slots) ? timetable.schedule.slots : timetable.slots || [];
            const target = generatedSlots.find(s => s.id === slotId || s._id == slotId || s.slot === slotId || s.id === String(slotId));
            if (!target) return res.status(404).json({ success: false, message: 'Slot not found in timetable' });

            const FixedSlot = require('../models/FixedSlot.model');

            const fixedPayload = {
                  semester: timetable.semester,
                  branch: timetable.branch,
                  section: timetable.section,
                  scope: 'Section',
                  subjectId: target.subjectId || null,
                  subjectCode: target.subjectCode || target.subject || '',
                  subjectName: target.subjectName || target.subject || '',
                  activityName: target.subjectName || target.activityName || '',
                  activityType: target.type || 'Theory',
                  facultyId: target.facultyId || null,
                  facultyName: target.facultyName || '',
                  roomName: target.room || '',
                  day: target.day,
                  startTime: target.startTime,
                  endTime: target.endTime || '',
                  duration: target.duration || 0,
                  type: target.type || 'Theory',
                  batch: target.batch || 'NA',
                  locked: true
            };

            const fixed = await FixedSlot.create(fixedPayload);

            // Mark in timetable.schedule.slots if present
            if (timetable.schedule && timetable.schedule.slots) {
                  const s = timetable.schedule.slots.find(s => s.id === slotId || s._id == slotId || s.slot === slotId);
                  if (s) s.isLocked = true;
            }

            // Also try updating timetable.slots array if present
            if (Array.isArray(timetable.slots)) {
                  const s2 = timetable.slots.find(s => s.id === slotId || s.slot === slotId || String(s._id) === String(slotId));
                  if (s2) s2.isLocked = true;
            }

            await timetable.save();

            res.status(200).json({ success: true, data: { fixed, timetable } });
      } catch (error) {
            next(error);
      }
};