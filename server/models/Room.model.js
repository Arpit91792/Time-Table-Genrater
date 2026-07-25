const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
      roomNumber: {
            type: String,
            required: [true, 'Room number is required'],
            unique: true,
            uppercase: true,
            trim: true
      },
      capacity: {
            type: Number,
            required: [true, 'Capacity is required'],
            min: [10, 'Minimum capacity is 10'],
            max: [300, 'Maximum capacity is 300']
      },
      roomType: {
            type: String,
            required: [true, 'Room type is required'],
            enum: ['Classroom', 'Lab', 'Auditorium', 'Seminar Hall', 'Conference Room'],
            default: 'Classroom'
      },
      floor: {
            type: Number,
            min: [0, 'Floor cannot be negative'],
            max: [20, 'Maximum floor is 20']
      },
      building: {
            type: String,
            trim: true
      },
      hasProjector: {
            type: Boolean,
            default: false
      },
      hasAC: {
            type: Boolean,
            default: false
      },
      hasSmartBoard: {
            type: Boolean,
            default: false
      },
      equipment: [{
            name: String,
            quantity: Number
      }],
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

// Index for efficient querying
roomSchema.index({ roomNumber: 1 }, { unique: true });
roomSchema.index({ roomType: 1 });
roomSchema.index({ building: 1 });

module.exports = mongoose.model('Room', roomSchema);