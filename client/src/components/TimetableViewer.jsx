// TimetableViewer.jsx — Multi-timetable viewer with per-section Excel-grid layout
import { useState, useMemo, useRef, useCallback } from 'react'
import { X, Download, Printer, Filter, Search, Edit3, CheckCircle, AlertCircle } from 'lucide-react'
import ExcelJS from 'exceljs'

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_ABBR = { Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED', Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT' }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toMin(hhmm = '00:00') {
      const [h, m] = hhmm.split(':').map(Number)
      return h * 60 + (m || 0)
}
function toHHMM(mins) {
      return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

function buildSlotList(timing) {
      if (!timing) return []
      const slots = []
      const [sh, sm] = (timing.startTime || '08:00').split(':').map(Number)
      const [eh, em] = (timing.endTime || '16:00').split(':').map(Number)
      const lunchStart = timing.lunchBreak?.startTime || '13:00'
      const lunchEnd = timing.lunchBreak?.endTime || '13:30'
      const dur = timing.lectureDuration || 50
      let cursor = sh * 60 + sm
      const end = eh * 60 + em
      const lsMin = toMin(lunchStart)
      const leMin = toMin(lunchEnd)
      let lectNum = 1
      while (cursor < end - 10) {
            if (cursor >= lsMin && cursor < leMin) {
                  slots.push({ type: 'lunch', startTime: toHHMM(cursor), endTime: lunchEnd, label: 'LUNCH', lectureNo: null })
                  cursor = leMin
                  continue
            }
            if (cursor + dur > lsMin && cursor < lsMin) { cursor = lsMin; continue }
            const endT = cursor + dur
            if (endT > end) break
            slots.push({ type: 'lecture', startTime: toHHMM(cursor), endTime: toHHMM(endT), lectureNo: lectNum++ })
            cursor = endT
      }
      return slots
}

function facultyShort(nameOrObj, allFaculty = []) {
      const raw = typeof nameOrObj === 'string' ? nameOrObj : (nameOrObj?.name || '')
      if (!raw || raw === 'TBD') return 'TBD'
      const found = allFaculty.find(f => f.name === raw || f._id === nameOrObj)
      if (found?.shortName) return found.shortName.toUpperCase()
      const parts = raw.trim().split(/\s+/)
      const prefix = parts[0].replace(/\./g, '').toUpperCase()
      if (['DR', 'PROF', 'MR', 'MRS', 'MS'].includes(prefix)) {
            return parts.slice(1).map(p => p[0]?.toUpperCase() || '').join('')
      }
      return parts.map(p => p[0]?.toUpperCase() || '').join('')
}

function getActiveDays(slots, timing) {
      const wd = timing?.workingDays || {}
      const fromSlots = new Set(slots.map(s => s.day).filter(Boolean))
      return DAYS.filter(d => {
            const key = d.toLowerCase()
            return fromSlots.has(d) || wd[key] === true
      })
}

function findNextConsecutiveLectureIndex(slotList, index) {
      const current = slotList[index]
      if (!current || current.type !== 'lecture') return -1
      for (let ni = index + 1; ni < slotList.length; ni++) {
            const next = slotList[ni]
            if (next.type !== 'lecture') continue
            if (next.startTime === current.endTime) return ni
      }
      return -1
}

function buildSectionSlotMap(slots, branch, section, semester) {
      const map = {}
      slots.forEach(s => {
            if (s.type === 'lunch') return
            if (s.branch !== branch || s.section !== section) return
            if (s.semester !== undefined && s.semester !== null && Number(s.semester) !== Number(semester)) return
            const key = `${s.day}|${s.startTime}`
            if (!map[key]) map[key] = []
            map[key].push(s)
      })
      return map
}

function downloadBlob(blob, fileName) {
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, fileName)
            return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      const clickEvent = new MouseEvent('click', { view: window, bubbles: true, cancelable: true })
      a.dispatchEvent(clickEvent)
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 200)
}

function getSemesterTypeLabel(type) {
      if (!type || typeof type !== 'string') return 'Semester'
      const normalized = type.toLowerCase()
      if (normalized === 'odd') return 'Odd Semester'
      if (normalized === 'even') return 'Even Semester'
      if (normalized === 'all') return 'All Semesters'
      return type.charAt(0).toUpperCase() + type.slice(1)
}

function getSemesterTypeShortLabel(type) {
      if (!type || typeof type !== 'string') return 'Sem'
      const normalized = type.toLowerCase()
      if (normalized === 'odd') return 'Odd_Sem'
      if (normalized === 'even') return 'Even_Sem'
      if (normalized === 'all') return 'All_Sem'
      return normalized.replace(/\s+/g, '_')
}

function formatExportFilename(collegeName, semesterType, extension) {
      const college = (collegeName || 'College').replace(/\s+/g, '_').replace(/[^\w\-]/g, '')
      const semester = getSemesterTypeShortLabel(semesterType)
      const year = new Date().getFullYear()
      return `${college}_${semester}_Timetable_${year}.${extension}`
}

function escapeCsvValue(value) {
      const raw = value == null ? '' : String(value)
      return `"${raw.replace(/"/g, '""')}"`
}

// ─── Conflict validator ───────────────────────────────────────────────────────
function validateChange(slots, changedSlotId, newFacultyName) {
      const changed = slots.find(s => s.id === changedSlotId)
      if (!changed) return []
      const conflicts = []
      slots.forEach(s => {
            if (s.id === changedSlotId || s.type === 'lunch') return
            if (s.day === changed.day && s.startTime === changed.startTime) {
                  if (newFacultyName && s.facultyName === newFacultyName && s.facultyName !== 'TBD') {
                        conflicts.push(`${newFacultyName} already has a class at ${changed.startTime} on ${changed.day}`)
                  }
            }
      })
      return conflicts
}

// ─── Theory Cell — full content: SubjectName, SubjectCode, Faculty, Room ─────
function TheoryCell({ slot, onEdit }) {
      if (!slot) return <td className="tt-cell tt-empty" />
      // Fixed activity slot — distinct appearance
      if (slot.isFixed || slot.type === 'Activity' || slot.type === 'Assembly' || slot.type === 'Sports' ||
            slot.type === 'Library' || slot.type === 'Seminar' || slot.type === 'Placement' || slot.type === 'Mentoring') {
            return (
                  <td className="tt-cell tt-activity" title={slot.notes || ''}>
                        <span className="tt-activity-badge">{slot.type || 'Activity'}</span>
                        <span className="tt-subject">{slot.subjectName || slot.activityName || '—'}</span>
                        {slot.facultyName && <span className="tt-faculty">{slot.facultyName}</span>}
                        {slot.room && <span className="tt-room">{slot.room}</span>}
                        {slot.isLocked && <span className="tt-lock-icon">🔒</span>}
                  </td>
            )
      }
      return (
            <td className="tt-cell tt-theory group" onDoubleClick={() => onEdit && onEdit(slot)}>
                  <span className="tt-subject">{slot.subjectName || '—'}</span>
                  {slot.subjectCode && <span className="tt-code">({slot.subjectCode})</span>}
                  <span className="tt-faculty">{slot.facultyName || 'TBD'}</span>
                  {slot.room && <span className="tt-room">{slot.room}</span>}
                  {onEdit && <span className="tt-edit-hint group-hover:opacity-100"><Edit3 size={10} /></span>}
            </td>
      )
}

// ─── Practical Cell — merged 2 rows, full content per batch ──────────────────
function PracticalCell({ slotsB1, slotsB2, onEdit, rowSpan = 1 }) {
      const b1 = slotsB1?.[0]
      const b2 = slotsB2?.[0]
      if (!b1 && !b2) return null
      return (
            <td className="tt-cell tt-practical group" rowSpan={rowSpan} onDoubleClick={() => onEdit && onEdit(b1 || b2)}>
                  {b1 && (
                        <div className="tt-batch-row">
                              <span className="tt-batch-label">Batch-1</span>
                              <div className="tt-batch-content">
                                    <span className="tt-subject">{b1.subjectName || '—'}</span>
                                    {b1.subjectCode && <span className="tt-code">({b1.subjectCode})</span>}
                                    <span className="tt-faculty">{b1.facultyName || 'TBD'}</span>
                                    {b1.room && <span className="tt-room">{b1.room}</span>}
                              </div>
                        </div>
                  )}
                  {b1 && b2 && <div className="tt-batch-divider" />}
                  {b2 && (
                        <div className="tt-batch-row">
                              <span className="tt-batch-label">Batch-2</span>
                              <div className="tt-batch-content">
                                    <span className="tt-subject">{b2.subjectName || '—'}</span>
                                    {b2.subjectCode && <span className="tt-code">({b2.subjectCode})</span>}
                                    <span className="tt-faculty">{b2.facultyName || 'TBD'}</span>
                                    {b2.room && <span className="tt-room">{b2.room}</span>}
                              </div>
                        </div>
                  )}
                  {onEdit && <span className="tt-edit-hint group-hover:opacity-100"><Edit3 size={10} /></span>}
            </td>
      )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ slot, allSlots, allFaculty, allSubjects, onSave, onClose }) {
      const [facultyName, setFacultyName] = useState(slot.facultyName || '')
      const [subjectCode, setSubjectCode] = useState(slot.subjectCode || '')
      const [conflicts, setConflicts] = useState([])

      const validate = (fac, subj) => {
            setConflicts(validateChange(allSlots, slot.id, fac))
      }

      return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                              <h3 className="font-bold text-gray-900 text-lg">Edit Slot</h3>
                              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                              <div className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
                                    {slot.day} · {slot.startTime} · {slot.branch}-{slot.section}
                              </div>
                              <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Subject</label>
                                    <select value={subjectCode} onChange={e => { setSubjectCode(e.target.value); validate(facultyName, e.target.value) }}
                                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                                          <option value="">— Select Subject —</option>
                                          {allSubjects.map(s => <option key={s._id} value={s.subjectCode}>{s.subjectCode} — {s.subjectName}</option>)}
                                    </select>
                              </div>
                              <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Faculty</label>
                                    <select value={facultyName} onChange={e => { setFacultyName(e.target.value); validate(e.target.value, subjectCode) }}
                                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                                          <option value="">— Select Faculty —</option>
                                          {allFaculty.map(f => <option key={f._id} value={f.name}>{f.name}</option>)}
                                    </select>
                              </div>
                              {conflicts.length > 0 && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                          {conflicts.map((c, i) => (
                                                <p key={i} className="text-xs text-red-700 flex items-start gap-1"><AlertCircle size={12} className="mt-0.5 flex-shrink-0" />{c}</p>
                                          ))}
                                    </div>
                              )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                              <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
                              <button disabled={conflicts.length > 0} onClick={() => onSave(slot.id, { facultyName, subjectCode })}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
                                    <CheckCircle size={14} /> Save
                              </button>
                        </div>
                  </div>
            </div>
      )
}

// ─── Single Section Timetable Grid ───────────────────────────────────────────
function SectionTimetable({ branch, section, semester, slots, timing, allFaculty, allSubjects, activeDays, slotList, onEditSlot }) {
      const sectionSlotMap = useMemo(() =>
            buildSectionSlotMap(slots, branch, section, semester),
            [slots, branch, section, semester]
      )

      return (
            <div className="tt-section-wrapper mb-10">
                  <div className="tt-section-header">
                        <span className="font-bold">{branch}-{section}</span>
                        <span className="mx-2 opacity-60">|</span>
                        <span>Semester {semester}</span>
                        {timing?.collegeName && (
                              <>
                                    <span className="mx-2 opacity-60">|</span>
                                    <span>{timing.collegeName}</span>
                              </>
                        )}
                  </div>

                  <div className="overflow-x-auto">
                        <table className="tt-table">
                              <thead>
                                    <tr className="tt-header-row">
                                          <th className="tt-th tt-th-day">DAY</th>
                                          <th className="tt-th tt-th-time">TIME</th>
                                          <th className="tt-th tt-th-lec">LEC</th>
                                          <th className="tt-th" style={{ minWidth: 220 }}>CLASS</th>
                                    </tr>
                              </thead>
                              <tbody>
                                    {activeDays.map(day => {
                                          const dayRows = []
                                          let firstSlotInDay = true
                                          const dayRowCount = slotList.length
                                          // Reset per-day: tracks which slot indices are the 2nd row of a practical
                                          const skippedIndices = new Set()

                                          slotList.forEach((slot, si) => {
                                                const rowKey = `${day}-${si}`

                                                if (slot.type === 'lunch') {
                                                      dayRows.push(
                                                            <tr key={rowKey} className="tt-lunch-row">
                                                                  {firstSlotInDay && (
                                                                        <td className="tt-day-cell" rowSpan={dayRowCount}>
                                                                              <div className="tt-day-text">{DAY_ABBR[day] || day.slice(0, 3)}</div>
                                                                              <div className="tt-day-full">{day}</div>
                                                                        </td>
                                                                  )}
                                                                  <td className="tt-time-cell tt-lunch-time">{slot.startTime}–{slot.endTime}</td>
                                                                  <td className="tt-lec-cell tt-lunch-lec">—</td>
                                                                  <td className="tt-lunch-span">☕ LUNCH BREAK</td>
                                                            </tr>
                                                      )
                                                      firstSlotInDay = false
                                                      return
                                                }

                                                // If this slot index was marked as the 2nd row of a practical, skip cell — rowSpan handles it
                                                if (skippedIndices.has(si)) {
                                                      dayRows.push(
                                                            <tr key={rowKey} className="tt-data-row tt-practical-second-row">
                                                                  <td className="tt-time-cell">
                                                                        <div className="tt-time-range">{slot.startTime}</div>
                                                                        <div className="tt-time-range" style={{ opacity: 0.6 }}>–{slot.endTime}</div>
                                                                  </td>
                                                                  <td className="tt-lec-cell">L{slot.lectureNo}</td>
                                                                  {/* No class cell — covered by rowSpan=2 above */}
                                                            </tr>
                                                      )
                                                      firstSlotInDay = false
                                                      return
                                                }

                                                const cellSlots = sectionSlotMap[`${day}|${slot.startTime}`] || []
                                                const theories = cellSlots.filter(s => s.type !== 'Practical' && s.batch !== 'B2' && s.batch !== 'B1')
                                                const practB1 = cellSlots.filter(s => s.batch === 'B1')
                                                const practB2 = cellSlots.filter(s => s.batch === 'B2')

                                                let cell
                                                if (practB1.length > 0 || practB2.length > 0) {
                                                      const nextIdx = findNextConsecutiveLectureIndex(slotList, si)
                                                      if (nextIdx >= 0) skippedIndices.add(nextIdx)
                                                      const rowSpan = nextIdx >= 0 ? 2 : 1
                                                      cell = <PracticalCell key={`pc-${day}-${si}`} slotsB1={practB1} slotsB2={practB2} onEdit={onEditSlot} rowSpan={rowSpan} />
                                                } else if (theories.length > 0) {
                                                      cell = <TheoryCell key={`tc-${day}-${si}`} slot={theories[0]} onEdit={onEditSlot} />
                                                } else {
                                                      cell = <td key={`em-${day}-${si}`} className="tt-cell tt-empty" />
                                                }

                                                dayRows.push(
                                                      <tr key={rowKey} className="tt-data-row">
                                                            {firstSlotInDay && (
                                                                  <td className="tt-day-cell" rowSpan={dayRowCount}>
                                                                        <div className="tt-day-text">{DAY_ABBR[day] || day.slice(0, 3)}</div>
                                                                        <div className="tt-day-full">{day}</div>
                                                                  </td>
                                                            )}
                                                            <td className="tt-time-cell">
                                                                  <div className="tt-time-range">{slot.startTime}</div>
                                                                  <div className="tt-time-range" style={{ opacity: 0.6 }}>–{slot.endTime}</div>
                                                            </td>
                                                            <td className="tt-lec-cell">L{slot.lectureNo}</td>
                                                            {cell}
                                                      </tr>
                                                )
                                                firstSlotInDay = false
                                          })

                                          return dayRows
                                    })}
                              </tbody>
                        </table>
                  </div>
            </div>
      )
}

// ─── Semester-level timetable with all sections sharing one grid ───────────
function SemesterTimetable({ semester, groups, slots, timing, allFaculty, allSubjects, activeDays, slotList, onEditSlot }) {
      const sectionMaps = useMemo(() => {
            const map = {}
            groups.forEach(({ branch, section }) => {
                  const key = `${branch}-${section}`
                  map[key] = buildSectionSlotMap(slots, branch, section, semester)
            })
            return map
      }, [slots, groups, semester])

      const sectionLabels = groups
            .slice()
            .sort((a, b) => `${a.branch}-${a.section}`.localeCompare(`${b.branch}-${b.section}`))
            .map(g => `${g.branch}-${g.section}`)

      return (
            <div className="tt-semester-wrapper mb-10">
                  <div className="tt-semester-header">
                        <div className="tt-semester-title">Semester {semester}</div>
                        <div className="tt-semester-meta">Sections: {sectionLabels.join(', ')}</div>
                  </div>
                  <div className="overflow-x-auto">
                        <table className="tt-table tt-semester-table">
                              <thead>
                                    <tr className="tt-header-row">
                                          <th className="tt-th tt-th-day">DAY</th>
                                          <th className="tt-th tt-th-time">TIME</th>
                                          <th className="tt-th tt-th-lec">LEC</th>
                                          {sectionLabels.map(label => (
                                                <th key={label} className="tt-th tt-th-section">{label}</th>
                                          ))}
                                    </tr>
                              </thead>
                              <tbody>
                                    {activeDays.map(day => {
                                          const dayRows = []
                                          let firstSlotInDay = true
                                          const skipped = sectionLabels.reduce((acc, label) => {
                                                acc[label] = new Set()
                                                return acc
                                          }, {})

                                          slotList.forEach((slot, si) => {
                                                const rowKey = `${semester}-${day}-${si}`

                                                if (slot.type === 'lunch') {
                                                      dayRows.push(
                                                            <tr key={rowKey} className="tt-lunch-row">
                                                                  {firstSlotInDay && (
                                                                        <td className="tt-day-cell" rowSpan={slotList.length}>
                                                                              <div className="tt-day-text">{DAY_ABBR[day] || day.slice(0, 3)}</div>
                                                                              <div className="tt-day-full">{day}</div>
                                                                        </td>
                                                                  )}
                                                                  <td className="tt-time-cell tt-lunch-time">{slot.startTime}–{slot.endTime}</td>
                                                                  <td className="tt-lec-cell tt-lunch-lec">—</td>
                                                                  <td className="tt-lunch-span" colSpan={sectionLabels.length}>☕ LUNCH BREAK</td>
                                                            </tr>
                                                      )
                                                      firstSlotInDay = false
                                                      return
                                                }

                                                const sectionCells = sectionLabels.map(sectionKey => {
                                                      if (skipped[sectionKey].has(si)) {
                                                            return null
                                                      }

                                                      const cellSlots = sectionMaps[sectionKey]?.[`${day}|${slot.startTime}`] || []
                                                      const theories = cellSlots.filter(s => s.type !== 'Practical' && s.batch !== 'B2' && s.batch !== 'B1')
                                                      const practB1 = cellSlots.filter(s => s.batch === 'B1')
                                                      const practB2 = cellSlots.filter(s => s.batch === 'B2')

                                                      if (practB1.length > 0 || practB2.length > 0) {
                                                            const nextIdx = findNextConsecutiveLectureIndex(slotList, si)
                                                            if (nextIdx >= 0) skipped[sectionKey].add(nextIdx)
                                                            const rowSpan = nextIdx >= 0 ? 2 : 1
                                                            return (
                                                                  <PracticalCell key={`${sectionKey}-${day}-${si}`} slotsB1={practB1} slotsB2={practB2} onEdit={onEditSlot} rowSpan={rowSpan} />
                                                            )
                                                      }

                                                      if (theories.length > 0) {
                                                            return <TheoryCell key={`${sectionKey}-${day}-${si}`} slot={theories[0]} onEdit={onEditSlot} />
                                                      }

                                                      return <td key={`${sectionKey}-${day}-${si}`} className="tt-cell tt-empty" />
                                                })

                                                dayRows.push(
                                                      <tr key={rowKey} className="tt-data-row">
                                                            {firstSlotInDay && (
                                                                  <td className="tt-day-cell" rowSpan={slotList.length}>
                                                                        <div className="tt-day-text">{DAY_ABBR[day] || day.slice(0, 3)}</div>
                                                                        <div className="tt-day-full">{day}</div>
                                                                  </td>
                                                            )}
                                                            <td className="tt-time-cell">
                                                                  <div className="tt-time-range">{slot.startTime}</div>
                                                                  <div className="tt-time-range" style={{ opacity: 0.6 }}>–{slot.endTime}</div>
                                                            </td>
                                                            <td className="tt-lec-cell">L{slot.lectureNo}</td>
                                                            {sectionCells}
                                                      </tr>
                                                )
                                                firstSlotInDay = false
                                          })

                                          return dayRows
                                    })}
                              </tbody>
                        </table>
                  </div>
            </div>
      )
}

// ─── Export to Excel (one sheet per section, merged practical cells) ──────────
async function exportToExcel(timetable, slotList, groups, activeDays) {
      if (!timetable || !Array.isArray(timetable.slots) || timetable.slots.length === 0) {
            throw new Error('No timetable available to export.')
      }

      const ct = timetable.collegeTiming || {}
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Timetable Generator'
      wb.created = new Date()

      groups.forEach(({ branch, section, semester }) => {
            const sMap = buildSectionSlotMap(timetable.slots, branch, section, semester)
            const sheetName = `SEM${semester}-${branch}-${section}`.slice(0, 31)
            const ws = wb.addWorksheet(sheetName)

            ws.columns = [
                  { header: 'Day', key: 'day', width: 14 },
                  { header: 'Time', key: 'time', width: 16 },
                  { header: 'Lecture', key: 'lecture', width: 10 },
                  { header: 'Semester', key: 'semester', width: 10 },
                  { header: 'Branch', key: 'branch', width: 12 },
                  { header: 'Section', key: 'section', width: 10 },
                  { header: 'Subject Code', key: 'subjectCode', width: 18 },
                  { header: 'Subject Name', key: 'subjectName', width: 28 },
                  { header: 'Faculty Name', key: 'facultyName', width: 20 },
                  { header: 'Faculty ID', key: 'facultyId', width: 14 },
                  { header: 'Room', key: 'room', width: 16 },
                  { header: 'Type', key: 'type', width: 12 },
                  { header: 'Batch', key: 'batch', width: 12 },
            ]

            const titleRow = ws.addRow([`${ct.collegeName || 'College Name'}`])
            titleRow.font = { size: 14, bold: true }
            ws.mergeCells(1, 1, 1, ws.columns.length)
            const subtitleRow = ws.addRow([`${getSemesterTypeLabel(ct.semesterType)} Timetable`])
            subtitleRow.font = { size: 12, italic: true }
            ws.mergeCells(2, 1, 2, ws.columns.length)
            ws.addRow([])

            const header = ws.addRow(ws.columns.map(col => col.header))
            header.eachCell(cell => {
                  cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF1E3A5F' },
                  }
                  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
                  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                  cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                  }
            })

            activeDays.forEach(day => {
                  const dayRows = []
                  slotList.forEach(slot => {
                        if (slot.type === 'lunch') {
                              const row = ws.addRow({
                                    day,
                                    time: `${slot.startTime}-${slot.endTime}`,
                                    lecture: '—',
                                    semester,
                                    branch,
                                    section,
                                    subjectCode: '',
                                    subjectName: 'LUNCH BREAK',
                                    facultyName: '',
                                    facultyId: '',
                                    room: '',
                                    type: 'Break',
                                    batch: '',
                              })
                              row.eachCell(cell => {
                                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                                    cell.border = {
                                          top: { style: 'thin' },
                                          left: { style: 'thin' },
                                          bottom: { style: 'thin' },
                                          right: { style: 'thin' },
                                    }
                              })
                              dayRows.push(row)
                              return
                        }

                        const cellSlots = sMap[`${day}|${slot.startTime}`] || []
                        const theorySlots = cellSlots.filter(s => s.type !== 'Practical')
                        const practicalB1 = cellSlots.filter(s => s.batch === 'B1')
                        const practicalB2 = cellSlots.filter(s => s.batch === 'B2')

                        if (practicalB1.length || practicalB2.length) {
                              const combined = [...practicalB1, ...practicalB2]
                              const row = ws.addRow({
                                    day,
                                    time: `${slot.startTime}-${slot.endTime}`,
                                    lecture: `L${slot.lectureNo}`,
                                    semester,
                                    branch,
                                    section,
                                    subjectCode: combined.map(s => s.subjectCode || '').join(' / '),
                                    subjectName: combined.map(s => `${s.subjectName || ''}`).join(' / '),
                                    facultyName: combined.map(s => s.facultyName || '').join(' / '),
                                    facultyId: combined.map(s => s.facultyId || '').join(' / '),
                                    room: combined.map(s => s.room || '').join(' / '),
                                    type: combined.map(s => s.type || '').join(' / '),
                                    batch: combined.map(s => s.batch || '').join(' / '),
                              })
                              row.eachCell(cell => {
                                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                                    cell.border = {
                                          top: { style: 'thin' },
                                          left: { style: 'thin' },
                                          bottom: { style: 'thin' },
                                          right: { style: 'thin' },
                                    }
                              })
                              dayRows.push(row)
                              return
                        }

                        theorySlots.forEach(slotEntry => {
                              const row = ws.addRow({
                                    day,
                                    time: `${slot.startTime}-${slot.endTime}`,
                                    lecture: `L${slot.lectureNo}`,
                                    semester,
                                    branch,
                                    section,
                                    subjectCode: slotEntry.subjectCode || '',
                                    subjectName: slotEntry.subjectName || '',
                                    facultyName: slotEntry.facultyName || '',
                                    facultyId: slotEntry.facultyId || '',
                                    room: slotEntry.room || '',
                                    type: slotEntry.type || '',
                                    batch: slotEntry.batch || '',
                              })
                              row.eachCell(cell => {
                                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                                    cell.border = {
                                          top: { style: 'thin' },
                                          left: { style: 'thin' },
                                          bottom: { style: 'thin' },
                                          right: { style: 'thin' },
                                    }
                              })
                              dayRows.push(row)
                        })
                  })

                  if (dayRows.length > 1) {
                        const startRow = dayRows[0].number
                        const endRow = dayRows[dayRows.length - 1].number
                        ws.mergeCells(startRow, 1, endRow, 1)
                        const mergedDayCell = ws.getCell(startRow, 1)
                        mergedDayCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                  }
            })

            ws.eachRow({ includeEmpty: false }, row => {
                  row.height = 24
            })

            ws.columns.forEach(column => {
                  let maxLength = 12
                  column.eachCell({ includeEmpty: true }, cell => {
                        const value = cell.value
                        const text = value == null ? '' : value.toString()
                        maxLength = Math.max(maxLength, Math.min(50, text.length + 2))
                  })
                  column.width = Math.max(column.width || 12, maxLength)
            })
      })

      if (groups.length === 0 || activeDays.length === 0) {
            throw new Error('No filtered timetable data available to export.')
      }

      const fileName = formatExportFilename(ct.collegeName, ct.semesterType, 'xlsx')
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      downloadBlob(blob, fileName)
}

// ─── Export current view to CSV ───────────────────────────────────────────────
async function exportToCSV(timetable, slotList, visibleGroups, activeDays) {
      if (!timetable || !Array.isArray(timetable.slots) || timetable.slots.length === 0) {
            throw new Error('No timetable available to export.')
      }
      if (visibleGroups.length === 0 || activeDays.length === 0) {
            throw new Error('No filtered timetable data available to export.')
      }
      if (!timetable || !Array.isArray(timetable.slots) || timetable.slots.length === 0) {
            throw new Error('No timetable available to export.')
      }

      const ct = timetable.collegeTiming || {}
      const rows = [[
            'Day',
            'Time',
            'Lecture',
            'Semester',
            'Branch',
            'Section',
            'Subject Code',
            'Subject Name',
            'Faculty Name',
            'Faculty ID',
            'Room',
            'Type',
            'Batch',
      ]]

      visibleGroups.forEach(({ branch, section, semester }) => {
            const sMap = buildSectionSlotMap(timetable.slots, branch, section, semester)
            activeDays.forEach(day => {
                  slotList.forEach(slot => {
                        if (slot.type === 'lunch') {
                              rows.push([
                                    day,
                                    `${slot.startTime}-${slot.endTime}`,
                                    '—',
                                    semester,
                                    branch,
                                    section,
                                    '',
                                    'LUNCH BREAK',
                                    '',
                                    '',
                                    '',
                                    'Break',
                                    '',
                              ])
                              return
                        }

                        const cellSlots = sMap[`${day}|${slot.startTime}`] || []
                        const practicalB1 = cellSlots.filter(s => s.batch === 'B1')
                        const practicalB2 = cellSlots.filter(s => s.batch === 'B2')
                        const theorySlots = cellSlots.filter(s => s.batch !== 'B1' && s.batch !== 'B2')

                        const entries = []
                        theorySlots.forEach(slotEntry => {
                              entries.push({
                                    day,
                                    time: `${slot.startTime}-${slot.endTime}`,
                                    lecture: `L${slot.lectureNo}`,
                                    semester,
                                    branch,
                                    section,
                                    subjectCode: slotEntry.subjectCode || '',
                                    subjectName: slotEntry.subjectName || '',
                                    facultyName: slotEntry.facultyName || '',
                                    facultyId: slotEntry.facultyId || '',
                                    room: slotEntry.room || '',
                                    type: slotEntry.type || '',
                                    batch: slotEntry.batch || '',
                              })
                        })
                        practicalB1.forEach(slotEntry => {
                              entries.push({
                                    day,
                                    time: `${slot.startTime}-${slot.endTime}`,
                                    lecture: `L${slot.lectureNo}`,
                                    semester,
                                    branch,
                                    section,
                                    subjectCode: slotEntry.subjectCode || '',
                                    subjectName: slotEntry.subjectName || '',
                                    facultyName: slotEntry.facultyName || '',
                                    facultyId: slotEntry.facultyId || '',
                                    room: slotEntry.room || '',
                                    type: slotEntry.type || '',
                                    batch: slotEntry.batch || '',
                              })
                        })
                        practicalB2.forEach(slotEntry => {
                              entries.push({
                                    day,
                                    time: `${slot.startTime}-${slot.endTime}`,
                                    lecture: `L${slot.lectureNo}`,
                                    semester,
                                    branch,
                                    section,
                                    subjectCode: slotEntry.subjectCode || '',
                                    subjectName: slotEntry.subjectName || '',
                                    facultyName: slotEntry.facultyName || '',
                                    facultyId: slotEntry.facultyId || '',
                                    room: slotEntry.room || '',
                                    type: slotEntry.type || '',
                                    batch: slotEntry.batch || '',
                              })
                        })

                        entries.forEach(entry => {
                              rows.push([
                                    entry.day,
                                    entry.time,
                                    entry.lecture,
                                    entry.semester,
                                    entry.branch,
                                    entry.section,
                                    entry.subjectCode,
                                    entry.subjectName,
                                    entry.facultyName,
                                    entry.facultyId,
                                    entry.room,
                                    entry.type,
                                    entry.batch,
                              ])
                        })
                  })
            })
      })

      const csvText = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n')
      const bom = '\uFEFF'
      const blob = new Blob([bom + csvText], { type: 'text/csv;charset=utf-8;' })
      downloadBlob(blob, formatExportFilename(ct.collegeName, ct.semesterType, 'csv'))
}

// ─── Main TimetableViewer Component ──────────────────────────────────────────
const TimetableViewer = ({ timetable, allSubjects = [], allFaculty = [], onClose, onUpdate }) => {
      const [localSlots, setLocalSlots] = useState(timetable?.slots || [])
      const [editingSlot, setEditingSlot] = useState(null)
      const [showFilters, setShowFilters] = useState(false)
      const [filters, setFilters] = useState({ semester: '', branch: '', section: '', faculty: '', subject: '', search: '' })
      const [isExportingCsv, setIsExportingCsv] = useState(false)
      const [isExportingExcel, setIsExportingExcel] = useState(false)
      const [exportError, setExportError] = useState('')
      const printRef = useRef(null)

      const ct = timetable?.collegeTiming || {}
      const slotList = useMemo(() => buildSlotList(ct), [ct])
      const activeDays = useMemo(() => getActiveDays(localSlots, ct), [localSlots, ct])

      // All groups from timetable.groups OR auto-detect from slots
      const allGroups = useMemo(() => {
            if (timetable?.groups?.length > 0) return timetable.groups
            // Fallback: derive from slots
            const seen = new Set()
            const arr = []
            localSlots.forEach(s => {
                  if (s.type === 'lunch') return
                  const key = `${s.branch}-${s.section}-${s.semester}`
                  if (!seen.has(key)) {
                        seen.add(key)
                        arr.push({ branch: s.branch, section: s.section, semester: Number(s.semester) })
                  }
            })
            arr.sort((a, b) => a.semester - b.semester || `${a.branch}-${a.section}`.localeCompare(`${b.branch}-${b.section}`))
            return arr
      }, [timetable, localSlots])

      // Unique values for filter dropdowns
      const semesterOptions = useMemo(() => [...new Set(allGroups.map(g => g.semester))].sort((a, b) => a - b), [allGroups])
      const branchOptions = useMemo(() => [...new Set(allGroups.map(g => g.branch))].sort(), [allGroups])
      const sectionOptions = useMemo(() => [...new Set(allGroups.map(g => g.section))].sort(), [allGroups])
      const facultyOptions = useMemo(() => [...new Set(localSlots.map(s => s.facultyName).filter(Boolean))].sort(), [localSlots])
      const subjectOptions = useMemo(() => [...new Set(localSlots.map(s => s.subjectName).filter(Boolean))].sort(), [localSlots])

      // Apply filters to groups
      const visibleGroups = useMemo(() => {
            return allGroups.filter(g => {
                  if (filters.semester && String(g.semester) !== String(filters.semester)) return false
                  if (filters.branch && g.branch !== filters.branch) return false
                  if (filters.section && g.section !== filters.section) return false
                  return true
            })
      }, [allGroups, filters])

      // Further filter slots by faculty/subject/search
      const filteredSlots = useMemo(() => {
            if (!filters.faculty && !filters.subject && !filters.search) return localSlots
            return localSlots.filter(s => {
                  if (filters.faculty && s.facultyName !== filters.faculty) return false
                  if (filters.subject && s.subjectName !== filters.subject) return false
                  if (filters.search) {
                        const q = filters.search.toLowerCase()
                        const match = (s.subjectName || '').toLowerCase().includes(q) ||
                              (s.facultyName || '').toLowerCase().includes(q) ||
                              (s.subjectCode || '').toLowerCase().includes(q)
                        if (!match) return false
                  }
                  return true
            })
      }, [localSlots, filters])

      const exportGroups = useMemo(() => {
            const groupsWithData = visibleGroups.filter(g => {
                  return filteredSlots.some(s =>
                        s.branch === g.branch &&
                        s.section === g.section &&
                        String(s.semester) === String(g.semester)
                  )
            })
            return groupsWithData.length > 0 ? groupsWithData : visibleGroups
      }, [visibleGroups, filteredSlots])

      const activeExportDays = useMemo(() => getActiveDays(filteredSlots, ct), [filteredSlots, ct])

      // Group visible groups by semester
      const groupsBySemester = useMemo(() => {
            const map = {}
            visibleGroups.forEach(g => {
                  if (!map[g.semester]) map[g.semester] = []
                  map[g.semester].push(g)
            })
            return map
      }, [visibleGroups])

      const handleEditSave = useCallback((slotId, updates) => {
            const fac = allFaculty.find(f => f.name === updates.facultyName)
            const newSlots = localSlots.map(s => {
                  if (s.id !== slotId) return s
                  return { ...s, ...updates, facultyShort: fac?.shortName?.toUpperCase() || facultyShort(updates.facultyName, allFaculty), facultyId: fac?._id || s.facultyId }
            })
            setLocalSlots(newSlots)
            setEditingSlot(null)
            if (onUpdate) onUpdate({ ...timetable, slots: newSlots })
      }, [localSlots, allFaculty, timetable, onUpdate])

      const handlePrint = () => window.print()

      const handleExportCsv = async () => {
            setExportError('')
            setIsExportingCsv(true)
            try {
                  await exportToCSV({ ...timetable, slots: filteredSlots }, slotList, exportGroups, activeExportDays)
            } catch (error) {
                  console.error('CSV export failed', error)
                  setExportError('Failed to generate CSV. Please try again.')
            } finally {
                  setIsExportingCsv(false)
            }
      }

      const handleExportExcel = async () => {
            setExportError('')
            setIsExportingExcel(true)
            try {
                  await exportToExcel({ ...timetable, slots: filteredSlots }, slotList, exportGroups, activeExportDays)
            } catch (error) {
                  console.error('Excel export failed', error)
                  setExportError('Failed to generate Excel. Please try again.')
            } finally {
                  setIsExportingExcel(false)
            }
      }

      const semesterTypeLabel = ct.semesterType === 'all'
            ? 'All Semesters'
            : ct.semesterType === 'even'
                  ? 'Even Semester'
                  : 'Odd Semester'

      if (!timetable) return null

      return (
            <div className="fixed inset-0 z-50 bg-white overflow-hidden flex flex-col">
                  {/* Edit Modal */}
                  {editingSlot && (
                        <EditModal slot={editingSlot} allSlots={localSlots} allFaculty={allFaculty} allSubjects={allSubjects}
                              onSave={handleEditSave} onClose={() => setEditingSlot(null)} />
                  )}

                  {/* Top Bar */}
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shadow-sm no-print flex-shrink-0">
                        <div className="flex items-center gap-3">
                              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                                    <X size={20} className="text-gray-600" />
                              </button>
                              <div>
                                    <h1 className="font-bold text-gray-900 text-lg leading-tight">{ct.collegeName || 'Timetable'}</h1>
                                    <p className="text-xs text-gray-500">{semesterTypeLabel} · {allGroups.length} group(s)</p>
                              </div>
                        </div>
                        <div className="flex items-center gap-2">
                              <button onClick={() => setShowFilters(f => !f)}
                                    className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition border ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                    <Filter size={14} /> Filters
                              </button>
                              <button onClick={handleExportCsv}
                                    disabled={isExportingCsv || !filteredSlots.length || !exportGroups.length}
                                    className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition ${isExportingCsv || !filteredSlots.length || !exportGroups.length ? 'bg-green-100 border border-green-200 text-green-300 cursor-not-allowed' : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'}`}>
                                    <Download size={14} /> {isExportingCsv ? 'Exporting CSV...' : 'CSV'}
                              </button>
                              <button onClick={handleExportExcel}
                                    disabled={isExportingExcel || !filteredSlots.length || !exportGroups.length}
                                    className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition ${isExportingExcel || !filteredSlots.length || !exportGroups.length ? 'bg-emerald-300 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                                    <Download size={14} /> {isExportingExcel ? 'Exporting Excel...' : 'Excel'}
                              </button>
                              <button onClick={handlePrint}
                                    className="px-3 py-2 bg-gray-700 text-white hover:bg-gray-800 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                    <Printer size={14} /> Print
                              </button>
                        </div>
                        {exportError && (
                              <div className="mt-2 text-sm text-red-600">{exportError}</div>
                        )}
                  </div>

                  {/* Filter Panel */}
                  {showFilters && (
                        <div className="no-print px-6 pt-3 pb-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                              <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium"><Filter size={14} /> Filters:</div>

                                    <select value={filters.semester} onChange={e => setFilters(f => ({ ...f, semester: e.target.value }))}
                                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                                          <option value="">All Semesters</option>
                                          {semesterOptions.map(s => <option key={s} value={s}>Semester {s}</option>)}
                                    </select>

                                    <select value={filters.branch} onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))}
                                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                                          <option value="">All Branches</option>
                                          {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>

                                    <select value={filters.section} onChange={e => setFilters(f => ({ ...f, section: e.target.value }))}
                                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                                          <option value="">All Sections</option>
                                          {sectionOptions.map(s => <option key={s} value={s}>Section {s}</option>)}
                                    </select>

                                    <select value={filters.faculty} onChange={e => setFilters(f => ({ ...f, faculty: e.target.value }))}
                                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                                          <option value="">All Faculty</option>
                                          {facultyOptions.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>

                                    <select value={filters.subject} onChange={e => setFilters(f => ({ ...f, subject: e.target.value }))}
                                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                                          <option value="">All Subjects</option>
                                          {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>

                                    <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 bg-white">
                                          <Search size={14} className="text-gray-400" />
                                          <input type="text" placeholder="Search…" value={filters.search}
                                                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                                className="text-sm focus:outline-none w-32 placeholder-gray-400" />
                                    </div>

                                    {Object.values(filters).some(Boolean) && (
                                          <button onClick={() => setFilters({ semester: '', branch: '', section: '', faculty: '', subject: '', search: '' })}
                                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                                                <X size={12} /> Clear
                                          </button>
                                    )}
                              </div>
                        </div>
                  )}

                  {/* Scrollable content */}
                  <div className="flex-1 overflow-auto p-6" ref={printRef}>
                        {visibleGroups.length === 0 ? (
                              <div className="flex items-center justify-center h-full text-gray-400">
                                    <div className="text-center">
                                          <p className="text-lg font-medium">No timetables match your filters</p>
                                          <p className="text-sm mt-1">Try clearing some filters</p>
                                    </div>
                              </div>
                        ) : (
                              Object.entries(groupsBySemester)
                                    .sort(([a], [b]) => Number(a) - Number(b))
                                    .map(([semester, semGroups]) => (
                                          <SemesterTimetable
                                                key={semester}
                                                semester={Number(semester)}
                                                groups={semGroups}
                                                slots={filteredSlots}
                                                timing={ct}
                                                allFaculty={allFaculty}
                                                allSubjects={allSubjects}
                                                activeDays={activeDays}
                                                slotList={slotList}
                                                onEditSlot={setEditingSlot}
                                          />
                                    ))
                        )}
                  </div>
            </div>
      )
}

export default TimetableViewer
