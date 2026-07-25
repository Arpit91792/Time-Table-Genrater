const TimeSlot = require('../models/TimeSlot.model');

// @desc    Get all time slots
// @route   GET /api/timeslots
// @access  Private
exports.getAllTimeSlots = async (req, res, next) => {
      try {
            const timeSlots = await TimeSlot.find({ isActive: true });

            res.status(200).json({
                  success: true,
                  count: timeSlots.length,
                  data: timeSlots
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get single time slot
// @route   GET /api/timeslots/:id
// @access  Private
exports.getTimeSlot = async (req, res, next) => {
      try {
            const timeSlot = await TimeSlot.findById(req.params.id);

            if (!timeSlot) {
                  return res.status(404).json({
                        success: false,
                        message: 'Time slot not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: timeSlot
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create time slot
// @route   POST /api/timeslots
// @access  Private/Admin
exports.createTimeSlot = async (req, res, next) => {
      try {
            const timeSlot = await TimeSlot.create(req.body);

            res.status(201).json({
                  success: true,
                  data: timeSlot
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Update time slot
// @route   PUT /api/timeslots/:id
// @access  Private/Admin
exports.updateTimeSlot = async (req, res, next) => {
      try {
            const timeSlot = await TimeSlot.findByIdAndUpdate(
                  req.params.id,
                  req.body,
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!timeSlot) {
                  return res.status(404).json({
                        success: false,
                        message: 'Time slot not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: timeSlot
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Delete time slot
// @route   DELETE /api/timeslots/:id
// @access  Private/Admin
exports.deleteTimeSlot = async (req, res, next) => {
      try {
            const timeSlot = await TimeSlot.findByIdAndUpdate(
                  req.params.id,
                  { isActive: false },
                  { new: true }
            );

            if (!timeSlot) {
                  return res.status(404).json({
                        success: false,
                        message: 'Time slot not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Time slot deactivated successfully'
            });
      } catch (error) {
            next(error);
      }
};