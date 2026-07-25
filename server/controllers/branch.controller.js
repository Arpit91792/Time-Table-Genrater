const Branch = require('../models/Branch.model');

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private
exports.getAllBranches = async (req, res, next) => {
      try {
            const branches = await Branch.find({ isActive: true });

            res.status(200).json({
                  success: true,
                  count: branches.length,
                  data: branches
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get single branch
// @route   GET /api/branches/:id
// @access  Private
exports.getBranch = async (req, res, next) => {
      try {
            const branch = await Branch.findById(req.params.id);

            if (!branch) {
                  return res.status(404).json({
                        success: false,
                        message: 'Branch not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: branch
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create branch
// @route   POST /api/branches
// @access  Private/Admin
exports.createBranch = async (req, res, next) => {
      try {
            const branch = await Branch.create(req.body);

            res.status(201).json({
                  success: true,
                  data: branch
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Update branch
// @route   PUT /api/branches/:id
// @access  Private/Admin
exports.updateBranch = async (req, res, next) => {
      try {
            const branch = await Branch.findByIdAndUpdate(
                  req.params.id,
                  req.body,
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!branch) {
                  return res.status(404).json({
                        success: false,
                        message: 'Branch not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: branch
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private/Admin
exports.deleteBranch = async (req, res, next) => {
      try {
            const branch = await Branch.findByIdAndUpdate(
                  req.params.id,
                  { isActive: false },
                  { new: true }
            );

            if (!branch) {
                  return res.status(404).json({
                        success: false,
                        message: 'Branch not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Branch deactivated successfully'
            });
      } catch (error) {
            next(error);
      }
};