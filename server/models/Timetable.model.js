const mongoose = require('mongoose');

const timetableSlotSchema = new mongoose.Schema({
      day: {
            type: String,
            required: [true, 'Day is required'],
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      slot: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TimeSlot',
            required: [true, 'Time slot is required']
      },
      subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: [true, 'Subject is required']
      },
      faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty',
            required: [true, 'Faculty is required']
      },
      room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            required: [true, 'Room is required']
      },
      section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            required: [true, 'Section is required']
      },
      isLocked: {
            type: Boolean,
            default: false
      }
});

const timetableSchema = new mongoose.Schema({
      name: {
            type: String,
            required: [true, 'Timetable name is required'],
            trim: true
      },
      branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            required: [true, 'Branch is required']
      },
      semester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Semester',
            required: [true, 'Semester is required']
      },
      section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            required: [true, 'Section is required']
      },
      collegeTiming: {
            type: Object,
            required: [true, 'College timing is required']
      },
      semesterType: {
            type: String,
            enum: ['odd', 'even'],
            default: 'odd'
      },
      slots: [timetableSlotSchema],
      type: {
            type: String,
            enum: ['Daily', 'Weekly'],
            default: 'Weekly'
      },
      generatedDate: {
            type: Date,
            default: Date.now
      },
      generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
      },
      isPublished: {
            type: Boolean,
            default: false
      },
      version: {
            type: Number,
            default: 1
      },
      conflicts: [{
            type: String,
            description: String
      }],
      stats: {
            totalSubjects: Number,
            totalHours: Number,
            facultyWorkload: Map,
            roomUtilization: Map,
            conflictCount: Number
      }
}, {
      timestamps: true
});

// Index for efficient querying
timetableSchema.index({ branch: 1, semester: 1, section: 1 });
timetableSchema.index({ 'slots.day': 1, 'slots.slot': 1 });
timetableSchema.index({ 'slots.faculty': 1 });
timetableSchema.index({ 'slots.room': 1 });

module.exports = mongoose.model('Timetable', timetableSchema);