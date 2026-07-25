const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const branchController = require('../controllers/branch.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, sanitize, isValidObjectId } = require('../middleware/validation.middleware');

// Validation rules
const branchValidation = [
      body('branchName').notEmpty().trim(),
      body('branchCode').notEmpty().trim().toUpperCase(),
      body('description').optional().trim()
];

// All routes require authentication
router.use(protect);

// Public routes (for authenticated users)
router.get('/', branchController.getAllBranches);
router.get('/:id', isValidObjectId, branchController.getBranch);

// Admin-only routes
router.post('/', authorize('admin'), branchValidation, validate, sanitize, branchController.createBranch);
router.put('/:id', authorize('admin'), isValidObjectId, branchValidation, validate, sanitize, branchController.updateBranch);
router.delete('/:id', authorize('admin'), isValidObjectId, branchController.deleteBranch);

module.exports = router;