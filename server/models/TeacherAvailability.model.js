const mongoose = require('mongoose');

const teacherAvailabilitySchema = new mongoose.Schema({
      facultyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty',
            required: [true, 'Faculty ID is required']
      },
      facultyName: {
            type: String,
            trim: true
      },
      day: {
            type: String,
            required: [true, 'Day is required'],
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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
      reason: {
            type: String,
            trim: true
      },
      category: {
            type: String,
            enum: ['Medical', 'Administrative Duty', 'Research', 'Leave', 'Exam Duty', 'Meeting', 'Custom'],
            default: 'Custom'
      },
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

teacherAvailabilitySchema.index({ facultyId: 1, day: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('TeacherAvailability', teacherAvailabilitySchema);
