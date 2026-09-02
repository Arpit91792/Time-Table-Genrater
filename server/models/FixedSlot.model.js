const mongoose = require('mongoose');

const fixedSlotSchema = new mongoose.Schema({
      semester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Semester'
      },
      branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch'
      },
      section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section'
      },
      scope: {
            type: String,
            enum: ['Section', 'Semester', 'Branch', 'College', 'Multiple Sections'],
            default: 'Section'
      },
      sections: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section'
      }],
      subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
      },
      subjectCode: {
            type: String,
            trim: true,
            uppercase: true
      },
      subjectName: {
            type: String,
            trim: true
      },
      activityName: {
            type: String,
            trim: true
      },
      activityType: {
            type: String,
            enum: ['Theory', 'Practical', 'Activity', 'Library', 'Sports', 'Seminar', 'Placement', 'Mentoring', 'Custom'],
            default: 'Activity'
      },
      facultyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty'
      },
      facultyName: {
            type: String,
            trim: true
      },
      roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room'
      },
      roomName: {
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
      duration: {
            type: Number,
            min: [1, 'Duration must be positive'],
            default: 0
      },
      type: {
            type: String,
            enum: ['Theory', 'Practical', 'Activity', 'Library', 'Sports', 'Seminar', 'Placement', 'Mentoring', 'Custom'],
            required: [true, 'Slot type is required']
      },
      batch: {
            type: String,
            enum: ['A', 'B', 'C', 'B1', 'B2', 'Both', 'NA'],
            default: 'NA'
      },
      locked: {
            type: Boolean,
            default: true
      },
      notes: {
            type: String,
            trim: true
      },
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

fixedSlotSchema.index({ day: 1, startTime: 1, endTime: 1, branch: 1, semester: 1, section: 1 });
fixedSlotSchema.index({ scope: 1, activityType: 1 });

module.exports = mongoose.model('FixedSlot', fixedSlotSchema);
