const Room = require('../models/Room.model');

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
exports.getAllRooms = async (req, res, next) => {
      try {
            const rooms = await Room.find({ isActive: true });

            res.status(200).json({
                  success: true,
                  count: rooms.length,
                  data: rooms
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
exports.getRoom = async (req, res, next) => {
      try {
            const room = await Room.findById(req.params.id);

            if (!room) {
                  return res.status(404).json({
                        success: false,
                        message: 'Room not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: room
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create room
// @route   POST /api/rooms
// @access  Private/Admin
exports.createRoom = async (req, res, next) => {
      try {
            const room = await Room.create(req.body);

            res.status(201).json({
                  success: true,
                  data: room
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private/Admin
exports.updateRoom = async (req, res, next) => {
      try {
            const room = await Room.findByIdAndUpdate(
                  req.params.id,
                  req.body,
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!room) {
                  return res.status(404).json({
                        success: false,
                        message: 'Room not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: room
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
exports.deleteRoom = async (req, res, next) => {
      try {
            const room = await Room.findByIdAndUpdate(
                  req.params.id,
                  { isActive: false },
                  { new: true }
            );

            if (!room) {
                  return res.status(404).json({
                        success: false,
                        message: 'Room not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Room deactivated successfully'
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get rooms by type
// @route   GET /api/rooms/type/:roomType
// @access  Private
exports.getRoomsByType = async (req, res, next) => {
      try {
            const rooms = await Room.find({
                  roomType: req.params.roomType,
                  isActive: true
            });

            res.status(200).json({
                  success: true,
                  count: rooms.length,
                  data: rooms
            });
      } catch (error) {
            next(error);
      }
};