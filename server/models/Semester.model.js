const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
      semesterNumber: {
            type: Number,
            required: [true, 'Semester number is required'],
            min: [1, 'Semester number must be at least 1'],
            max: [8, 'Semester number must be at most 8']
      },
      branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            required: [true, 'Branch is required']
      },
      academicYear: {
            type: String,
            required: [true, 'Academic year is required'],
            match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY']
      },
      startDate: {
            type: Date,
            required: [true, 'Start date is required']
      },
      endDate: {
            type: Date,
            required: [true, 'End date is required']
      },
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

// Compound unique index
semesterSchema.index({ semesterNumber: 1, branch: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Semester', semesterSchema);