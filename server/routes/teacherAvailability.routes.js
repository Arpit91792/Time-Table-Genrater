const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const teacherAvailabilityController = require('../controllers/teacherAvailability.controller');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

const availabilityValidation = [
      body('facultyId').notEmpty().withMessage('Faculty is required'),
      body('day').notEmpty().withMessage('Day is required').isIn(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']),
      body('startTime').notEmpty().withMessage('Start time is required').matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('endTime').notEmpty().withMessage('End time is required').matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('category').optional().isIn(['Medical','Administrative Duty','Research','Leave','Exam Duty','Meeting','Custom'])
];

router.get('/', teacherAvailabilityController.getAllTeacherAvailability);
router.get('/:id', isValidObjectId, teacherAvailabilityController.getTeacherAvailabilityById);
router.post('/', availabilityValidation, validate, sanitize, teacherAvailabilityController.createTeacherAvailability);
router.put('/:id', isValidObjectId, availabilityValidation, validate, sanitize, teacherAvailabilityController.updateTeacherAvailability);
router.delete('/:id', isValidObjectId, teacherAvailabilityController.deleteTeacherAvailability);

module.exports = router;
