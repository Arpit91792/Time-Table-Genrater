const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const roomController = require('../controllers/room.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

// Validation rules
const roomValidation = [
      body('roomNumber').notEmpty().trim().toUpperCase(),
      body('capacity').isInt({ min: 10, max: 300 }),
      body('roomType').isIn(['Classroom', 'Lab', 'Auditorium', 'Seminar Hall', 'Conference Room'])
];

// All routes require authentication
router.use(protect);

// Public routes (for authenticated users)
router.get('/', roomController.getAllRooms);
router.get('/:id', isValidObjectId, roomController.getRoom);
router.get('/type/:roomType', roomController.getRoomsByType);

// Admin-only routes
router.post('/', authorize('admin'), roomValidation, validate, sanitize, roomController.createRoom);
router.put('/:id', authorize('admin'), isValidObjectId, roomValidation, validate, sanitize, roomController.updateRoom);
router.delete('/:id', authorize('admin'), isValidObjectId, roomController.deleteRoom);

module.exports = router;