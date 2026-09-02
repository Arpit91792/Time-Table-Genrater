const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const facultyController = require('../controllers/faculty.controller');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

const DESIGNATIONS = [
      'Professor',
      'Associate Professor',
      'Assistant Professor',
      'Lecturer',
      'Visiting Faculty',
      'Guest Faculty',
      'HOD',
      'Dean'
];

const facultyCreateValidation = [
      body('name').notEmpty().withMessage('Name is required').trim(),
      body('designation').optional().isIn(DESIGNATIONS),
      body('department').optional().trim(),
      body('inTime').optional().matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('outTime').optional().matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('facultyId').optional().trim(),
      body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
      body('phone').optional({ checkFalsy: true }).trim(),
      body('remarks').optional().trim()
];

const facultyUpdateValidation = [
      body('name').optional().notEmpty().trim(),
      body('designation').optional().isIn(DESIGNATIONS),
      body('department').optional().trim(),
      body('inTime').optional().matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('outTime').optional().matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('facultyId').optional().trim(),
      body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
      body('phone').optional({ checkFalsy: true }).trim(),
      body('remarks').optional().trim()
];

router.get('/department/:department', facultyController.getFacultyByDepartment);
router.get('/:id', isValidObjectId, facultyController.getFaculty);
router.get('/', facultyController.getAllFaculty);

router.post('/', facultyCreateValidation, validate, sanitize, facultyController.createFaculty);
router.put('/:id', isValidObjectId, facultyUpdateValidation, validate, sanitize, facultyController.updateFaculty);
router.delete('/:id', isValidObjectId, facultyController.deleteFaculty);
router.put('/:id/availability', isValidObjectId, facultyController.updateAvailability);
router.post('/:id/lock-time', isValidObjectId, facultyController.lockTime);

module.exports = router;
