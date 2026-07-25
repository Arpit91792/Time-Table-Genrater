const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const timetableController = require('../controllers/timetable.controller');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

// Validation rules for generate endpoint
const timetableGenerateValidation = [
      body('collegeTiming').exists().withMessage('College timing is required'),
      body('subjects').isArray().withMessage('Subjects must be an array'),
      body('faculty').isArray().withMessage('Faculty must be an array'),
      body('teacherMappings').isArray().withMessage('Teacher mappings must be an array')
];

// Public routes
router.get('/', timetableController.getAllTimetables);
router.get('/:id', isValidObjectId, timetableController.getTimetable);

// Timetable generation endpoint
router.post('/generate', timetableGenerateValidation, validate, sanitize, timetableController.generateTimetable);

// Other routes (would be protected in production)
router.put('/:id', isValidObjectId, timetableController.updateTimetable);
router.delete('/:id', isValidObjectId, timetableController.deleteTimetable);
router.put('/:id/publish', isValidObjectId, timetableController.publishTimetable);

module.exports = router;