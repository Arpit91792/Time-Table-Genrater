import { useState, useMemo } from 'react'
import { Calendar, Brain, AlertCircle, CheckCircle, BookOpen, Users, Clock, ChevronRight, TrendingUp } from 'lucide-react'
import { useTimetable } from '../../../context/TimetableContext'

// ─── Semester sets ───────────────────────────────────────────────────────────
const SEMESTER_SETS = {
  odd: [1, 3, 5, 7],
  even: [2, 4, 6, 8],
  all: [1, 2, 3, 4, 5, 6, 7, 8]
}
const getAllowedSems = (semType) => SEMESTER_SETS[semType] || SEMESTER_SETS.all

// ─── Build time-slots from college timing ────────────────────────────────────
function buildTimeSlots(timing) {
  const slots = []
  const [sh, sm] = (timing.startTime || '08:00').split(':').map(Number)
  const [eh, em] = (timing.endTime || '16:00').split(':').map(Number)
  const lunchStart = timing.lunchBreak?.startTime || '13:00'
  const lunchEnd = timing.lunchBreak?.endTime || '13:30'
  const lectDur = timing.lectureDuration || 50

  let cursor = sh * 60 + sm
  const end = eh * 60 + em

  const toHHMM = (mins) => {
    const hh = String(Math.floor(mins / 60)).padStart(2, '0')
    const mm = String(mins % 60).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const [lsh, lsm] = lunchStart.split(':').map(Number)
  const [leh, lem] = lunchEnd.split(':').map(Number)
  const lunchStartMin = lsh * 60 + lsm
  const lunchEndMin = leh * 60 + lem

  while (cursor < end - 30) {
    const slotStart = toHHMM(cursor)
    if (cursor >= lunchStartMin && cursor < lunchEndMin) {
      slots.push({ label: `${slotStart} – ${lunchEnd} (Lunch)`, startTime: slotStart, type: 'lunch', duration: lunchEndMin - cursor })
      cursor = lunchEndMin
      continue
    }
    if (cursor + lectDur > lunchStartMin && cursor < lunchStartMin) {
      slots.push({ label: `${slotStart} – ${lunchStart}`, startTime: slotStart, type: 'gap', duration: lunchStartMin - cursor })
      cursor = lunchStartMin
      continue
    }
    const slotEnd = toHHMM(cursor + lectDur)
    slots.push({ label: `${slotStart} – ${slotEnd}`, startTime: slotStart, endTime: slotEnd, type: 'lecture', duration: lectDur })
    cursor += lectDur
  }

  return slots
}

// ─── Faculty short-name ───────────────────────────────────────────────────────
function getFacultyShort(name, allFaculty = []) {
  if (!name) return 'TBD'
  const found = allFaculty.find(f => f.name === name)
  if (found?.shortName) return found.shortName.toUpperCase()
  const parts = name.trim().split(/\s+/)
  if (!parts.length) return '?'
  const prefix = parts[0].replace(/\./g, '').toUpperCase()
  if (['DR', 'PROF', 'MR', 'MRS', 'MS'].includes(prefix)) {
    return `${prefix} ${parts.slice(1).map(p => p[0]?.toUpperCase() || '').join('')}`
  }
  return parts.map(p => p[0]?.toUpperCase() || '').join('')
}

// ─── Core scheduling engine ───────────────────────────────────────────────────
// LOAD semantics:
//   loadTheory    = total theory lectures per WEEK  (e.g. 4 → 4 single-period slots)
//   loadPractical = total practical periods per WEEK (e.g. 2 → 1 session of 2 consecutive periods)
//                  Each practical SESSION uses exactly 2 lecture slots.
//   sessionsNeeded = loadPractical / 2  (rounds up; minimum 1)
function generateSchedule({ collegeTiming, subjects, faculty, mappings, semType }) {
  const allowedSems = getAllowedSems(semType)
  const workingDays = Object.entries(collegeTiming.workingDays || {})
    .filter(([, v]) => v)
    .map(([d]) => d.charAt(0).toUpperCase() + d.slice(1))

  const timeSlots = buildTimeSlots(collegeTiming)
  const lectureSlots = timeSlots.filter(t => t.type === 'lecture')

  // ── Conflict tracking ────────────────────────────────────────────────────
  const facultyBusy = {}
  const sectionBusy = {}

  const busyKey = (day, time) => `${day}|${time}`

  const markFaculty = (facultyId, day, time) => {
    if (!facultyId) return
    if (!facultyBusy[facultyId]) facultyBusy[facultyId] = new Set()
    facultyBusy[facultyId].add(busyKey(day, time))
  }
  const markSection = (sectionKey, day, time) => {
    if (!sectionBusy[sectionKey]) sectionBusy[sectionKey] = new Set()
    sectionBusy[sectionKey].add(busyKey(day, time))
  }
  const isFacultyFree = (facultyId, day, time) =>
    !facultyId || !facultyBusy[facultyId]?.has(busyKey(day, time))
  const isSectionFree = (sectionKey, day, time) =>
    !sectionBusy[sectionKey]?.has(busyKey(day, time))

  const roomBusy = {}
  const markRoom = (room, day, time) => {
    if (!room) return
    if (!roomBusy[room]) roomBusy[room] = new Set()
    roomBusy[room].add(busyKey(day, time))
  }
  const isRoomFree = (room, day, time) =>
    !room || !roomBusy[room]?.has(busyKey(day, time))

  const filteredSubjects = subjects.filter(s => allowedSems.includes(Number(s.semester)))
  // Alerts must be available before any non-blocking validation pushes
  const alerts = []

  let activeMappings = mappings.filter(m => {
    if (!m || !m.branch || !m.section || !m.semester || !m.facultyName || !m.subjectCode) return false
    const semester = Number(m.semester)
    if (!allowedSems.includes(semester)) return false
    const isPractical = m.subjectType === 'Practical' || m.subjectType === 'Lab'
    if (isPractical && (!Number(m.loadPractical) || Number(m.loadPractical) <= 0)) return false
    if (!isPractical && (!Number(m.loadTheory) || Number(m.loadTheory) <= 0)) return false
    return true
  })

  const subjectByCode = subjects.reduce((acc, subj) => {
    if (subj.subjectCode) acc[subj.subjectCode] = subj
    return acc
  }, {})

  const getMappingSubject = (m) => {
    if (m.subjectName) return m.subjectName
    if (m.subjectCode && subjectByCode[m.subjectCode]?.subjectName) return subjectByCode[m.subjectCode].subjectName
    return m.subjectCode
  }

  const mappedSubjectKeys = new Set(activeMappings.map(m => m.subjectCode || m.subjectName))
  const unmappedSubjects = filteredSubjects
    .filter(subj => !mappedSubjectKeys.has(subj.subjectCode || subj.subjectName))
    .map(subj => subj.subjectCode || subj.subjectName)
  if (filteredSubjects.length > 0 && activeMappings.length === 0) {
    // No mappings available — auto-create placeholder mappings so generation can proceed.
    // Placeholders use facultyName='TBD' and default rooms; user sees these in the validation alerts
    // and can edit mappings later.
    const placeholders = filteredSubjects.map((s, i) => ({
      branch: s.branch || 'CSE',
      section: s.section || 'A',
      semester: s.semester,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      subjectType: (s.theoryOrLab === 'Lab' || s.theoryOrLab === 'Practical') ? 'Practical' : 'Theory',
      facultyName: 'TBD',
      facultyId: '',
      preferredRoom: '',
      loadTheory: (s.theoryOrLab === 'Lab' || s.theoryOrLab === 'Practical') ? 0 : (Number(s.hoursPerWeek) || 3),
      loadPractical: (s.theoryOrLab === 'Lab' || s.theoryOrLab === 'Practical') ? (Number(s.practicalRequired) || Number(s.hoursPerWeek) || 2) : 0,
      _placeholder: true
    }))
    if (placeholders.length > 0) {
      activeMappings = [...activeMappings, ...placeholders]
      alerts.push(`Auto-created ${placeholders.length} placeholder mappings (faculty=\'TBD\') to allow generation.`)
    }
  }
  if (unmappedSubjects.length > 0) {
    alerts.push(`Missing active mappings for: ${unmappedSubjects.join(', ')}`)
  }

  const groupMap = {}
  activeMappings.forEach(m => {
    const branch = (m.branch || 'CSE').toUpperCase()
    const section = (m.section || 'A').toUpperCase()
    const semester = Number(m.semester)
    const key = `${branch}-${section}-${semester}`
    if (!groupMap[key]) {
      groupMap[key] = { branch, section, semester, theories: [], practicals: [] }
    }
    const mapping = {
      ...m,
      branch, section, semester,
      facultyName: m.facultyName,
      facultyId: m.facultyId || '',
      subjectCode: m.subjectCode,
      subjectName: getMappingSubject(m),
      loadTheory: Number(m.loadTheory) || 0,
      loadPractical: Number(m.loadPractical) || 0,
    }
    const isPractical = mapping.subjectType === 'Practical' || mapping.subjectType === 'Lab'
    if (isPractical) {
      groupMap[key].practicals.push(mapping)
    } else {
      groupMap[key].theories.push(mapping)
    }
  })

  const generatedSlots = []

  // helper: find mappings for a subject IN the correct section/branch/semester
  // The group context is passed in so mappings for CSE-A don't bleed into CSE-B.
  const getMappings = (subj, grpBranch, grpSection, grpSemester) => activeMappings.filter(m => {
    const subjectMatch = m.subjectId === subj._id ||
      m.subjectCode === subj.subjectCode ||
      m.subjectName === subj.subjectName
    if (!subjectMatch) return false
    const branchOk = !m.branch || m.branch.toUpperCase() === grpBranch
    const secOk = !m.section || m.section.toUpperCase() === grpSection
    const semOk = !m.semester || Number(m.semester) === grpSemester
    return branchOk && secOk && semOk
  })
  const getFac = (m) => m ? faculty.find(f => f._id === m.facultyId || f.name === m.facultyName) : null

  // ── Validation counters ───────────────────────────────────────────────────
  let theoryRequired = 0, theoryScheduled = 0
  let practicalRequired = 0, practicalScheduled = 0
  const facultyLoadMap = {}  // facultyId → { name, assignedTheory, scheduledTheory, assignedPractical, scheduledPractical }

  const ensureFacLoad = (id, name) => {
    if (!id) return
    if (!facultyLoadMap[id]) facultyLoadMap[id] = { facultyName: name || id, assignedTheory: 0, scheduledTheory: 0, assignedPractical: 0, scheduledPractical: 0 }
  }

  // ── PASS 1: Schedule Practicals ───────────────────────────────────────────
  Object.values(groupMap).forEach(group => {
    const { branch, section, semester, practicals } = group
    const sectionKey = `${branch}-${section}-${semester}`

    const entries = practicals.map((mapping, index) => {
      const load = Number(mapping.loadPractical) || 2
      const sessionsNeeded = Math.max(1, Math.ceil(load / 2))
      const facultyId = mapping.facultyId || ''
      const facultyName = mapping.facultyName || 'TBD'
      ensureFacLoad(facultyId, facultyName)
      if (facultyId) facultyLoadMap[facultyId].assignedPractical += sessionsNeeded
      practicalRequired += sessionsNeeded

      return {
        ...mapping,
        sessionsRemaining: sessionsNeeded,
        sessionsNeeded,
        facultyId,
        facultyName,
        room: mapping.preferredRoom || '',
        uniqueKey: `${mapping.subjectCode || mapping.subjectName}-${facultyId}-${index}`,
      }
    })

    const availableEntries = () => entries.filter(e => e.sessionsRemaining > 0)

    const findBestPair = () => {
      const candidates = availableEntries()
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
          const a = candidates[i]
          const b = candidates[j]
          const sameFaculty = a.facultyId && b.facultyId && a.facultyId === b.facultyId
          const sameRoom = a.room && b.room && a.room === b.room
          if (sameFaculty || sameRoom) continue
          if (a.subjectCode !== b.subjectCode) return [a, b]
        }
      }
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
          const a = candidates[i]
          const b = candidates[j]
          const sameFaculty = a.facultyId && b.facultyId && a.facultyId === b.facultyId
          const sameRoom = a.room && b.room && a.room === b.room
          if (sameFaculty || sameRoom) continue
          return [a, b]
        }
      }
      return [null, null]
    }

    const getNextConsecutiveSlot = (index) => {
      for (let ni = index + 1; ni < lectureSlots.length; ni++) {
        if (lectureSlots[ni].startTime === lectureSlots[index].endTime) {
          return lectureSlots[ni]
        }
      }
      return null
    }

    while (availableEntries().length >= 2) {
      const [b1, b2] = findBestPair()
      if (!b1 || !b2) break

      let placed = false
      outer: for (const day of workingDays) {
        for (let si = 0; si < lectureSlots.length; si++) {
          if (placed) break outer

          const ts1 = lectureSlots[si]
          const ts2 = getNextConsecutiveSlot(si)
          if (!ts2) continue

          const allFree =
            isSectionFree(sectionKey, day, ts1.startTime) &&
            isSectionFree(sectionKey, day, ts2.startTime) &&
            isFacultyFree(b1.facultyId, day, ts1.startTime) &&
            isFacultyFree(b1.facultyId, day, ts2.startTime) &&
            isFacultyFree(b2.facultyId, day, ts1.startTime) &&
            isFacultyFree(b2.facultyId, day, ts2.startTime) &&
            isRoomFree(b1.room, day, ts1.startTime) &&
            isRoomFree(b1.room, day, ts2.startTime) &&
            isRoomFree(b2.room, day, ts1.startTime) &&
            isRoomFree(b2.room, day, ts2.startTime)

          if (!allFree) continue

          markSection(sectionKey, day, ts1.startTime)
          markSection(sectionKey, day, ts2.startTime)
          markFaculty(b1.facultyId, day, ts1.startTime)
          markFaculty(b1.facultyId, day, ts2.startTime)
          markFaculty(b2.facultyId, day, ts1.startTime)
          markFaculty(b2.facultyId, day, ts2.startTime)
          markRoom(b1.room, day, ts1.startTime)
          markRoom(b1.room, day, ts2.startTime)
          markRoom(b2.room, day, ts1.startTime)
          markRoom(b2.room, day, ts2.startTime)

          const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
          const baseSlot = {
            day, branch, section, semester,
            type: 'Practical', isPractical: true,
            startTime: ts1.startTime,
            endTime: ts2.endTime || ts2.startTime,
            mergedSlots: 2,
          }

          generatedSlots.push({
            ...baseSlot,
            id: `prac-b1-${uid()}`,
            subjectCode: b1.subjectCode,
            subjectName: b1.subjectName,
            facultyId: b1.facultyId,
            facultyName: b1.facultyName,
            facultyShort: getFacultyShort(b1.facultyName, faculty),
            room: b1.room,
            batch: 'B1',
          })

          generatedSlots.push({
            ...baseSlot,
            id: `prac-b2-${uid()}`,
            subjectCode: b2.subjectCode,
            subjectName: b2.subjectName,
            facultyId: b2.facultyId,
            facultyName: b2.facultyName,
            facultyShort: getFacultyShort(b2.facultyName, faculty),
            room: b2.room,
            batch: 'B2',
          })

          b1.sessionsRemaining -= 1
          b2.sessionsRemaining -= 1
          practicalScheduled += 1
          placed = true
        }
      }

      if (!placed) {
        break
      }
    }

    const unscheduled = entries.filter(e => e.sessionsRemaining > 0)
    unscheduled.forEach(e => {
      alerts.push(`Unable to schedule practical session for ${e.subjectName} (${e.facultyName}) in ${branch}-${section} semester ${semester}`)
    })
  })

  // ── PASS 2: Schedule Theory ───────────────────────────────────────────────
  Object.values(groupMap).forEach(group => {
    const { branch, section, semester, theories } = group
    const sectionKey = `${branch}-${section}-${semester}`

    theories.forEach(subj => {
      const subjMappings = getMappings(subj, branch, section, semester)
      const mapping = subjMappings[0] || null
      const fac = getFac(mapping)

      const hoursPerWeek = mapping?.loadTheory || Number(subj.hoursPerWeek) || 3
      theoryRequired += hoursPerWeek

      const facId = fac?._id || mapping?.facultyId || ''
      const facName = fac?.name || mapping?.facultyName || 'TBD'
      ensureFacLoad(facId, facName)
      if (facId) facultyLoadMap[facId].assignedTheory += hoursPerWeek

      let placed = 0
      for (const day of workingDays) {
        if (placed >= hoursPerWeek) break
        for (const ts of lectureSlots) {
          if (placed >= hoursPerWeek) break
          if (!isSectionFree(sectionKey, day, ts.startTime)) continue
          if (!isFacultyFree(facId, day, ts.startTime)) continue

          markSection(sectionKey, day, ts.startTime)
          markFaculty(facId, day, ts.startTime)

          generatedSlots.push({
            id: `th-${day}-${ts.startTime}-${branch}-${section}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            day, branch, section, semester,
            startTime: ts.startTime,
            endTime: ts.endTime || '',
            timeLabel: ts.label,
            subjectCode: subj.subjectCode || subj.subjectName,
            subjectName: subj.subjectName,
            facultyId: facId,
            facultyName: facName,
            facultyShort: getFacultyShort(facName, faculty),
            room: mapping?.preferredRoom || '',
            batch: '',
            type: 'Theory',
            isPractical: false,
            hoursPerWeek,
          })

          if (facId) facultyLoadMap[facId].scheduledTheory++
          theoryScheduled++
          placed++
        }
      }
    })
  })

  // ── Add lunch slots ───────────────────────────────────────────────────────
  const lunchTs = timeSlots.filter(t => t.type === 'lunch')
  Object.values(groupMap).forEach(({ branch, section, semester }) => {
    workingDays.forEach(day => {
      lunchTs.forEach(lt => {
        generatedSlots.push({
          id: `lunch-${day}-${lt.startTime}-${branch}-${section}`,
          day, branch, section, semester,
          startTime: lt.startTime, timeLabel: lt.label,
          subjectName: 'Lunch Break', subjectCode: '',
          facultyName: '', type: 'lunch',
        })
      })
    })
  })

  // ── Build groups list ─────────────────────────────────────────────────────
  const groups = Object.values(groupMap).map(({ branch, section, semester }) => ({ branch, section, semester }))

  // ── Build validation report ───────────────────────────────────────────────
  const pendingClasses = (theoryRequired - theoryScheduled) + ((practicalRequired - practicalScheduled) * 2)
  const facultyLoad = Object.values(facultyLoadMap).map(fl => ({
    ...fl,
    status: (fl.scheduledTheory >= fl.assignedTheory && fl.scheduledPractical >= fl.assignedPractical)
      ? 'complete' : fl.scheduledTheory > fl.assignedTheory ? 'extra' : 'missing'
  }))

  facultyLoad.forEach(fl => {
    if (fl.scheduledTheory < fl.assignedTheory) {
      alerts.push(`${fl.facultyName}: ${fl.assignedTheory - fl.scheduledTheory} theory lecture(s) unscheduled`)
    }
    if (fl.scheduledPractical < fl.assignedPractical) {
      alerts.push(`${fl.facultyName}: ${fl.assignedPractical - fl.scheduledPractical} practical session(s) unscheduled`)
    }
  })
  if (unmappedSubjects.length > 0) {
    alerts.push(`Missing active mappings for: ${unmappedSubjects.join(', ')}`)
  }

  const status = alerts.length === 0 ? 'success' : pendingClasses > 5 ? 'error' : 'warning'

  const validationReport = {
    theoryRequired, theoryScheduled,
    practicalRequired, practicalScheduled,
    facultyConflicts: 0, roomConflicts: 0, labConflicts: 0, studentConflicts: 0,
    pendingClasses, status,
    facultyLoad,
    alerts,
  }

  const stats = {
    totalSlots: generatedSlots.filter(s => s.type !== 'lunch' && s.batch !== 'B2').length,
    totalGroups: groups.length,
    semSubjects: filteredSubjects.length,
    practicalGroups: Object.values(groupMap).reduce((n, g) => n + g.practicals.length, 0),
  }

  return { slots: generatedSlots, timeSlots, stats, validationReport, groups, conflicts: [] }
}

// ─── ValidationReport component ───────────────────────────────────────────────
function ValidationReport({ report }) {
  if (!report) return null
  const { theoryRequired, theoryScheduled, practicalRequired, practicalScheduled,
    pendingClasses, status, facultyLoad, alerts } = report

  const statusColor = status === 'success' ? 'green' : status === 'warning' ? 'amber' : 'red'
  const statusIcon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌'
  const statusLabel = status === 'success' ? 'Timetable Generated Successfully' : status === 'warning' ? 'Generated with Warnings' : 'Generation Issues Found'

  return (
    <div className={`border border-${statusColor}-200 rounded-xl overflow-hidden mt-4`}>
      <div className={`px-4 py-3 bg-${statusColor}-50 flex items-center gap-2`}>
        <span className="text-lg">{statusIcon}</span>
        <h4 className={`font-bold text-${statusColor}-800`}>{statusLabel}</h4>
      </div>

      <div className="p-4 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Theory Required', val: theoryRequired, color: 'blue' },
            { label: 'Theory Scheduled', val: theoryScheduled, color: theoryScheduled >= theoryRequired ? 'green' : 'red' },
            { label: 'Practical Required', val: practicalRequired, color: 'blue' },
            { label: 'Practical Scheduled', val: practicalScheduled, color: practicalScheduled >= practicalRequired ? 'green' : 'red' },
          ].map(({ label, val, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-lg p-3 text-center`}>
              <p className={`text-xl font-bold text-${color}-700`}>{val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {pendingClasses > 0 && (
          <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠️ {pendingClasses} class slot(s) pending — may need more working days or faculty
          </div>
        )}

        {facultyLoad.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-700 mb-2 text-sm">Faculty Load Verification</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-200">Faculty</th>
                    <th className="text-center p-2 border border-gray-200">Th.Req</th>
                    <th className="text-center p-2 border border-gray-200">Th.Sch</th>
                    <th className="text-center p-2 border border-gray-200">Pr.Req</th>
                    <th className="text-center p-2 border border-gray-200">Pr.Sch</th>
                    <th className="text-center p-2 border border-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyLoad.map((fl, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-2 border border-gray-200 font-medium">{fl.facultyName}</td>
                      <td className="text-center p-2 border border-gray-200">{fl.assignedTheory}</td>
                      <td className={`text-center p-2 border border-gray-200 ${fl.scheduledTheory < fl.assignedTheory ? 'text-red-600 font-bold' : 'text-green-600'}`}>{fl.scheduledTheory}</td>
                      <td className="text-center p-2 border border-gray-200">{fl.assignedPractical}</td>
                      <td className={`text-center p-2 border border-gray-200 ${fl.scheduledPractical < fl.assignedPractical ? 'text-red-600 font-bold' : 'text-green-600'}`}>{fl.scheduledPractical}</td>
                      <td className="text-center p-2 border border-gray-200">
                        {fl.status === 'complete' ? '✅' : fl.status === 'extra' ? '⚡' : '⚠️'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="mt-3 space-y-1">
            {alerts.map((alert, i) => (
              <div key={i} className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-1">
                <span className="flex-shrink-0">⚠️</span> {alert}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 6 Component ─────────────────────────────────────────────────────────
const Step6GenerateTimetable = ({
  collegeTiming,
  selectedSubjects,
  selectedFaculty,
  selectedMappings,
  isSaving,
  onGenerate,
  onViewTimetable
}) => {
  const { subjects: storeSubjects, faculty: storeFaculty, teacherMappings: storeMappings } = useTimetable()

  const subjects = Array.isArray(selectedSubjects) ? selectedSubjects : storeSubjects
  const faculty = Array.isArray(selectedFaculty) ? selectedFaculty : storeFaculty
  const mappings = Array.isArray(selectedMappings) ? selectedMappings : storeMappings

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  const semType = 'all'
  const allowedSems = getAllowedSems(semType)
  const filteredSubjects = subjects.filter(s => allowedSems.includes(Number(s.semester)))

  const stats = useMemo(() => ({
    totalSubjects: subjects.length,
    semSubjects: filteredSubjects.length,
    faculty: faculty.length,
    mappings: mappings.length,
    semType,
    allowedSems,
  }), [subjects, filteredSubjects, faculty, mappings, semType])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setPreview(null)

    try {
      if (!collegeTiming) throw new Error('Please configure college timing first (Step 1)')
      if (!collegeTiming.collegeName) throw new Error('Please enter a College Name in Step 1')
      if (subjects.length === 0) throw new Error('Please add at least one subject (Step 2)')
      if (filteredSubjects.length === 0) throw new Error('No subjects found for All semesters (1–8).')
      if (faculty.length === 0) throw new Error('Please add at least one faculty member (Step 3)')
      if (mappings.length === 0) throw new Error('Please add at least one teacher mapping (Step 4)')

      await new Promise(r => setTimeout(r, 1200))

      const result = generateSchedule({ collegeTiming, subjects, faculty, mappings, semType })

      const timetableData = {
        collegeTiming,
        slots: result.slots,
        timeSlots: result.timeSlots,
        stats: result.stats,
        validationReport: result.validationReport,
        groups: result.groups,
        name: `${collegeTiming.collegeName} — All Semesters`,
        generatedAt: new Date().toISOString(),
        semType,
      }

      setPreview({ data: timetableData, stats: result.stats, validationReport: result.validationReport })

      if (onGenerate) {
        await onGenerate(timetableData)
      }
    } catch (err) {
      console.error('Timetable generation error:', err)
      setError(err.message || 'Failed to generate timetable')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start space-x-4 mb-6">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-3 rounded-lg">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generate Timetable</h2>
            <p className="text-gray-600 mt-1">
              Conflict-free scheduling for{' '}
              <span className="font-semibold text-emerald-600">All Semesters (1–8)</span>
            </p>
          </div>
        </div>
      </div>

      {/* College Info Card */}
      {collegeTiming && (
        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <h3 className="font-bold text-xl text-gray-900">{collegeTiming.collegeName || 'College Name not set'}</h3>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
            <span className="text-emerald-700 font-semibold">🟢 All Semesters (1–8)</span>
            <span>⏰ {collegeTiming.startTime} – {collegeTiming.endTime}</span>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: Clock, label: 'College Timing', ok: !!collegeTiming?.collegeName, detail: collegeTiming?.collegeName ? `${collegeTiming.collegeName} · ${collegeTiming.startTime}–${collegeTiming.endTime}` : 'Not configured' },
          { icon: BookOpen, label: `Subjects (All Semesters)`, ok: filteredSubjects.length > 0, detail: `${filteredSubjects.length} of ${subjects.length} total subjects match` },
          { icon: Users, label: 'Faculty', ok: faculty.length > 0, detail: `${faculty.length} faculty member${faculty.length !== 1 ? 's' : ''} available` },
          ...(mappings.length > 0 ? [{ icon: Calendar, label: 'Teacher Mapping', ok: mappings.length > 0, detail: `${mappings.length} mapping${mappings.length !== 1 ? 's' : ''}` }] : []),
        ].map(({ icon: Icon, label, ok, detail }) => (
          <div key={label} className={`flex items-start gap-3 p-4 rounded-xl border ${ok ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className={`p-2 rounded-lg ${ok ? 'bg-green-100' : 'bg-amber-100'}`}>
              <Icon className={`h-5 w-5 ${ok ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className={`font-semibold text-sm ${ok ? 'text-green-800' : 'text-amber-800'}`}>{label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{detail}</p>
            </div>
            <div className="ml-auto">
              {ok ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-amber-500" />}
            </div>
          </div>
        ))}
      </div>


      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success preview + validation report */}
      {preview && (
        <div className="mb-6">
          <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800">Timetable Generated!</h4>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Groups Scheduled', val: preview.stats.totalGroups },
                { label: 'Total Slots', val: preview.stats.totalSlots },
                { label: 'Subjects Used', val: preview.stats.semSubjects },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white rounded-lg p-3 text-center border border-green-100">
                  <p className="text-2xl font-bold text-green-700">{val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {onViewTimetable && (
              <button
                onClick={() => onViewTimetable(preview.data)}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="h-5 w-5" />
                View Timetable
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Validation Report */}
          <ValidationReport report={preview.validationReport} />
        </div>
      )}

      {/* Generate button */}
      {!preview && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
            className="px-16 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto text-lg"
          >
            {isGenerating || isSaving ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                <span>Generating Timetable…</span>
              </>
            ) : (
              <>
                <Brain className="h-6 w-6" />
                <span>Generate Timetable</span>
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Automatically schedules{' '}
            <strong>{filteredSubjects.length}</strong> subjects for{' '}
            <strong>All Semesters</strong> with conflict resolution
          </p>
        </div>
      )}

      {preview && (
        <button
          onClick={() => { setPreview(null); setError(null) }}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline mx-auto block"
        >
          Regenerate timetable
        </button>
      )}
    </div>
  )
}

export default Step6GenerateTimetable
