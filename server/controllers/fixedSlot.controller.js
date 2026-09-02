const FixedSlot = require('../models/FixedSlot.model');

exports.getAllFixedSlots = async (req, res, next) => {
      try {
            const slots = await FixedSlot.find({ isActive: true }).sort({ day: 1, startTime: 1 });
            res.status(200).json({ success: true, count: slots.length, data: slots });
      } catch (error) {
            next(error);
      }
};

exports.getFixedSlot = async (req, res, next) => {
      try {
            const slot = await FixedSlot.findById(req.params.id);
            if (!slot) {
                  return res.status(404).json({ success: false, message: 'Fixed slot not found' });
            }
            res.status(200).json({ success: true, data: slot });
      } catch (error) {
            next(error);
      }
};

exports.createFixedSlot = async (req, res, next) => {
      try {
            const payload = {
                  semester: req.body.semester,
                  branch: req.body.branch,
                  section: req.body.section,
                  scope: req.body.scope || 'Section',
                  sections: req.body.sections || [],
                  subjectId: req.body.subjectId,
                  subjectCode: req.body.subjectCode,
                  subjectName: req.body.subjectName,
                  activityName: req.body.activityName,
                  activityType: req.body.activityType || 'Activity',
                  facultyId: req.body.facultyId,
                  facultyName: req.body.facultyName,
                  roomId: req.body.roomId,
                  roomName: req.body.roomName,
                  day: req.body.day,
                  startTime: req.body.startTime,
                  endTime: req.body.endTime,
                  duration: req.body.duration || 0,
                  type: req.body.type,
                  batch: req.body.batch || 'NA',
                  locked: req.body.locked !== undefined ? req.body.locked : true,
                  notes: req.body.notes || ''
            };
            const slot = await FixedSlot.create(payload);
            res.status(201).json({ success: true, data: slot });
      } catch (error) {
            next(error);
      }
};

exports.updateFixedSlot = async (req, res, next) => {
      try {
            const updates = { ...req.body };
            const slot = await FixedSlot.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
            if (!slot) {
                  return res.status(404).json({ success: false, message: 'Fixed slot not found' });
            }
            res.status(200).json({ success: true, data: slot });
      } catch (error) {
            next(error);
      }
};

exports.deleteFixedSlot = async (req, res, next) => {
      try {
            const slot = await FixedSlot.findByIdAndDelete(req.params.id);
            if (!slot) {
                  return res.status(404).json({ success: false, message: 'Fixed slot not found' });
            }
            res.status(200).json({ success: true, message: 'Fixed slot deleted successfully' });
      } catch (error) {
            next(error);
      }
};
