const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const fixedSlotController = require('../controllers/fixedSlot.controller');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

const fixedSlotValidation = [
      body('day').notEmpty().withMessage('Day is required').isIn(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']),
      body('startTime').notEmpty().withMessage('Start time is required').matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('endTime').notEmpty().withMessage('End time is required').matches(/^([01]?\d|2[0-3]):([0-5]\d)$/),
      body('type').notEmpty().withMessage('Type is required').isIn(['Theory','Practical','Activity','Library','Sports','Seminar','Placement','Mentoring','Custom']),
      body('locked').optional().isBoolean()
];

router.get('/', fixedSlotController.getAllFixedSlots);
router.get('/:id', isValidObjectId, fixedSlotController.getFixedSlot);
router.post('/', fixedSlotValidation, validate, sanitize, fixedSlotController.createFixedSlot);
router.put('/:id', isValidObjectId, fixedSlotValidation, validate, sanitize, fixedSlotController.updateFixedSlot);
router.delete('/:id', isValidObjectId, fixedSlotController.deleteFixedSlot);

module.exports = router;
