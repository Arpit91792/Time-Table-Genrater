const { validationResult } = require('express-validator');

// Validate request
exports.validate = (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
            return res.status(400).json({
                  success: false,
                  errors: errors.array()
            });
      }
      next();
};

// Sanitize request body
exports.sanitize = (req, res, next) => {
      // Remove any $ signs from request body to prevent NoSQL injection
      for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                  req.body[key] = req.body[key].replace(/\$/g, '');
            }
      }
      next();
};

// Validate ObjectId
exports.isValidObjectId = (req, res, next) => {
      const mongoose = require('mongoose');
      const ids = ['id', 'facultyId', 'branchId', 'semesterId', 'sectionId', 'subjectId', 'roomId', 'timeslotId'];

      for (const idField of ids) {
            if (req.params[idField] && !mongoose.Types.ObjectId.isValid(req.params[idField])) {
                  return res.status(400).json({
                        success: false,
                        message: `Invalid ${idField} format`
                  });
            }
      }

      next();
};