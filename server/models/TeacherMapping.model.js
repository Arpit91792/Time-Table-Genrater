const mongoose = require('mongoose');

const teacherMappingSchema = new mongoose.Schema({
      // Basic Information
      facultyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty',
            required: [true, 'Faculty ID is required']
      },
      subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: [true, 'Subject ID is required']
      },
      subjectCode: {
            type: String,
            required: [true, 'Subject code is required'],
            trim: true
      },

      // Academic Information
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
      section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            required: [true, 'Section is required']
      },
      batch: {
            type: String,
            enum: ['A', 'B', 'C', 'Both', 'NA'],
            default: 'NA'
      },

      // Subject Type and Hours
      subjectType: {
            type: String,
            enum: ['Theory', 'Practical', 'Tutorial', 'Lab', 'Project'],
            required: [true, 'Subject type is required']
      },
      lectureHoursPerWeek: {
            type: Number,
            min: [0, 'Lecture hours cannot be negative'],
            default: 0
      },
      practicalHoursPerWeek: {
            type: Number,
            min: [0, 'Practical hours cannot be negative'],
            default: 0
      },
      totalHoursPerWeek: {
            type: Number,
            required: [true, 'Total hours per week is required'],
            min: [1, 'Minimum 1 hour per week']
      },
      classesPerWeek: {
            type: Number,
            required: [true, 'Classes per week is required'],
            min: [1, 'Minimum 1 class per week']
      },

      // Faculty Load Management
      facultyMaxLoad: {
            type: Number,
            required: [true, 'Faculty maximum load is required'],
            min: [1, 'Minimum 1 hour load']
      },
      currentAssignedLoad: {
            type: Number,
            default: 0,
            min: [0, 'Current assigned load cannot be negative']
      },
      remainingLoad: {
            type: Number,
            default: function () {
                  return this.facultyMaxLoad - this.currentAssignedLoad;
            },
            min: [0, 'Remaining load cannot be negative']
      },

      // Constraints and Preferences
      preferredDays: [{
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      }],
      unavailableDays: [{
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      }],
      preferredTimeSlots: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TimeSlot'
      }],
      unavailableTimeSlots: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TimeSlot'
      }],
      preferredRoom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            default: null
      },
      preferredLab: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            default: null
      },

      // Maximum consecutive lectures constraint
      maxConsecutiveLectures: {
            type: Number,
            min: [1, 'Minimum 1 consecutive lecture'],
            max: [8, 'Maximum 8 consecutive lectures'],
            default: 3
      },

      // Priority and Status
      priority: {
            type: String,
            enum: ['High', 'Medium', 'Low'],
            default: 'Medium'
      },
      status: {
            type: String,
            enum: ['Active', 'Inactive', 'Tentative', 'Confirmed'],
            default: 'Active'
      },
      remarks: {
            type: String,
            trim: true,
            default: ''
      },

      // Validation Flags
      hasConflicts: {
            type: Boolean,
            default: false
      },
      conflictDetails: {
            type: String,
            trim: true,
            default: ''
      },
      validationWarnings: [{
            type: String,
            trim: true
      }]
}, {
      timestamps: true
});

// Indexes for efficient querying
teacherMappingSchema.index({ facultyId: 1, subjectId: 1 }, { unique: true });
teacherMappingSchema.index({ facultyId: 1, semester: 1 });
teacherMappingSchema.index({ subjectId: 1 });
teacherMappingSchema.index({ branch: 1, semester: 1, section: 1 });
teacherMappingSchema.index({ status: 1 });
teacherMappingSchema.index({ priority: 1 });

// Pre-save middleware to calculate total hours
teacherMappingSchema.pre('save', function (next) {
      this.totalHoursPerWeek = this.lectureHoursPerWeek + this.practicalHoursPerWeek;
      this.remainingLoad = this.facultyMaxLoad - this.currentAssignedLoad;
      next();
});

// Static method to check for duplicate mapping
teacherMappingSchema.statics.checkDuplicate = async function (facultyId, subjectId, semester, section) {
      const existingMapping = await this.findOne({
            facultyId,
            subjectId,
            semester,
            section
      });
      return existingMapping;
};

// Static method to get faculty total load
teacherMappingSchema.statics.getFacultyTotalLoad = async function (facultyId, semester) {
      const result = await this.aggregate([
            {
                  $match: {
                        facultyId: mongoose.Types.ObjectId(facultyId),
                        semester: mongoose.Types.ObjectId(semester),
                        status: { $in: ['Active', 'Confirmed'] }
                  }
            },
            {
                  $group: {
                        _id: null,
                        totalLoad: { $sum: '$currentAssignedLoad' }
                  }
            }
      ]);

      return result.length > 0 ? result[0].totalLoad : 0;
};

module.exports = mongoose.model('TeacherMapping', teacherMappingSchema);