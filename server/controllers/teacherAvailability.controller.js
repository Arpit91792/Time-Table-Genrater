const TeacherAvailability = require('../models/TeacherAvailability.model');
const Faculty = require('../models/Faculty.model');

exports.getAllTeacherAvailability = async (req, res, next) => {
      try {
            const records = await TeacherAvailability.find({ isActive: true }).sort({ facultyId: 1, day: 1, startTime: 1 });
            res.status(200).json({ success: true, count: records.length, data: records });
      } catch (error) {
            next(error);
      }
};

exports.getTeacherAvailabilityById = async (req, res, next) => {
      try {
            const record = await TeacherAvailability.findById(req.params.id);
            if (!record) {
                  return res.status(404).json({ success: false, message: 'Availability record not found' });
            }
            res.status(200).json({ success: true, data: record });
      } catch (error) {
            next(error);
      }
};

exports.createTeacherAvailability = async (req, res, next) => {
      try {
            const faculty = await Faculty.findById(req.body.facultyId);
            const payload = {
                  facultyId: req.body.facultyId,
                  facultyName: faculty ? faculty.name : req.body.facultyName,
                  day: req.body.day,
                  startTime: req.body.startTime,
                  endTime: req.body.endTime,
                  reason: req.body.reason || '',
                  category: req.body.category || 'Custom'
            };
            const record = await TeacherAvailability.create(payload);
            res.status(201).json({ success: true, data: record });
      } catch (error) {
            next(error);
      }
};

exports.updateTeacherAvailability = async (req, res, next) => {
      try {
            const updates = { ...req.body };
            if (updates.facultyId) {
                  const faculty = await Faculty.findById(updates.facultyId);
                  if (faculty) updates.facultyName = faculty.name;
            }
            const record = await TeacherAvailability.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
            if (!record) {
                  return res.status(404).json({ success: false, message: 'Availability record not found' });
            }
            res.status(200).json({ success: true, data: record });
      } catch (error) {
            next(error);
      }
};

exports.deleteTeacherAvailability = async (req, res, next) => {
      try {
            const record = await TeacherAvailability.findByIdAndDelete(req.params.id);
            if (!record) {
                  return res.status(404).json({ success: false, message: 'Availability record not found' });
            }
            res.status(200).json({ success: true, message: 'Availability record deleted successfully' });
      } catch (error) {
            next(error);
      }
};
