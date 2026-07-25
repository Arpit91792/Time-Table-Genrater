const CollegeTiming = require('../models/CollegeTiming.model');

// @desc    Get current college timing
// @route   GET /api/college-timing
// @access  Public
exports.getCollegeTiming = async (req, res, next) => {
      try {
            const collegeTiming = await CollegeTiming.findOne({ isActive: true });

            if (!collegeTiming) {
                  // Return default structure if no college timing is set
                  return res.status(200).json({
                        success: true,
                        data: {
                              collegeName: '',
                              academicYear: '',
                              semesterType: 'odd',
                              session: 'Regular',
                              workingDays: {
                                    monday: true,
                                    tuesday: true,
                                    wednesday: true,
                                    thursday: true,
                                    friday: true,
                                    saturday: false,
                                    sunday: false
                              },
                              startTime: '08:00',
                              endTime: '16:00',
                              lectureDuration: 50,
                              practicalDuration: 100,
                              lunchBreak: {
                                    enabled: true,
                                    startTime: '13:00',
                                    endTime: '13:30'
                              },
                              teaBreak: { enabled: false, startTime: '', endTime: '' },
                              shortBreak: { enabled: false, startTime: '', endTime: '' },
                              assembly: { enabled: false, startTime: '', endTime: '' },
                              prayer: { enabled: false, startTime: '', endTime: '' }
                        }
                  });
            }

            res.status(200).json({
                  success: true,
                  data: collegeTiming
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Create or update college timing
// @route   POST /api/college-timing
// @access  Private/Admin
exports.saveCollegeTiming = async (req, res, next) => {
      try {
            const existingTiming = await CollegeTiming.findOne({ isActive: true });

            let collegeTiming;

            if (existingTiming) {
                  // Update existing active timing
                  existingTiming.isActive = false;
                  await existingTiming.save();

                  // Create new active timing
                  collegeTiming = await CollegeTiming.create({
                        ...req.body,
                        isActive: true
                  });
            } else {
                  // Create new active timing
                  collegeTiming = await CollegeTiming.create({
                        ...req.body,
                        isActive: true
                  });
            }

            res.status(201).json({
                  success: true,
                  message: 'College timing saved successfully',
                  data: collegeTiming
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get all college timing configurations (history)
// @route   GET /api/college-timing/history
// @access  Private/Admin
exports.getCollegeTimingHistory = async (req, res, next) => {
      try {
            const collegeTimings = await CollegeTiming.find().sort({ createdAt: -1 });

            res.status(200).json({
                  success: true,
                  count: collegeTimings.length,
                  data: collegeTimings
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Get college timing by ID
// @route   GET /api/college-timing/:id
// @access  Private/Admin
exports.getCollegeTimingById = async (req, res, next) => {
      try {
            const collegeTiming = await CollegeTiming.findById(req.params.id);

            if (!collegeTiming) {
                  return res.status(404).json({
                        success: false,
                        message: 'College timing configuration not found'
                  });
            }

            res.status(200).json({
                  success: true,
                  data: collegeTiming
            });
      } catch (error) {
            next(error);
      }
};

// @desc    Delete college timing
// @route   DELETE /api/college-timing/:id
// @access  Private/Admin
exports.deleteCollegeTiming = async (req, res, next) => {
      try {
            const collegeTiming = await CollegeTiming.findById(req.params.id);

            if (!collegeTiming) {
                  return res.status(404).json({
                        success: false,
                        message: 'College timing configuration not found'
                  });
            }

            await collegeTiming.deleteOne();

            res.status(200).json({
                  success: true,
                  message: 'College timing configuration deleted successfully'
            });
      } catch (error) {
            next(error);
      }
};