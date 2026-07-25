const mongoose = require('mongoose');

const collegeTimingSchema = new mongoose.Schema({
      collegeName: {
            type: String,
            required: [true, 'College name is required'],
            trim: true
      },
      academicYear: {
            type: String,
            required: [true, 'Academic year is required'],
            trim: true
      },
      semesterType: {
            type: String,
            enum: ['odd', 'even'],
            required: [true, 'Semester type is required'],
            default: 'odd'
      },
      session: {
            type: String,
            enum: ['Regular', 'Supplementary', 'Summer'],
            required: [true, 'Session type is required'],
            default: 'Regular'
      },
      workingDays: {
            monday: { type: Boolean, default: true },
            tuesday: { type: Boolean, default: true },
            wednesday: { type: Boolean, default: true },
            thursday: { type: Boolean, default: true },
            friday: { type: Boolean, default: true },
            saturday: { type: Boolean, default: false },
            sunday: { type: Boolean, default: false }
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
      lectureDuration: {
            type: Number,
            required: [true, 'Lecture duration is required'],
            min: [40, 'Minimum lecture duration is 40 minutes'],
            max: [60, 'Maximum lecture duration is 60 minutes'],
            default: 50
      },
      practicalDuration: {
            type: Number,
            required: [true, 'Practical duration is required'],
            min: [80, 'Minimum practical duration is 80 minutes'],
            max: [120, 'Maximum practical duration is 120 minutes'],
            default: 100
      },
      lunchBreak: {
            enabled: { type: Boolean, default: true },
            startTime: {
                  type: String,
                  match: [/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Please enter a valid time in HH:MM format']
            },
            endTime: {
                  type: String,
                  match: [/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Please enter a valid time in HH:MM format']
            }
      },
      teaBreak: {
            enabled: { type: Boolean, default: false },
            startTime: String,
            endTime: String
      },
      shortBreak: {
            enabled: { type: Boolean, default: false },
            startTime: String,
            endTime: String
      },
      assembly: {
            enabled: { type: Boolean, default: false },
            startTime: String,
            endTime: String
      },
      prayer: {
            enabled: { type: Boolean, default: false },
            startTime: String,
            endTime: String
      },
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

// Ensure only one active college timing configuration exists
collegeTimingSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

module.exports = mongoose.model('CollegeTiming', collegeTimingSchema);