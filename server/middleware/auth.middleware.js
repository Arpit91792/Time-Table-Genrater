const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Protect routes
exports.protect = async (req, res, next) => {
      let token;

      // Check if token exists in headers
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
      }

      // Check if token exists in cookies
      else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
      }

      if (!token) {
            return res.status(401).json({
                  success: false,
                  message: 'Not authorized to access this route'
            });
      }

      try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from database
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                  return res.status(401).json({
                        success: false,
                        message: 'User not found'
                  });
            }

            next();
      } catch (error) {
            return res.status(401).json({
                  success: false,
                  message: 'Not authorized to access this route'
            });
      }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
      return (req, res, next) => {
            if (!req.user) {
                  return res.status(401).json({
                        success: false,
                        message: 'Not authorized to access this route'
                  });
            }

            if (!roles.includes(req.user.role)) {
                  return res.status(403).json({
                        success: false,
                        message: `User role ${req.user.role} is not authorized to access this route`
                  });
            }

            next();
      };
};

// Check if user is faculty
exports.isFaculty = (req, res, next) => {
      if (req.user.role === 'faculty') {
            next();
      } else {
            return res.status(403).json({
                  success: false,
                  message: 'Only faculty can access this route'
            });
      }
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
      if (req.user.role === 'admin') {
            next();
      } else {
            return res.status(403).json({
                  success: false,
                  message: 'Only admin can access this route'
            });
      };
};