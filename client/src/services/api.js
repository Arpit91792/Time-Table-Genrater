// ─────────────────────────────────────────────────────────────────────────────
// Local-Storage API  —  No backend required.
// Data persists in the browser across reloads and localhost on/off cycles.
// All functions return the same { success, data, message } shape as the old API.
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEYS = {
  collegeTiming: 'tt_college_timing',
  subjects: 'tt_subjects',
  faculty: 'tt_faculty',
  teacherMappings: 'tt_teacher_mappings',
  timetables: 'tt_timetables',
};

// ── helpers ──────────────────────────────────────────────────────────────────

const load = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage write failed:', e);
  }
};

const newId = () =>
  `ls_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const ok = (data) => ({ success: true, data });
const fail = (message) => ({ success: false, message });

// ── College Timing ────────────────────────────────────────────────────────────

export const collegeTimingApi = {
  getCurrent: async () => {
    const data = load(LS_KEYS.collegeTiming);
    return data ? ok(data) : ok(null);
  },
  save: async (timingData) => {
    const record = { ...timingData, _id: timingData._id || newId(), updatedAt: new Date().toISOString() };
    save(LS_KEYS.collegeTiming, record);
    return ok(record);
  },
  getHistory: async () => ok([]),
};

// ── Subjects ──────────────────────────────────────────────────────────────────

export const subjectApi = {
  getAll: async () => {
    const list = load(LS_KEYS.subjects) || [];
    return ok(list);
  },
  create: async (subjectData) => {
    if (!subjectData.subjectCode?.trim() || !subjectData.subjectName?.trim()) {
      return fail('Subject code and name are required');
    }
    const list = load(LS_KEYS.subjects) || [];
    const record = {
      ...subjectData,
      _id: newId(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    save(LS_KEYS.subjects, [record, ...list]);
    return ok(record);
  },
  update: async (id, subjectData) => {
    const list = load(LS_KEYS.subjects) || [];
    const idx = list.findIndex((s) => s._id === id);
    if (idx === -1) return fail('Subject not found');
    list[idx] = { ...list[idx], ...subjectData, _id: id };
    save(LS_KEYS.subjects, list);
    return ok(list[idx]);
  },
  delete: async (id) => {
    const list = (load(LS_KEYS.subjects) || []).filter((s) => s._id !== id);
    save(LS_KEYS.subjects, list);
    return ok({ _id: id });
  },
};

// ── Faculty ───────────────────────────────────────────────────────────────────

export const facultyApi = {
  getAll: async () => {
    const list = load(LS_KEYS.faculty) || [];
    return ok(list);
  },
  create: async (facultyData) => {
    const list = load(LS_KEYS.faculty) || [];
    const record = {
      ...facultyData,
      _id: newId(),
      facultyId: facultyData.facultyId || `FAC${Date.now().toString(36).toUpperCase()}`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    save(LS_KEYS.faculty, [record, ...list]);
    return ok(record);
  },
  update: async (id, facultyData) => {
    const list = load(LS_KEYS.faculty) || [];
    const idx = list.findIndex((f) => f._id === id);
    if (idx === -1) return fail('Faculty not found');
    list[idx] = { ...list[idx], ...facultyData, _id: id };
    save(LS_KEYS.faculty, list);
    return ok(list[idx]);
  },
  delete: async (id) => {
    const list = (load(LS_KEYS.faculty) || []).filter((f) => f._id !== id);
    save(LS_KEYS.faculty, list);
    return ok({ _id: id });
  },
};

// ── Teacher Mappings ──────────────────────────────────────────────────────────

export const teacherMappingApi = {
  getAll: async () => {
    const list = load(LS_KEYS.teacherMappings) || [];
    return ok(list);
  },
  create: async (mappingData) => {
    const list = load(LS_KEYS.teacherMappings) || [];
    const record = { ...mappingData, _id: newId(), createdAt: new Date().toISOString() };
    save(LS_KEYS.teacherMappings, [...list, record]);
    return ok(record);
  },
  update: async (id, mappingData) => {
    const list = load(LS_KEYS.teacherMappings) || [];
    const idx = list.findIndex((m) => m._id === id);
    if (idx === -1) return fail('Mapping not found');
    list[idx] = { ...list[idx], ...mappingData, _id: id };
    save(LS_KEYS.teacherMappings, list);
    return ok(list[idx]);
  },
  delete: async (id) => {
    const list = (load(LS_KEYS.teacherMappings) || []).filter((m) => m._id !== id);
    save(LS_KEYS.teacherMappings, list);
    return ok({ _id: id });
  },
};

// ── Timetables ────────────────────────────────────────────────────────────────

export const timetableApi = {
  getAll: async () => {
    const list = load(LS_KEYS.timetables) || [];
    return ok(list);
  },
  generate: async (timetableData) => {
    const list = load(LS_KEYS.timetables) || [];
    const record = {
      ...timetableData,
      _id: timetableData._id || newId(),
      generatedAt: timetableData.generatedAt || new Date().toISOString(),
    };
    // Replace if same _id exists, otherwise prepend
    const idx = list.findIndex(t => t._id === record._id);
    if (idx >= 0) list[idx] = record;
    else list.unshift(record);
    save(LS_KEYS.timetables, list);
    return ok(record);
  },
  // Full record update (used for slot edits from the viewer)
  update: async (id, updates) => {
    const list = load(LS_KEYS.timetables) || [];
    const idx = list.findIndex((t) => t._id === id);
    if (idx === -1) return fail('Timetable not found');
    list[idx] = { ...list[idx], ...updates, _id: id };
    save(LS_KEYS.timetables, list);
    return ok(list[idx]);
  },
  getById: async (id) => {
    const list = load(LS_KEYS.timetables) || [];
    const found = list.find((t) => t._id === id);
    return found ? ok(found) : fail('Timetable not found');
  },
  publish: async (id) => {
    const list = load(LS_KEYS.timetables) || [];
    const idx = list.findIndex((t) => t._id === id);
    if (idx === -1) return fail('Timetable not found');
    list[idx] = { ...list[idx], published: true };
    save(LS_KEYS.timetables, list);
    return ok(list[idx]);
  },
  delete: async (id) => {
    const list = (load(LS_KEYS.timetables) || []).filter((t) => t._id !== id);
    save(LS_KEYS.timetables, list);
    return ok({ _id: id });
  },
};


// ── Fixed Activity Slots ──────────────────────────────────────────────────────

const LS_FIXED_SLOTS = 'tt_fixed_slots';

export const fixedSlotApi = {
  getAll: async () => {
    const list = load(LS_FIXED_SLOTS) || [];
    return ok(list);
  },
  create: async (slotData) => {
    const list = load(LS_FIXED_SLOTS) || [];
    const record = {
      ...slotData,
      _id: newId(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    save(LS_FIXED_SLOTS, [...list, record]);
    return ok(record);
  },
  update: async (id, slotData) => {
    const list = load(LS_FIXED_SLOTS) || [];
    const idx = list.findIndex((s) => s._id === id);
    if (idx === -1) return fail('Fixed slot not found');
    list[idx] = { ...list[idx], ...slotData, _id: id };
    save(LS_FIXED_SLOTS, list);
    return ok(list[idx]);
  },
  delete: async (id) => {
    const list = (load(LS_FIXED_SLOTS) || []).filter((s) => s._id !== id);
    save(LS_FIXED_SLOTS, list);
    return ok({ _id: id });
  },
};

// ── Misc (kept for compatibility) ─────────────────────────────────────────────

export const exportApi = {
  toPDF: async () => ok({}),
  toExcel: async () => ok({}),
  fromExcel: async () => ok({}),
};

export const checkHealth = async () => ok({ status: 'local' });

/**
 * initializeApp — always succeeds (localStorage needs no connection).
 */
export const initializeApp = async () => ({
  success: true,
  message: 'Running in offline mode — data saved to browser localStorage',
});