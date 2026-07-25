const Subject = require('../models/Subject.model');

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Public
exports.getAllSubjects = async (req, res, next) => {
      try {
            // Remove legacy documents that used ObjectId refs (old schema) — they are incompatible
            await Subject.deleteMany({
                  $or: [
                        { branch: { $type: 'objectId' } },
                        { semester: { $type: 'objectId' } }
                  ]
            });

            const subjects = await Subject.find({ isActive: true })
                  .populate('assignedFaculty', 'name designation')
                  .populate('prerequisites', 'subjectName subjectCode')
                  .sort({ createdAt: -1 });

            res.status(200).json({
                  success: true,
                  count: subjects.length,
                  data: subjects
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Public
exports.getSubject = async (req, res, next) => {
      try {
            const subject = await Subject.findById(req.params.id)
                  .populate('assignedFaculty', 'name designation')
                  .populate('prerequisites', 'subjectName subjectCode');

            if (!subject || !subject.isActive) {
                  return res.status(404).json({
                        success: false,
                        message: 'Subject not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: subject
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create subject
// @route   POST /api/subjects
// @access  Public
exports.createSubject = async (req, res, next) => {
      try {
            // Validate required fields
            if (!req.body.subjectCode || !req.body.subjectName) {
                  return res.status(400).json({
                        success: false,
                        message: 'Subject code and subject name are required'
                  });
            }

            const payload = {
                  subjectCode: req.body.subjectCode,
                  subjectName: req.body.subjectName,
                  semester: Number(req.body.semester) || 3,
                  branch: req.body.branch || 'CSE',
                  section: req.body.section || 'A',
                  theoryOrLab: req.body.theoryOrLab || req.body.subjectType || 'Theory',
                  hoursPerWeek: req.body.hoursPerWeek || 3,
                  credits: req.body.credits || 3,
                  lecturesRequired: req.body.lecturesRequired || 0,
                  practicalRequired: req.body.practicalRequired || 0,
                  description: req.body.description || ''
            };

            const subject = await Subject.create(payload);

            res.status(201).json({
                  success: true,
                  data: subject
            });
      } catch (error) {
            if (error.code === 11000) {
                  return res.status(400).json({
                        success: false,
                        message: 'Subject code already exists'
                  });
            }
            next(error);
      }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Public
exports.updateSubject = async (req, res, next) => {
      try {
            const updates = { ...req.body };

            if (updates.semester !== undefined) {
                  updates.semester = Number(updates.semester);
            }
            if (updates.subjectType && !updates.theoryOrLab) {
                  updates.theoryOrLab = updates.subjectType;
            }

            const subject = await Subject.findOneAndUpdate(
                  { _id: req.params.id, isActive: true },
                  updates,
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!subject) {
                  return res.status(404).json({
                        success: false,
                        message: 'Subject not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: subject
            });
      } catch (error) {
            if (error.code === 11000) {
                  return res.status(400).json({
                        success: false,
                        message: 'Subject code already exists'
                  });
            }
            next(error);
      }
};

// @desc    Delete subject permanently from MongoDB
// @route   DELETE /api/subjects/:id
// @access  Public
exports.deleteSubject = async (req, res, next) => {
      try {
            const subject = await Subject.findByIdAndDelete(req.params.id);

            if (!subject) {
                  return res.status(404).json({
                        success: false,
                        message: 'Subject not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Subject deleted successfully',
                  data: { _id: subject._id }
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get subjects by branch and semester
// @route   GET /api/subjects/branch/:branch/semester/:semester
// @access  Public
exports.getSubjectsByBranchAndSemester = async (req, res, next) => {
      try {
            const subjects = await Subject.find({
                  branch: req.params.branch.toUpperCase(),
                  semester: Number(req.params.semester),
                  isActive: true
            }).populate('assignedFaculty', 'name designation');

            res.status(200).json({
                  success: true,
                  count: subjects.length,
                  data: subjects
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Assign faculty to subject
// @route   PUT /api/subjects/:id/assign-faculty
// @access  Public
exports.assignFacultyToSubject = async (req, res, next) => {
      try {
            const { facultyId } = req.body;

            const subject = await Subject.findById(req.params.id);

            if (!subject || !subject.isActive) {
                  return res.status(404).json({
                        success: false,
                        message: 'Subject not found'
                  });
            }

            if (!subject.assignedFaculty.includes(facultyId)) {
                  subject.assignedFaculty.push(facultyId);
                  await subject.save();
            }

            res.status(200).json({
                  success: true,
                  data: subject
            });
      } catch (error) {
            next(error);
      }
};
