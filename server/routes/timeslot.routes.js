const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const timeslotController = require('../controllers/timeslot.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

// Validation rules
const timeslotValidation = [
      body('slotName').notEmpty().trim(),
      body('startTime').matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('endTime').matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('duration').isInt({ min: 30, max: 120 }),
      body('slotType').isIn(['Lecture', 'Lab', 'Break', 'Lunch'])
];

// All routes require authentication
router.use(protect);

// Public routes (for authenticated users)
router.get('/', timeslotController.getAllTimeSlots);
router.get('/:id', isValidObjectId, timeslotController.getTimeSlot);

// Admin-only routes
router.post('/', authorize('admin'), timeslotValidation, validate, sanitize, timeslotController.createTimeSlot);
router.put('/:id', authorize('admin'), isValidObjectId, timeslotValidation, validate, sanitize, timeslotController.updateTimeSlot);
router.delete('/:id', authorize('admin'), isValidObjectId, timeslotController.deleteTimeSlot);

module.exports = router;