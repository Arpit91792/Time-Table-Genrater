const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
      branchName: {
            type: String,
            required: [true, 'Branch name is required'],
            unique: true,
            trim: true,
            uppercase: true
      },
      branchCode: {
            type: String,
            required: [true, 'Branch code is required'],
            unique: true,
            uppercase: true,
            trim: true
      },
      description: {
            type: String,
            trim: true
      },
      departments: [{
            type: String,
            trim: true
      }],
      isActive: {
            type: Boolean,
            default: true
      }
}, {
      timestamps: true
});

// Index for efficient querying
branchSchema.index({ branchName: 1 }, { unique: true });
branchSchema.index({ branchCode: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);