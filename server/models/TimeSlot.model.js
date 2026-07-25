const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
      slotName: {
            type: String,
            required: [true, 'Slot name is required'],
            unique: true,
            trim: true
      },
      startTime: {
            type: String,
            required: [true, 'Start time is required'],
            match: [/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Please enter a valid time in HH:MM format']
      },
      endTime: {
            type: String,
            required: [true, 'End time is required'],
            match: [/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Please enter a valid time in HH:MM format']
      },
      duration: {
            type: Number,
            required: [true, 'Duration is required'],
            min: [30, 'Minimum duration is 30 minutes'],
            max: [120, 'Maximum duration is 120 minutes']
      },
      slotType: {
            type: String,
            enum: ['Lecture', 'Lab', 'Break', 'Lunch'],
            default: 'Lecture'
      },
      day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

// Index for efficient querying
timeSlotSchema.index({ slotName: 1 }, { unique: true });
timeSlotSchema.index({ startTime: 1, endTime: 1 });
timeSlotSchema.index({ day: 1 });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);