// FixedActivitySlots.jsx
// Lets users pin specific day+time windows as activities (Assembly, Sports, etc.)
// These slots are reserved before the scheduler places any subjects.
import { useState, useEffect } from 'react'
import { Lock, Plus, Trash2, Edit2, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { fixedSlotApi } from '../../../services/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const ACTIVITY_TYPES = [
      'Activity',
      'Assembly',
      'Sports',
      'Library',
      'Seminar',
      'Placement',
      'Mentoring',
      'Custom',
]

const SCOPE_OPTIONS = [
      { value: 'College', label: 'All Sections (College-wide)' },
      { value: 'Branch', label: 'Entire Branch' },
      { value: 'Semester', label: 'Specific Semester' },
      { value: 'Section', label: 'Specific Section' },
]

const EMPTY_FORM = {
      activityName: '',
      activityType: 'Activity',
      day: 'Monday',
      startTime: '08:00',
      endTime: '09:00',
      scope: 'College',
      branch: '',
      semester: '',
      section: '',
      facultyName: '',
      roomName: '',
      notes: '',
}

// ── colour badges ─────────────────────────────────────────────────────────────
const TYPE_COLORS = {
      Assembly: 'bg-purple-100 text-purple-800 border-purple-200',
      Sports: 'bg-green-100 text-green-800 border-green-200',
      Library: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Seminar: 'bg-blue-100 text-blue-800 border-blue-200',
      Placement: 'bg-orange-100 text-orange-800 border-orange-200',
      Mentoring: 'bg-teal-100 text-teal-800 border-teal-200',
      Activity: 'bg-gray-100 text-gray-700 border-gray-200',
      Custom: 'bg-pink-100 text-pink-800 border-pink-200',
}

const scopeLabel = (slot) => {
      if (slot.scope === 'College') return 'College-wide'
      if (slot.scope === 'Branch') return `Branch: ${slot.branch || '?'}`
      if (slot.scope === 'Semester') return `Sem ${slot.semester || '?'} · ${slot.branch || '?'}`
      if (slot.scope === 'Section') return `${slot.branch || '?'}-${slot.section || '?'} · Sem ${slot.semester || '?'}`
      return slot.scope
}

// ── small helper to validate form ────────────────────────────────────────────
const validate = (form) => {
      const errs = []
      if (!form.activityName.trim()) errs.push('Activity name is required.')
      if (!form.day) errs.push('Day is required.')
      if (!form.startTime) errs.push('Start time is required.')
      if (!form.endTime) errs.push('End time is required.')
      if (form.startTime >= form.endTime) errs.push('End time must be after start time.')
      if ((form.scope === 'Branch' || form.scope === 'Semester' || form.scope === 'Section') && !form.branch.trim()) {
            errs.push('Branch is required for the selected scope.')
      }
      if ((form.scope === 'Semester' || form.scope === 'Section') && !form.semester.toString().trim()) {
            errs.push('Semester is required for the selected scope.')
      }
      if (form.scope === 'Section' && !form.section.trim()) {
            errs.push('Section is required for the selected scope.')
      }
      return errs
}

// ── Form Modal ────────────────────────────────────────────────────────────────
function SlotFormModal({ initial, onSave, onClose }) {
      const [form, setForm] = useState(initial || EMPTY_FORM)
      const [errors, setErrors] = useState([])
      const [saving, setSaving] = useState(false)

      const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

      const handleSubmit = async () => {
            const errs = validate(form)
            if (errs.length) { setErrors(errs); return }
            setSaving(true)
            await onSave(form)
            setSaving(false)
      }

      return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                              <div className="flex items-center gap-2">
                                    <Lock size={18} className="text-indigo-600" />
                                    <h3 className="font-bold text-gray-900">{initial?._id ? 'Edit Fixed Slot' : 'Add Fixed Activity Slot'}</h3>
                              </div>
                              <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X size={16} /></button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                              {errors.length > 0 && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                                          {errors.map((e, i) => (
                                                <p key={i} className="text-xs text-red-700 flex items-start gap-1">
                                                      <AlertCircle size={12} className="mt-0.5 shrink-0" />{e}
                                                </p>
                                          ))}
                                    </div>
                              )}

                              {/* Activity Name + Type */}
                              <div className="grid grid-cols-2 gap-3">
                                    <div>
                                          <label className="text-sm font-medium text-gray-700 block mb-1">Activity Name *</label>
                                          <input
                                                type="text"
                                                value={form.activityName}
                                                onChange={e => set('activityName', e.target.value)}
                                                placeholder="e.g. Morning Assembly"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                          />
                                    </div>
                                    <div>
                                          <label className="text-sm font-medium text-gray-700 block mb-1">Activity Type</label>
                                          <select value={form.activityType} onChange={e => set('activityType', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                          </select>
                                    </div>
                              </div>

                              {/* Day + Times */}
                              <div className="grid grid-cols-3 gap-3">
                                    <div>
                                          <label className="text-sm font-medium text-gray-700 block mb-1">Day *</label>
                                          <select value={form.day} onChange={e => set('day', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                          </select>
                                    </div>
                                    <div>
                                          <label className="text-sm font-medium text-gray-700 block mb-1">Start Time *</label>
                                          <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    </div>
                                    <div>
                                          <label className="text-sm font-medium text-gray-700 block mb-1">End Time *</label>
                                          <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    </div>
                              </div>

                              {/* Scope */}
                              <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Applies To (Scope)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                          {SCOPE_OPTIONS.map(opt => (
                                                <button key={opt.value} type="button"
                                                      onClick={() => set('scope', opt.value)}
                                                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition
                    ${form.scope === opt.value
                                                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                                                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                                      {opt.label}
                                                </button>
                                          ))}
                                    </div>
                              </div>

                              {/* Scope fields */}
                              {(form.scope === 'Branch' || form.scope === 'Semester' || form.scope === 'Section') && (
                                    <div className="grid grid-cols-3 gap-3">
                                          <div>
                                                <label className="text-sm font-medium text-gray-700 block mb-1">Branch *</label>
                                                <input type="text" value={form.branch} onChange={e => set('branch', e.target.value.toUpperCase())}
                                                      placeholder="e.g. CSE"
                                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                          </div>
                                          {(form.scope === 'Semester' || form.scope === 'Section') && (
                                                <div>
                                                      <label className="text-sm font-medium text-gray-700 block mb-1">Semester *</label>
                                                      <input type="number" min="1" max="8" value={form.semester}
                                                            onChange={e => set('semester', e.target.value)}
                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                                </div>
                                          )}
                                          {form.scope === 'Section' && (
                                                <div>
                                                      <label className="text-sm font-medium text-gray-700 block mb-1">Section *</label>
                                                      <input type="text" value={form.section} onChange={e => set('section', e.target.value.toUpperCase())}
                                                            placeholder="e.g. A"
                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                                </div>
                                          )}
                                    </div>
                              )}

                              {/* Optional: Faculty + Room */}
                              <div className="grid grid-cols-2 gap-3">
                                    <div>
                                          <label className="text-sm font-medium text-gray-700 block mb-1">Faculty (optional)</label>
                                          <input type="text" value={form.facultyName} onChange={e => set('facultyName', e.target.value)}
                                                placeholder="Faculty name"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    </div>
                                    <div>
                                          <label className="text-sm font-medium text-gray-700 block mb-1">Room / Venue (optional)</label>
                                          <input type="text" value={form.roomName} onChange={e => set('roomName', e.target.value)}
                                                placeholder="e.g. Auditorium"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    </div>
                              </div>

                              {/* Notes */}
                              <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
                                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                                          rows={2} placeholder="Any additional notes..."
                                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                              </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                              <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
                              <button onClick={handleSubmit} disabled={saving}
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                                    <CheckCircle size={14} />
                                    {saving ? 'Saving…' : (initial?._id ? 'Update Slot' : 'Add Slot')}
                              </button>
                        </div>
                  </div>
            </div>
      )
}

// ── Main FixedActivitySlots component ─────────────────────────────────────────
export default function FixedActivitySlots({ onSlotsChange }) {
      const [slots, setSlots] = useState([])
      const [isOpen, setIsOpen] = useState(false)
      const [showModal, setShowModal] = useState(false)
      const [editing, setEditing] = useState(null)
      const [deleting, setDeleting] = useState(null)
      const [toast, setToast] = useState(null)

      // Load from localStorage on mount
      useEffect(() => {
            fixedSlotApi.getAll().then(res => {
                  if (res.success) {
                        setSlots(res.data || [])
                        if (onSlotsChange) onSlotsChange(res.data || [])
                  }
            })
      }, [])

      const showToast = (msg, type = 'success') => {
            setToast({ msg, type })
            setTimeout(() => setToast(null), 3000)
      }

      const handleSave = async (formData) => {
            const payload = {
                  ...formData,
                  type: formData.activityType || 'Activity',
                  locked: true,
                  isActive: true,
            }

            if (editing?._id) {
                  const res = await fixedSlotApi.update(editing._id, payload)
                  if (res.success) {
                        const updated = slots.map(s => s._id === editing._id ? res.data : s)
                        setSlots(updated)
                        if (onSlotsChange) onSlotsChange(updated)
                        showToast('Slot updated successfully.')
                  }
            } else {
                  const res = await fixedSlotApi.create(payload)
                  if (res.success) {
                        const updated = [...slots, res.data]
                        setSlots(updated)
                        if (onSlotsChange) onSlotsChange(updated)
                        showToast('Fixed slot added.')
                  }
            }
            setShowModal(false)
            setEditing(null)
      }

      const handleDelete = async (id) => {
            const res = await fixedSlotApi.delete(id)
            if (res.success) {
                  const updated = slots.filter(s => s._id !== id)
                  setSlots(updated)
                  if (onSlotsChange) onSlotsChange(updated)
                  showToast('Slot removed.')
            }
            setDeleting(null)
      }

      const openAdd = () => { setEditing(null); setShowModal(true) }
      const openEdit = (slot) => { setEditing(slot); setShowModal(true) }

      // Group slots by day for display
      const byDay = DAYS.reduce((acc, day) => {
            acc[day] = slots.filter(s => s.day === day)
            return acc
      }, {})

      const hasSlots = slots.length > 0

      return (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Section header — collapsible */}
                  <button
                        type="button"
                        onClick={() => setIsOpen(v => !v)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                        <div className="flex items-center gap-3">
                              <div className="bg-indigo-100 p-2 rounded-lg">
                                    <Lock size={18} className="text-indigo-600" />
                              </div>
                              <div className="text-left">
                                    <h3 className="text-base font-semibold text-gray-900">Fixed Activity Slots</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                          Pin Assembly, Sports, Library etc. to specific day+time — scheduler will skip these slots.
                                          {hasSlots && <span className="ml-1 font-medium text-indigo-600">{slots.length} slot{slots.length !== 1 ? 's' : ''} configured</span>}
                                    </p>
                              </div>
                        </div>
                        <div className="flex items-center gap-2">
                              {hasSlots && (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                          {slots.length}
                                    </span>
                              )}
                              {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                        </div>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                        <div className="border-t border-gray-100">
                              {/* Toolbar */}
                              <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                          These time windows will be blocked in the generated timetable.
                                    </p>
                                    <button
                                          type="button"
                                          onClick={openAdd}
                                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition"
                                    >
                                          <Plus size={13} /> Add Fixed Slot
                                    </button>
                              </div>

                              {/* Slot list */}
                              {slots.length === 0 ? (
                                    <div className="px-6 py-8 text-center">
                                          <Lock size={32} className="mx-auto text-gray-300 mb-2" />
                                          <p className="text-sm text-gray-500">No fixed slots yet.</p>
                                          <p className="text-xs text-gray-400 mt-1">Add slots for recurring activities like Assembly, Sports, or Library periods.</p>
                                          <button
                                                type="button"
                                                onClick={openAdd}
                                                className="mt-4 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 mx-auto"
                                          >
                                                <Plus size={14} /> Add your first fixed slot
                                          </button>
                                    </div>
                              ) : (
                                    <div className="divide-y divide-gray-100">
                                          {DAYS.filter(d => byDay[d].length > 0).map(day => (
                                                <div key={day} className="px-6 py-3">
                                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{day}</p>
                                                      <div className="space-y-2">
                                                            {byDay[day].map(slot => (
                                                                  <div key={slot._id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                                                                        {/* Time pill */}
                                                                        <div className="shrink-0 text-center bg-white border border-gray-200 rounded-lg px-2 py-1 min-w-[80px]">
                                                                              <p className="text-xs font-bold text-gray-800">{slot.startTime}</p>
                                                                              <p className="text-xs text-gray-400">–{slot.endTime}</p>
                                                                        </div>

                                                                        {/* Type badge */}
                                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${TYPE_COLORS[slot.activityType] || TYPE_COLORS.Activity}`}>
                                                                              {slot.activityType}
                                                                        </span>

                                                                        {/* Name + scope */}
                                                                        <div className="flex-1 min-w-0">
                                                                              <p className="text-sm font-semibold text-gray-800 truncate">{slot.activityName}</p>
                                                                              <p className="text-xs text-gray-500">{scopeLabel(slot)}{slot.roomName ? ` · ${slot.roomName}` : ''}</p>
                                                                        </div>

                                                                        {/* Actions */}
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                              <button
                                                                                    onClick={() => openEdit(slot)}
                                                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                                                    title="Edit"
                                                                              >
                                                                                    <Edit2 size={14} />
                                                                              </button>
                                                                              <button
                                                                                    onClick={() => setDeleting(slot._id)}
                                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                                                    title="Delete"
                                                                              >
                                                                                    <Trash2 size={14} />
                                                                              </button>
                                                                        </div>
                                                                  </div>
                                                            ))}
                                                      </div>
                                                </div>
                                          ))}
                                    </div>
                              )}
                        </div>
                  )}

                  {/* Add/Edit Modal */}
                  {showModal && (
                        <SlotFormModal
                              initial={editing}
                              onSave={handleSave}
                              onClose={() => { setShowModal(false); setEditing(null) }}
                        />
                  )}

                  {/* Delete confirm */}
                  {deleting && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
                              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                          <div className="bg-red-100 p-2 rounded-full"><AlertCircle size={20} className="text-red-600" /></div>
                                          <h3 className="font-bold text-gray-900">Remove Fixed Slot?</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-6">This slot will no longer be blocked in generated timetables.</p>
                                    <div className="flex justify-end gap-3">
                                          <button onClick={() => setDeleting(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                                          <button onClick={() => handleDelete(deleting)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">Remove</button>
                                    </div>
                              </div>
                        </div>
                  )}

                  {/* Toast */}
                  {toast && (
                        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                              <CheckCircle size={16} />
                              {toast.msg}
                        </div>
                  )}
            </div>
      )
}
