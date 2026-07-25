const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
      email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
      },
      password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false
      },
      role: {
            type: String,
            enum: ['admin', 'faculty'],
            default: 'faculty'
      },
      isActive: {
            type: Boolean,
            default: true
      },
      facultyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty'
      },
      resetPasswordToken: String,
      resetPasswordExpire: Date,
      lastLogin: Date
}, {
      timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
      if (!this.isModified('password')) return next();

      try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
            next();
      } catch (error) {
            next(error);
      }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token (simplified for now)
userSchema.methods.getResetPasswordToken = function () {
      const resetToken = crypto.randomBytes(20).toString('hex');
      this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
      return resetToken;
};

module.exports = mongoose.model('User', userSchema);