const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const sectionController = require('../controllers/section.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

// Validation rules
const sectionValidation = [
      body('sectionName').notEmpty().trim().toUpperCase(),
      body('semester').isMongoId(),
      body('branch').isMongoId(),
      body('capacity').isInt({ min: 10, max: 120 })
];

// Bulk section creation validation
const bulkSectionValidation = [
      body('semester').isMongoId(),
      body('branch').isMongoId(),
      body('startLetter').optional().isString().isLength({ min: 1, max: 1 }).matches(/^[A-Z]$/),
      body('endLetter').optional().isString().isLength({ min: 1, max: 1 }).matches(/^[A-Z]$/),
      body('capacity').isInt({ min: 10, max: 120 }),
      body('sections').optional().isArray()
];

// All routes require authentication
router.use(protect);

// Public routes (for authenticated users)
router.get('/', sectionController.getAllSections);
router.get('/:id', isValidObjectId, sectionController.getSection);

// Admin-only routes
router.post('/', authorize('admin'), sectionValidation, validate, sanitize, sectionController.createSection);
router.post('/bulk', authorize('admin'), bulkSectionValidation, validate, sanitize, sectionController.createBulkSections);
router.put('/:id', authorize('admin'), isValidObjectId, sectionValidation, validate, sanitize, sectionController.updateSection);
router.delete('/:id', authorize('admin'), isValidObjectId, sectionController.deleteSection);

module.exports = router;