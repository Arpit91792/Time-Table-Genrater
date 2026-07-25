const TeacherMapping = require('../models/TeacherMapping.model');
const Faculty = require('../models/Faculty.model');
const Subject = require('../models/Subject.model');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation rules for teacher mapping
const validateTeacherMapping = [
      body('facultyId').isMongoId().withMessage('Valid Faculty ID is required'),
      body('subjectId').isMongoId().withMessage('Valid Subject ID is required'),
      body('subjectCode').notEmpty().trim().withMessage('Subject code is required'),
      body('semester').isMongoId().withMessage('Valid Semester ID is required'),
      body('branch').isMongoId().withMessage('Valid Branch ID is required'),
      body('section').isMongoId().withMessage('Valid Section ID is required'),
      body('subjectType').isIn(['Theory', 'Practical', 'Tutorial', 'Lab', 'Project']).withMessage('Valid subject type is required'),
      body('lectureHoursPerWeek').isInt({ min: 0 }).withMessage('Lecture hours must be a non-negative integer'),
      body('practicalHoursPerWeek').isInt({ min: 0 }).withMessage('Practical hours must be a non-negative integer'),
      body('classesPerWeek').isInt({ min: 1 }).withMessage('Classes per week must be at least 1'),
      body('facultyMaxLoad').isInt({ min: 1 }).withMessage('Faculty maximum load must be at least 1'),
      body('currentAssignedLoad').isInt({ min: 0 }).withMessage('Current assigned load must be non-negative'),
      body('maxConsecutiveLectures').optional().isInt({ min: 1, max: 8 }).withMessage('Max consecutive lectures must be between 1-8'),
      body('priority').optional().isIn(['High', 'Medium', 'Low']).withMessage('Priority must be High, Medium, or Low'),
      body('status').optional().isIn(['Active', 'Inactive', 'Tentative', 'Confirmed']).withMessage('Valid status is required')
];

// @desc    Get all teacher mappings
// @route   GET /api/teacher-mapping
// @access  Public
const getAllTeacherMappings = asyncHandler(async (req, res) => {
      const {
            page = 1,
            limit = 50,
            search = '',
            facultyId,
            subjectId,
            semester,
            branch,
            section,
            status,
            priority,
            sortBy = 'createdAt',
            sortOrder = -1
      } = req.query;

      const query = {};

      // Search functionality
      if (search) {
            query.$or = [
                  { subjectCode: { $regex: search, $options: 'i' } },
                  { 'facultyData.name': { $regex: search, $options: 'i' } },
                  { 'facultyData.facultyId': { $regex: search, $options: 'i' } },
                  { 'subjectData.subjectName': { $regex: search, $options: 'i' } },
                  { remarks: { $regex: search, $options: 'i' } }
            ];
      }

      // Filter functionality
      if (facultyId && mongoose.Types.ObjectId.isValid(facultyId)) {
            query.facultyId = mongoose.Types.ObjectId(facultyId);
      }
      if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
            query.subjectId = mongoose.Types.ObjectId(subjectId);
      }
      if (semester && mongoose.Types.ObjectId.isValid(semester)) {
            query.semester = mongoose.Types.ObjectId(semester);
      }
      if (branch && mongoose.Types.ObjectId.isValid(branch)) {
            query.branch = mongoose.Types.ObjectId(branch);
      }
      if (section && mongoose.Types.ObjectId.isValid(section)) {
            query.section = mongoose.Types.ObjectId(section);
      }
      if (status) {
            query.status = status;
      }
      if (priority) {
            query.priority = priority;
      }

      try {
            const teacherMappings = await TeacherMapping.find(query)
                  .populate('facultyId', 'facultyId name designation department email phone')
                  .populate('subjectId', 'subjectCode subjectName credits theoryOrLab hoursPerWeek')
                  .populate('semester', 'name academicYear')
                  .populate('branch', 'name code')
                  .populate('section', 'name')
                  .populate('preferredRoom', 'roomNumber roomType capacity')
                  .populate('preferredLab', 'roomNumber roomType capacity')
                  .populate('preferredTimeSlots', 'startTime endTime day')
                  .populate('unavailableTimeSlots', 'startTime endTime day')
                  .sort({ [sortBy]: parseInt(sortOrder) })
                  .skip((page - 1) * parseInt(limit))
                  .limit(parseInt(limit));

            const total = await TeacherMapping.countDocuments(query);

            res.status(200).json({
                  success: true,
                  count: teacherMappings.length,
                  total,
                  totalPages: Math.ceil(total / parseInt(limit)),
                  currentPage: parseInt(page),
                  data: teacherMappings
            });
      } catch (error) {
            res.status(500).json({
                  success: false,
                  message: 'Error fetching teacher mappings',
                  error: error.message
            });
      }
});

// @desc    Get single teacher mapping
// @route   GET /api/teacher-mapping/:id
// @access  Public
const getTeacherMapping = asyncHandler(async (req, res) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                  success: false,
                  message: 'Invalid teacher mapping ID'
            });
      }

      const teacherMapping = await TeacherMapping.findById(req.params.id)
            .populate('facultyId', 'facultyId name designation department email phone maxClassesPerDay maxClassesPerWeek')
            .populate('subjectId', 'subjectCode subjectName credits theoryOrLab hoursPerWeek')
            .populate('semester', 'name academicYear')
            .populate('branch', 'name code')
            .populate('section', 'name')
            .populate('preferredRoom', 'roomNumber roomType capacity')
            .populate('preferredLab', 'roomNumber roomType capacity')
            .populate('preferredTimeSlots', 'startTime endTime day')
            .populate('unavailableTimeSlots', 'startTime endTime day');

      if (!teacherMapping) {
            return res.status(404).json({
                  success: false,
                  message: 'Teacher mapping not found'
            });
      }

      res.status(200).json({
            success: true,
            data: teacherMapping
      });
});

// @desc    Create new teacher mapping
// @route   POST /api/teacher-mapping
// @access  Public
const createTeacherMapping = asyncHandler(async (req, res) => {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
            return res.status(400).json({
                  success: false,
                  errors: errors.array()
            });
      }

      const {
            facultyId,
            subjectId,
            subjectCode,
            semester,
            branch,
            section,
            batch = 'NA',
            subjectType,
            lectureHoursPerWeek = 0,
            practicalHoursPerWeek = 0,
            classesPerWeek,
            facultyMaxLoad,
            currentAssignedLoad = 0,
            preferredDays = [],
            unavailableDays = [],
            preferredTimeSlots = [],
            unavailableTimeSlots = [],
            preferredRoom,
            preferredLab,
            maxConsecutiveLectures = 3,
            priority = 'Medium',
            status = 'Active',
            remarks = ''
      } = req.body;

      try {
            // Check for duplicate mapping
            const duplicate = await TeacherMapping.checkDuplicate(facultyId, subjectId, semester, section);
            if (duplicate) {
                  return res.status(409).json({
                        success: false,
                        message: 'Teacher mapping already exists for this faculty, subject, semester, and section'
                  });
            }

            // Get faculty and subject details for validation
            const faculty = await Faculty.findById(facultyId);
            const subject = await Subject.findById(subjectId);

            if (!faculty) {
                  return res.status(404).json({
                        success: false,
                        message: 'Faculty not found'
                  });
            }

            if (!subject) {
                  return res.status(404).json({
                        success: false,
                        message: 'Subject not found'
                  });
            }

            // Validate faculty load
            const facultyTotalLoad = await TeacherMapping.getFacultyTotalLoad(facultyId, semester);
            if (currentAssignedLoad + facultyTotalLoad > facultyMaxLoad) {
                  return res.status(400).json({
                        success: false,
                        message: `Cannot assign load. Current faculty load: ${facultyTotalLoad}, New load: ${currentAssignedLoad}, Max load: ${facultyMaxLoad}`
                  });
            }

            // Check for conflicts in preferred vs unavailable
            const conflictWarnings = [];

            // Check day conflicts
            const dayConflicts = preferredDays.filter(day => unavailableDays.includes(day));
            if (dayConflicts.length > 0) {
                  conflictWarnings.push(`Conflict in preferred/unavailable days: ${dayConflicts.join(', ')}`);
            }

            // Check if subject already assigned to another faculty in same section
            const existingSubjectAssignment = await TeacherMapping.findOne({
                  subjectId,
                  semester,
                  section,
                  status: { $in: ['Active', 'Confirmed'] },
                  facultyId: { $ne: facultyId }
            });

            if (existingSubjectAssignment) {
                  conflictWarnings.push(`Subject already assigned to another faculty in this section`);
            }

            // Create the teacher mapping
            const teacherMapping = await TeacherMapping.create({
                  facultyId,
                  subjectId,
                  subjectCode,
                  semester,
                  branch,
                  section,
                  batch,
                  subjectType,
                  lectureHoursPerWeek,
                  practicalHoursPerWeek,
                  classesPerWeek,
                  facultyMaxLoad,
                  currentAssignedLoad,
                  preferredDays,
                  unavailableDays,
                  preferredTimeSlots,
                  unavailableTimeSlots,
                  preferredRoom,
                  preferredLab,
                  maxConsecutiveLectures,
                  priority,
                  status,
                  remarks,
                  hasConflicts: conflictWarnings.length > 0,
                  conflictDetails: conflictWarnings.join('; '),
                  validationWarnings: conflictWarnings
            });

            res.status(201).json({
                  success: true,
                  message: 'Teacher mapping created successfully',
                  data: teacherMapping
            });
      } catch (error) {
            res.status(500).json({
                  success: false,
                  message: 'Error creating teacher mapping',
                  error: error.message
            });
      }
});

// @desc    Update teacher mapping
// @route   PUT /api/teacher-mapping/:id
// @access  Public
const updateTeacherMapping = asyncHandler(async (req, res) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                  success: false,
                  message: 'Invalid teacher mapping ID'
            });
      }

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
            return res.status(400).json({
                  success: false,
                  errors: errors.array()
            });
      }

      const teacherMapping = await TeacherMapping.findById(req.params.id);
      if (!teacherMapping) {
            return res.status(404).json({
                  success: false,
                  message: 'Teacher mapping not found'
            });
      }

      try {
            // Check for duplicate mapping (excluding current one)
            const duplicate = await TeacherMapping.findOne({
                  facultyId: req.body.facultyId || teacherMapping.facultyId,
                  subjectId: req.body.subjectId || teacherMapping.subjectId,
                  semester: req.body.semester || teacherMapping.semester,
                  section: req.body.section || teacherMapping.section,
                  _id: { $ne: req.params.id }
            });

            if (duplicate) {
                  return res.status(409).json({
                        success: false,
                        message: 'Teacher mapping already exists for this faculty, subject, semester, and section'
                  });
            }

            // Validate faculty load if currentAssignedLoad is being updated
            if (req.body.currentAssignedLoad !== undefined) {
                  const currentLoad = teacherMapping.currentAssignedLoad;
                  const newLoad = req.body.currentAssignedLoad;

                  if (newLoad !== currentLoad) {
                        const facultyTotalLoad = await TeacherMapping.getFacultyTotalLoad(
                              req.body.facultyId || teacherMapping.facultyId,
                              req.body.semester || teacherMapping.semester
                        );

                        const facultyMaxLoad = req.body.facultyMaxLoad || teacherMapping.facultyMaxLoad;
                        const loadWithoutCurrent = facultyTotalLoad - currentLoad;

                        if (loadWithoutCurrent + newLoad > facultyMaxLoad) {
                              return res.status(400).json({
                                    success: false,
                                    message: `Cannot update load. Current faculty load (excluding this): ${loadWithoutCurrent}, New load: ${newLoad}, Max load: ${facultyMaxLoad}`
                              });
                        }
                  }
            }

            // Update the teacher mapping
            const updatedMapping = await TeacherMapping.findByIdAndUpdate(
                  req.params.id,
                  req.body,
                  { new: true, runValidators: true }
            )
                  .populate('facultyId', 'facultyId name designation department email phone')
                  .populate('subjectId', 'subjectCode subjectName credits theoryOrLab hoursPerWeek');

            res.status(200).json({
                  success: true,
                  message: 'Teacher mapping updated successfully',
                  data: updatedMapping
            });
      } catch (error) {
            res.status(500).json({
                  success: false,
                  message: 'Error updating teacher mapping',
                  error: error.message
            });
      }
});

// @desc    Delete teacher mapping
// @route   DELETE /api/teacher-mapping/:id
// @access  Public
const deleteTeacherMapping = asyncHandler(async (req, res) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                  success: false,
                  message: 'Invalid teacher mapping ID'
            });
      }

      const teacherMapping = await TeacherMapping.findById(req.params.id);
      if (!teacherMapping) {
            return res.status(404).json({
                  success: false,
                  message: 'Teacher mapping not found'
            });
      }

      try {
            await teacherMapping.deleteOne();

            res.status(200).json({
                  success: true,
                  message: 'Teacher mapping deleted successfully'
            });
      } catch (error) {
            res.status(500).json({
                  success: false,
                  message: 'Error deleting teacher mapping',
                  error: error.message
            });
      }
});

// @desc    Bulk import teacher mappings from Excel
// @route   POST /api/teacher-mapping/import
// @access  Public
const importTeacherMappings = asyncHandler(async (req, res) => {
      const { mappings } = req.body;

      if (!Array.isArray(mappings) || mappings.length === 0) {
            return res.status(400).json({
                  success: false,
                  message: 'Mappings array is required'
            });
      }

      const results = {
            success: [],
            failed: [],
            total: mappings.length
      };

      for (const mapping of mappings) {
            try {
                  // Validate required fields
                  if (!mapping.facultyId || !mapping.subjectId || !mapping.semester || !mapping.section) {
                        results.failed.push({
                              mapping,
                              error: 'Missing required fields'
                        });
                        continue;
                  }

                  // Check for duplicate
                  const duplicate = await TeacherMapping.checkDuplicate(
                        mapping.facultyId,
                        mapping.subjectId,
                        mapping.semester,
                        mapping.section
                  );

                  if (duplicate) {
                        results.failed.push({
                              mapping,
                              error: 'Duplicate mapping exists'
                        });
                        continue;
                  }

                  // Create mapping
                  const newMapping = await TeacherMapping.create(mapping);
                  results.success.push(newMapping);

            } catch (error) {
                  results.failed.push({
                        mapping,
                        error: error.message
                  });
            }
      }

      res.status(200).json({
            success: true,
            message: `Import completed: ${results.success.length} successful, ${results.failed.length} failed`,
            results
      });
});

// @desc    Get teacher mappings with filters
// @route   GET /api/teacher-mapping/filter
// @access  Public
const getFilteredTeacherMappings = asyncHandler(async (req, res) => {
      const {
            facultyIds,
            subjectIds,
            semesterIds,
            branchIds,
            sectionIds,
            subjectTypes,
            priorities,
            statuses,
            batch
      } = req.query;

      const query = {};

      // Handle array filters
      if (facultyIds) {
            const ids = facultyIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) {
                  query.facultyId = { $in: ids.map(id => mongoose.Types.ObjectId(id)) };
            }
      }

      if (subjectIds) {
            const ids = subjectIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) {
                  query.subjectId = { $in: ids.map(id => mongoose.Types.ObjectId(id)) };
            }
      }

      if (semesterIds) {
            const ids = semesterIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) {
                  query.semester = { $in: ids.map(id => mongoose.Types.ObjectId(id)) };
            }
      }

      if (branchIds) {
            const ids = branchIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) {
                  query.branch = { $in: ids.map(id => mongoose.Types.ObjectId(id)) };
            }
      }

      if (sectionIds) {
            const ids = sectionIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) {
                  query.section = { $in: ids.map(id => mongoose.Types.ObjectId(id)) };
            }
      }

      if (subjectTypes) {
            const types = subjectTypes.split(',');
            query.subjectType = { $in: types };
      }

      if (priorities) {
            const priorityList = priorities.split(',');
            query.priority = { $in: priorityList };
      }

      if (statuses) {
            const statusList = statuses.split(',');
            query.status = { $in: statusList };
      }

      if (batch) {
            query.batch = batch;
      }

      try {
            const teacherMappings = await TeacherMapping.find(query)
                  .populate('facultyId', 'facultyId name designation department')
                  .populate('subjectId', 'subjectCode subjectName')
                  .populate('semester', 'name')
                  .populate('branch', 'name')
                  .populate('section', 'name')
                  .sort({ priority: 1, createdAt: -1 });

            res.status(200).json({
                  success: true,
                  count: teacherMappings.length,
                  data: teacherMappings
            });
      } catch (error) {
            res.status(500).json({
                  success: false,
                  message: 'Error filtering teacher mappings',
                  error: error.message
            });
      }
});

// @desc    Get faculty load summary
// @route   GET /api/teacher-mapping/load-summary
// @access  Public
const getFacultyLoadSummary = asyncHandler(async (req, res) => {
      const { semester, branch } = req.query;

      const query = {};
      if (semester && mongoose.Types.ObjectId.isValid(semester)) {
            query.semester = mongoose.Types.ObjectId(semester);
      }
      if (branch && mongoose.Types.ObjectId.isValid(branch)) {
            query.branch = mongoose.Types.ObjectId(branch);
      }

      try {
            const loadSummary = await TeacherMapping.aggregate([
                  { $match: query },
                  {
                        $group: {
                              _id: '$facultyId',
                              totalAssignedLoad: { $sum: '$currentAssignedLoad' },
                              totalMappings: { $sum: 1 },
                              facultyMaxLoad: { $first: '$facultyMaxLoad' }
                        }
                  },
                  {
                        $lookup: {
                              from: 'faculties',
                              localField: '_id',
                              foreignField: '_id',
                              as: 'faculty'
                        }
                  },
                  { $unwind: '$faculty' },
                  {
                        $project: {
                              facultyId: '$_id',
                              facultyName: '$faculty.name',
                              facultyDepartment: '$faculty.department',
                              facultyDesignation: '$faculty.designation',
                              totalAssignedLoad: 1,
                              totalMappings: 1,
                              facultyMaxLoad: 1,
                              remainingLoad: { $subtract: ['$facultyMaxLoad', '$totalAssignedLoad'] },
                              loadPercentage: {
                                    $multiply: [
                                          { $divide: ['$totalAssignedLoad', '$facultyMaxLoad'] },
                                          100
                                    ]
                              }
                        }
                  },
                  { $sort: { loadPercentage: -1 } }
            ]);

            res.status(200).json({
                  success: true,
                  count: loadSummary.length,
                  data: loadSummary
            });
      } catch (error) {
            res.status(500).json({
                  success: false,
                  message: 'Error fetching faculty load summary',
                  error: error.message
            });
      }
});

module.exports = {
      getAllTeacherMappings,
      getTeacherMapping,
      createTeacherMapping,
      updateTeacherMapping,
      deleteTeacherMapping,
      importTeacherMappings,
      getFilteredTeacherMappings,
      getFacultyLoadSummary,
      validateTeacherMapping
};