const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const semesterController = require('../controllers/semester.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

// Validation rules
const semesterValidation = [
      body('semesterNumber').isInt({ min: 1, max: 8 }),
      body('branch').isMongoId(),
      body('academicYear').matches(/^\d{4}-\d{4}$/),
      body('startDate').isISO8601(),
      body('endDate').isISO8601()
];

// All routes require authentication
router.use(protect);

// Public routes (for authenticated users)
router.get('/', semesterController.getAllSemesters);
router.get('/:id', isValidObjectId, semesterController.getSemester);
router.get('/branch/:branchId', isValidObjectId, semesterController.getSemestersByBranch);

// Admin-only routes
router.post('/', authorize('admin'), semesterValidation, validate, sanitize, semesterController.createSemester);
router.put('/:id', authorize('admin'), isValidObjectId, semesterValidation, validate, sanitize, semesterController.updateSemester);
router.delete('/:id', authorize('admin'), isValidObjectId, semesterController.deleteSemester);

module.exports = router;