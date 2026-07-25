const Section = require('../models/Section.model');

// @desc    Get all sections
// @route   GET /api/sections
// @access  Private
exports.getAllSections = async (req, res, next) => {
      try {
            const sections = await Section.find({ isActive: true })
                  .populate('semester', 'semesterNumber academicYear')
                  .populate('branch', 'branchName branchCode')
                  .populate('classTeacher', 'name designation')
                  .populate('room', 'roomNumber capacity');

            res.status(200).json({
                  success: true,
                  count: sections.length,
                  data: sections
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get single section
// @route   GET /api/sections/:id
// @access  Private
exports.getSection = async (req, res, next) => {
      try {
            const section = await Section.findById(req.params.id)
                  .populate('semester', 'semesterNumber academicYear')
                  .populate('branch', 'branchName branchCode')
                  .populate('classTeacher', 'name designation')
                  .populate('room', 'roomNumber capacity');

            if (!section) {
                  return res.status(404).json({
                        success: false,
                        message: 'Section not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: section
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create section
// @route   POST /api/sections
// @access  Private/Admin
exports.createSection = async (req, res, next) => {
      try {
            const section = await Section.create(req.body);

            res.status(201).json({
                  success: true,
                  data: section
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Update section
// @route   PUT /api/sections/:id
// @access  Private/Admin
exports.updateSection = async (req, res, next) => {
      try {
            const section = await Section.findByIdAndUpdate(
                  req.params.id,
                  req.body,
                  {
                        new: true,
                        runValidators: true
                  }
            );

            if (!section) {
                  return res.status(404).json({
                        success: false,
                        message: 'Section not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: section
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Delete section
// @route   DELETE /api/sections/:id
// @access  Private/Admin
exports.deleteSection = async (req, res, next) => {
      try {
            const section = await Section.findByIdAndUpdate(
                  req.params.id,
                  { isActive: false },
                  { new: true }
            );

            if (!section) {
                  return res.status(404).json({
                        success: false,
                        message: 'Section not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  message: 'Section deactivated successfully'
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create bulk sections
// @route   POST /api/sections/bulk
// @access  Private/Admin
exports.createBulkSections = async (req, res, next) => {
      try {
            const { semester, branch, startLetter, endLetter, capacity, sections } = req.body;
            const createdSections = [];
            const errors = [];

            // Method 1: Create sections from letter range (A to Z)
            if (startLetter && endLetter) {
                  const startCharCode = startLetter.charCodeAt(0);
                  const endCharCode = endLetter.charCodeAt(0);

                  if (startCharCode > endCharCode) {
                        return res.status(400).json({
                              success: false,
                              message: 'Start letter must come before end letter in alphabet'
                        });
                  }

                  for (let i = startCharCode; i <= endCharCode; i++) {
                        const sectionName = String.fromCharCode(i);

                        try {
                              const section = await Section.create({
                                    sectionName,
                                    semester,
                                    branch,
                                    capacity,
                                    isActive: true
                              });
                              createdSections.push(section);
                        } catch (error) {
                              // If section already exists, skip it
                              if (error.code === 11000) { // Duplicate key error
                                    errors.push(`Section ${sectionName} already exists for this semester and branch`);
                              } else {
                                    errors.push(`Error creating section ${sectionName}: ${error.message}`);
                              }
                        }
                  }
            }
            // Method 2: Create from provided sections array
            else if (sections && Array.isArray(sections)) {
                  for (const sectionData of sections) {
                        try {
                              const section = await Section.create({
                                    ...sectionData,
                                    semester,
                                    branch
                              });
                              createdSections.push(section);
                        } catch (error) {
                              if (error.code === 11000) {
                                    errors.push(`Section ${sectionData.sectionName} already exists for this semester and branch`);
                              } else {
                                    errors.push(`Error creating section ${sectionData.sectionName}: ${error.message}`);
                              }
                        }
                  }
            }
            // Invalid request
            else {
                  return res.status(400).json({
                        success: false,
                        message: 'Either provide startLetter/endLetter range or sections array'
                  });
            }

            res.status(201).json({
                  success: true,
                  message: `Created ${createdSections.length} section(s) successfully`,
                  data: createdSections,
                  errors: errors.length > 0 ? errors : undefined
            });
      } catch (error) {
            next(error);
      }
};