const express = require('express');
const router = express.Router();
const {
      getCollegeTiming,
      saveCollegeTiming,
      getCollegeTimingHistory,
      getCollegeTimingById,
      deleteCollegeTiming
} = require('../controllers/collegeTiming.controller');

// Public routes
router.get('/', getCollegeTiming);

// Admin routes (would need auth middleware)
router.post('/', saveCollegeTiming);
router.get('/history', getCollegeTimingHistory);
router.get('/:id', getCollegeTimingById);
router.delete('/:id', deleteCollegeTiming);

module.exports = router;