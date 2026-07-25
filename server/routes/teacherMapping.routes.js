const express = require('express');
const router = express.Router();
const teacherMappingController = require('../controllers/teacherMapping.controller');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

// Apply validation middleware for all routes
router.use(sanitize);

// Get all teacher mappings with pagination and search
router.get('/', teacherMappingController.getAllTeacherMappings);

// Get filtered teacher mappings
router.get('/filter', teacherMappingController.getFilteredTeacherMappings);

// Get faculty load summary
router.get('/load-summary', teacherMappingController.getFacultyLoadSummary);

// Get single teacher mapping
router.get('/:id', isValidObjectId, teacherMappingController.getTeacherMapping);

// Create new teacher mapping
router.post('/',
      teacherMappingController.validateTeacherMapping,
      validate,
      teacherMappingController.createTeacherMapping
);

// Bulk import teacher mappings from Excel
router.post('/import', teacherMappingController.importTeacherMappings);

// Update teacher mapping
router.put('/:id',
      isValidObjectId,
      teacherMappingController.validateTeacherMapping,
      validate,
      teacherMappingController.updateTeacherMapping
);

// Delete teacher mapping
router.delete('/:id', isValidObjectId, teacherMappingController.deleteTeacherMapping);

// Export for testing
module.exports = router;