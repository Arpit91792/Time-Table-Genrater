const User = require('../models/User.model');
const Faculty = require('../models/Faculty.model');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
      return jwt.sign({ id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
      });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
      const token = generateToken(user._id);

      const options = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
            httpOnly: true
      };

      if (process.env.NODE_ENV === 'production') {
            options.secure = true;
      }

      res
            .status(statusCode)
            .cookie('token', token, options)
            .json({
                  success: true,
                  token,
                  user: {
                        id: user._id,
                        email: user.email,
                        role: user.role,
                        facultyId: user.facultyId
                  }
            });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
      try {
            const { email, password, role, facultyId } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                  return res.status(400).json({
                        success: false,
                        message: 'User already exists'
                  });
            }

            // If faculty role, check if faculty exists
            if (role === 'faculty' && facultyId) {
                  const faculty = await Faculty.findById(facultyId);
                  if (!faculty) {
                        return res.status(400).json({
                              success: false,
                              message: 'Faculty not found'
                        });
                  }
            }

            // Create user
            const user = await User.create({
                  email,
                  password,
                  role: role || 'faculty',
                  facultyId: role === 'faculty' ? facultyId : undefined
            });

            sendTokenResponse(user, 201, res);
      } catch (error) {
            next(error);
      }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
      try {
            const { email, password } = req.body;

            // Validate email & password
            if (!email || !password) {
                  return res.status(400).json({
                        success: false,
                        message: 'Please provide email and password'
                  });
            }

            // Check for user
            const user = await User.findOne({ email }).select('+password');
            if (!user) {
                  return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                  });
            }

            // Check if password matches
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                  return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                  });
            }

            // Update last login
            user.lastLogin = Date.now();
            await user.save();

            sendTokenResponse(user, 200, res);
      } catch (error) {
            next(error);
      }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
      try {
            res.cookie('token', 'none', {
                  expires: new Date(Date.now() + 10 * 1000),
                  httpOnly: true
            });

            res.status(200).json({
                  success: true,
                  message: 'Logged out successfully'
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
      try {
            const { email } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                  return res.status(404).json({
                        success: false,
                        message: 'User not found'
                  });
            }

            // In a real application, you would:
            // 1. Generate reset token
            // 2. Save hashed token to database
            // 3. Send email with reset link
            // For now, we'll return a success message

            res.status(200).json({
                  success: true,
                  message: 'Password reset email sent'
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
      try {
            const { token } = req.params;
            const { password } = req.body;

            // In a real application, you would:
            // 1. Verify token
            // 2. Find user by token
            // 3. Update password
            // 4. Clear reset token fields
            // For now, we'll return a success message

            res.status(200).json({
                  success: true,
                  message: 'Password reset successful'
            });
      } catch (error) {
            next(error);
      }
};