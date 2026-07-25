const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
      sectionName: {
            type: String,
            required: [true, 'Section name is required'],
            uppercase: true,
            trim: true
      },
      semester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Semester',
            required: [true, 'Semester is required']
      },
      branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            required: [true, 'Branch is required']
      },
      capacity: {
            type: Number,
            required: [true, 'Capacity is required'],
            min: [10, 'Minimum capacity is 10'],
            max: [120, 'Maximum capacity is 120']
      },
      classTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty'
      },
      room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room'
      },
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

// Compound unique index
sectionSchema.index({ sectionName: 1, semester: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);