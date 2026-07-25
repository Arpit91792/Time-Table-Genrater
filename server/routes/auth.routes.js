const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');

const authController = require('../controllers/auth.controller');
const { validate, sanitize } = require('../middleware/validation.middleware');

// Validation rules
const registerValidation = [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 6 }),
      body('role').optional().isIn(['admin', 'faculty']),
      body('facultyId').optional().isMongoId()
];

const loginValidation = [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 6 })
];

// Routes
router.post('/register', registerValidation, validate, sanitize, authController.register);
router.post('/login', loginValidation, validate, sanitize, authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);

module.exports = router;