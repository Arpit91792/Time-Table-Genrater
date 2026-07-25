const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const subjectController = require('../controllers/subject.controller');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

// Validation rules aligned with UI fields
const subjectValidation = [
      body('subjectCode').notEmpty().withMessage('Subject code is required').trim().toUpperCase(),
      body('subjectName').notEmpty().withMessage('Subject name is required').trim(),
      body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
      body('branch').notEmpty().withMessage('Branch is required').trim().toUpperCase(),
      body('section').optional().trim().toUpperCase(),
      body('theoryOrLab').optional().isIn(['Theory', 'Lab', 'Both']),
      body('hoursPerWeek').optional().isInt({ min: 1, max: 20 }),
      body('credits').optional().isInt({ min: 1, max: 5 })
];

const subjectUpdateValidation = [
      body('subjectCode').optional().notEmpty().trim().toUpperCase(),
      body('subjectName').optional().notEmpty().trim(),
      body('semester').optional().isInt({ min: 1, max: 8 }),
      body('branch').optional().notEmpty().trim().toUpperCase(),
      body('section').optional().trim().toUpperCase(),
      body('theoryOrLab').optional().isIn(['Theory', 'Lab', 'Both']),
      body('hoursPerWeek').optional().isInt({ min: 1, max: 20 }),
      body('credits').optional().isInt({ min: 1, max: 5 })
];

// All subject routes are public (same pattern as faculty — no JWT required)
router.get('/', subjectController.getAllSubjects);
router.get('/branch/:branch/semester/:semester', subjectController.getSubjectsByBranchAndSemester);
router.get('/:id', isValidObjectId, subjectController.getSubject);

router.post('/', subjectValidation, validate, sanitize, subjectController.createSubject);
router.put('/:id', isValidObjectId, subjectUpdateValidation, validate, sanitize, subjectController.updateSubject);
router.delete('/:id', isValidObjectId, subjectController.deleteSubject);
router.put('/:id/assign-faculty', isValidObjectId, subjectController.assignFacultyToSubject);

module.exports = router;
