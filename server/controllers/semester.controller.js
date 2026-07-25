const Semester = require('../models/Semester.model');

// @desc    Get all semesters
// @route   GET /api/semesters
// @access  Private
exports.getAllSemesters = async (req, res, next) => {
      try {
            const semesters = await Semester.find({ isActive: true })
                  .populate('branch', 'branchName branchCode');

            res.status(200).json({
                  success: true,
                  count: semesters.length,
                  data: semesters
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get single semester
// @route   GET /api/semesters/:id
// @access  Private
exports.getSemester = async (req, res, next) => {
      try {
            const semester = await Semester.findById(req.params.id)
                  .populate('branch', 'branchName branchCode');

            if (!semester) {
                  return res.status(404).json({
                        success: false,
                        message: 'Semester not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: semester
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create semester
// @route   POST /api/semesters
// @access  Private/Admin
exports.createSemester = async (req, res, next) => {
      try {
            const semester = await Semester.create(req.body);

            res.status(201).json({
                  success: true,
                  data: semester
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Update semester
// @route   PUT /api/semesters/:id
// @access  Private/Admin
exports.updateSemester = async (req, res, next) => {
      try {
            const semester = await Semester.findByIdAndUpdate(
                  req.params.id,
                  req.body,
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!semester) {
                  return res.status(404).json({
                        success: false,
                        message: 'Semester not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: semester
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Delete semester
// @route   DELETE /api/semesters/:id
// @access  Private/Admin
exports.deleteSemester = async (req, res, next) => {
      try {
            const semester = await Semester.findByIdAndUpdate(
                  req.params.id,
                  { isActive: false },
                  { new: true }
            );

            if (!semester) {
                  return res.status(404).json({
                        success: false,
                        message: 'Semester not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Semester deactivated successfully'
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get semesters by branch
// @route   GET /api/semesters/branch/:branchId
// @access  Private
exports.getSemestersByBranch = async (req, res, next) => {
      try {
            const semesters = await Semester.find({
                  branch: req.params.branchId,
                  isActive: true
            }).populate('branch', 'branchName branchCode');

            res.status(200).json({
                  success: true,
                  count: semesters.length,
                  data: semesters
            });
      } catch (error) {
            next(error);
      }
};