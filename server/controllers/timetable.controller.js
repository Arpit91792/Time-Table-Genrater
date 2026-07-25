const Timetable = require('../models/Timetable.model');

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
            const slots = generateTimeSlots(collegeTiming);

            // Generate timetable using intelligent scheduling algorithm
            const generatedSchedule = generateSchedule({
                  collegeTiming,
                  subjects: filteredSubjects,
                  faculty,
                  teacherMappings,
                  slots,
                  semType
            });

            // Calculate statistics
            const stats = calculateStatistics(generatedSchedule, subjects, faculty);

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

// Helper function to generate time slots based on college timing
const generateTimeSlots = (collegeTiming) => {
      const slots = [];
      const workingDays = Object.entries(collegeTiming.workingDays)
            .filter(([day, isWorking]) => isWorking)
            .map(([day]) => day);

      const startTime = collegeTiming.startTime;
      const endTime = collegeTiming.endTime;
      const lectureDuration = collegeTiming.lectureDuration || 50;
      const practicalDuration = collegeTiming.practicalDuration || 100;

      // Convert time string to minutes since midnight
      const timeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
      };

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // Generate time slots for each working day
      let slotNumber = 1;
      for (const day of workingDays) {
            let currentTime = startMinutes;

            // Generate lecture slots (50 minutes each)
            while (currentTime + lectureDuration <= endMinutes) {
                  const slotEnd = currentTime + lectureDuration;

                  // Check if this slot overlaps with lunch break
                  const lunchStart = collegeTiming.lunchBreak.enabled ? timeToMinutes(collegeTiming.lunchBreak.startTime) : null;
                  const lunchEnd = collegeTiming.lunchBreak.enabled ? timeToMinutes(collegeTiming.lunchBreak.endTime) : null;

                  if (!(lunchStart && currentTime >= lunchStart && currentTime < lunchEnd)) {
                        slots.push({
                              id: `slot-${slotNumber}`,
                              day,
                              startTime: minutesToTime(currentTime),
                              endTime: minutesToTime(slotEnd),
                              type: 'Lecture',
                              duration: lectureDuration,
                              slotNumber: slotNumber++
                        });
                  }

                  currentTime = slotEnd;
            }
      }

      return slots;
};

// Helper function to generate schedule (simplified algorithm)
const generateSchedule = ({ collegeTiming, subjects, faculty, teacherMappings, slots, semType }) => {
      const schedule = {};
      const conflicts = [];

      // Initialize schedule for each day
      const workingDays = Object.entries(collegeTiming.workingDays)
            .filter(([day, isWorking]) => isWorking)
            .map(([day]) => day);

      workingDays.forEach(day => {
            schedule[day] = [];
      });

      // Simplified scheduling algorithm
      // In a real implementation, this would be much more sophisticated
      let mappingIndex = 0;
      for (const slot of slots) {
            if (mappingIndex >= teacherMappings.length) {
                  mappingIndex = 0; // Reset to start if we run out of mappings
            }

            const mapping = teacherMappings[mappingIndex];
            const subject = subjects.find(s => s.subjectCode === mapping.subjectCode);
            const facultyMember = faculty.find(f => f.name === mapping.facultyName);

            if (subject && facultyMember) {
                  schedule[slot.day].push({
                        time: `${slot.startTime}-${slot.endTime}`,
                        subject: subject.subjectCode,
                        subjectName: subject.subjectName,
                        faculty: facultyMember.name,
                        room: mapping.preferredRoom || 'TBD',
                        type: mapping.subjectType || 'Theory',
                        slotId: slot.id
                  });
            }

            mappingIndex++;
      }

      return {
            schedule,
            conflicts,
            generatedAt: new Date().toISOString()
      };
};

// Helper function to calculate statistics
const calculateStatistics = (generatedSchedule, subjects, faculty) => {
      const stats = {
            totalSubjects: subjects.length,
            totalFaculty: faculty.length,
            totalHours: 0,
            filledSlots: 0,
            conflictCount: 0,
            facultyWorkload: {},
            roomUtilization: {},
            subjectDistribution: {}
      };

      // Calculate filled slots and hours
      for (const day in generatedSchedule.schedule) {
            const daySlots = generatedSchedule.schedule[day];
            stats.filledSlots += daySlots.length;
            stats.totalHours += daySlots.length * 50 / 60; // Assuming 50-minute slots

            // Calculate faculty workload
            for (const slot of daySlots) {
                  if (slot.faculty) {
                        stats.facultyWorkload[slot.faculty] = (stats.facultyWorkload[slot.faculty] || 0) + 1;
                  }

                  if (slot.room) {
                        stats.roomUtilization[slot.room] = (stats.roomUtilization[slot.room] || 0) + 1;
                  }

                  if (slot.subject) {
                        stats.subjectDistribution[slot.subject] = (stats.subjectDistribution[slot.subject] || 0) + 1;
                  }
            }
      }

      stats.conflictCount = generatedSchedule.conflicts.length;

      return stats;
};

// Helper function to convert minutes back to time string
const minutesToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// @desc    Update timetable
// @route   PUT /api/timetable/:id
// @access  Private/Admin
exports.updateTimetable = async (req, res, next) => {
      try {
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