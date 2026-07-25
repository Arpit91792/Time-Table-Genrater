const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
      subjectCode: {
            type: String,
            required: [true, 'Subject code is required'],
            unique: true,
            uppercase: true,
            trim: true
      },
      subjectName: {
            type: String,
            required: [true, 'Subject name is required'],
            trim: true
      },
      semester: {
            type: Number,
            required: [true, 'Semester is required'],
            min: [1, 'Semester must be at least 1'],
            max: [8, 'Semester must be at most 8']
      },
      branch: {
            type: String,
            required: [true, 'Branch is required'],
            trim: true,
            uppercase: true
      },
      section: {
            type: String,
            required: [true, 'Section is required'],
            trim: true,
            uppercase: true,
            default: 'A'
      },
      theoryOrLab: {
            type: String,
            enum: ['Theory', 'Lab', 'Both'],
            default: 'Theory'
      },
      hoursPerWeek: {
            type: Number,
            min: [1, 'Minimum 1 hour per week'],
            max: [20, 'Maximum 20 hours per week'],
            default: 3
      },
      credits: {
            type: Number,
            min: [1, 'Minimum 1 credit'],
            max: [5, 'Maximum 5 credits'],
            default: 3
      },
      lecturesRequired: {
            type: Number,
            min: 0,
            default: 0
      },
      practicalRequired: {
            type: Number,
            min: 0,
            default: 0
      },
      assignedFaculty: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty'
      }],
      prerequisites: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
      }],
      description: {
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

subjectSchema.index({ branch: 1, semester: 1, section: 1 });
subjectSchema.index({ theoryOrLab: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
