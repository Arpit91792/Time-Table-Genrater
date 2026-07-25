const mongoose = require('mongoose');

const DESIGNATIONS = [
      'Professor',
      'Associate Professor',
      'Assistant Professor',
      'Lecturer',
      'Visiting Faculty',
      'Guest Faculty',
      'HOD',
      'Dean'
];

const facultySchema = new mongoose.Schema({
      facultyId: {
            type: String,
            required: [true, 'Faculty ID is required'],
            unique: true,
            uppercase: true,
            trim: true
      },
      name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
      },
      designation: {
            type: String,
            required: [true, 'Designation is required'],
            enum: DESIGNATIONS,
            default: 'Assistant Professor'
      },
      department: {
            type: String,
            required: [true, 'Department is required'],
            trim: true
      },
      email: {
            type: String,
            trim: true,
            lowercase: true,
            default: ''
      },
      phone: {
            type: String,
            trim: true,
            default: ''
      },
      inTime: {
            type: String,
            required: [true, 'In time is required'],
            default: '09:00',
            match: [/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Please enter a valid time in HH:MM format']
      },
      outTime: {
            type: String,
            required: [true, 'Out time is required'],
            default: '17:00',
            match: [/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Please enter a valid time in HH:MM format']
      },
      remarks: {
            type: String,
            trim: true,
            default: ''
      },
      maxClassesPerDay: {
            type: Number,
            min: 1,
            max: 8,
            default: 4
      },
      maxClassesPerWeek: {
            type: Number,
            min: 1,
            max: 40,
            default: 20
      },
      preferredSubjects: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
      }],
      unavailableSlots: [{
            day: {
                  type: String,
                  enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            },
            slot: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: 'TimeSlot'
            }
      }],
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

module.exports = mongoose.model('Faculty', facultySchema);
module.exports.DESIGNATIONS = DESIGNATIONS;
