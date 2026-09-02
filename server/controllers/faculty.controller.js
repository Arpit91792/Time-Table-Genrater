const Faculty = require('../models/Faculty.model');

// @desc    Get all faculty
// @route   GET /api/faculty
// @access  Private/Admin
exports.getAllFaculty = async (req, res, next) => {
      try {
            const faculty = await Faculty.find({ isActive: { $ne: false } })
                  .populate('preferredSubjects', 'subjectName subjectCode')
                  .populate('unavailableSlots.slot', 'slotName startTime endTime')
                  .sort({ createdAt: -1 });

            res.status(200).json({
                  success: true,
                  count: faculty.length,
                  data: faculty
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get single faculty
// @route   GET /api/faculty/:id
// @access  Private
exports.getFaculty = async (req, res, next) => {
      try {
            const faculty = await Faculty.findById(req.params.id)
                  .populate('preferredSubjects', 'subjectName subjectCode')
                  .populate('unavailableSlots.slot', 'slotName startTime endTime');

            if (!faculty) {
                  return res.status(404).json({
                        success: false,
                        message: 'Faculty not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: faculty
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create faculty
// @route   POST /api/faculty
// @access  Public
exports.createFaculty = async (req, res, next) => {
      try {
            const stamp = Date.now().toString(36).toUpperCase();
            const facultyId = (req.body.facultyId || `FAC${stamp}`).toUpperCase();

            const payload = {
                  facultyId,
                  name: req.body.name,
                  designation: req.body.designation || 'Assistant Professor',
                  department: req.body.department || 'CSE',
                  email: req.body.email || `${facultyId.toLowerCase()}@college.local`,
                  phone: req.body.phone || '0000000000',
                  inTime: req.body.inTime || '09:00',
                  outTime: req.body.outTime || '17:00',
                  remarks: req.body.remarks || '',
                  maxClassesPerDay: req.body.maxClassesPerDay || 4,
                  maxClassesPerWeek: req.body.maxClassesPerWeek || 20
            };

            const faculty = await Faculty.create(payload);

            res.status(201).json({
                  success: true,
                  data: faculty
            });
      } catch (error) {
            if (error.code === 11000) {
                  return res.status(400).json({
                        success: false,
                        message: 'Faculty ID or email already exists'
                  });
            }
            next(error);
      }
};

// @desc    Update faculty
// @route   PUT /api/faculty/:id
// @access  Private/Admin
exports.updateFaculty = async (req, res, next) => {
      try {
            const faculty = await Faculty.findByIdAndUpdate(
                  req.params.id,
                  req.body,
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!faculty) {
                  return res.status(404).json({
                        success: false,
                        message: 'Faculty not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: faculty
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Delete faculty
// @route   DELETE /api/faculty/:id
// @access  Private/Admin
exports.deleteFaculty = async (req, res, next) => {
      try {
            const faculty = await Faculty.findByIdAndDelete(req.params.id);

            if (!faculty) {
                  return res.status(404).json({
                        success: false,
                        message: 'Faculty not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Faculty deleted successfully'
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get faculty by department
// @route   GET /api/faculty/department/:department
// @access  Private
exports.getFacultyByDepartment = async (req, res, next) => {
      try {
            const faculty = await Faculty.find({
                  department: req.params.department,
                  isActive: true
            });

            res.status(200).json({
                  success: true,
                  count: faculty.length,
                  data: faculty
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Update faculty availability
// @route   PUT /api/faculty/:id/availability
// @access  Private/Faculty
exports.updateAvailability = async (req, res, next) => {
      try {
            const { unavailableSlots } = req.body;

            const faculty = await Faculty.findByIdAndUpdate(
                  req.params.id,
                  { unavailableSlots },
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!faculty) {
                  return res.status(404).json({
                        success: false,
                        message: 'Faculty not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: faculty
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Lock a time range for faculty (creates a TeacherAvailability record)
// @route   POST /api/faculty/:id/lock-time
// @access  Private/Faculty
exports.lockTime = async (req, res, next) => {
      try {
            const TeacherAvailability = require('../models/TeacherAvailability.model');
            const faculty = await Faculty.findById(req.params.id);
            if (!faculty) {
                  return res.status(404).json({ success: false, message: 'Faculty not found' });
            }

            const { day, startTime, endTime, reason, category } = req.body;
            if (!day || !startTime || !endTime) {
                  return res.status(400).json({ success: false, message: 'day, startTime and endTime are required' });
            }

            const payload = {
                  facultyId: faculty._id,
                  facultyName: faculty.name,
                  day,
                  startTime,
                  endTime,
                  reason: reason || 'Locked by admin',
                  category: category || 'Administrative Duty'
            };

            const rec = await TeacherAvailability.create(payload);

            res.status(201).json({ success: true, data: rec });
      } catch (error) {
            next(error);
      }
};