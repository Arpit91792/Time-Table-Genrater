const normalizeKey = (value) => {
      if (value === null || value === undefined) return ''
      return String(value).toString().trim().toUpperCase()
}

const normalizeSubjectName = (value) => normalizeKey(value)
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

const subjectIdentity = (subjectCode, subjectName) => ({
      code: normalizeKey(subjectCode),
      name: normalizeSubjectName(subjectName)
})

const subjectsMatch = (left, right) => {
      const a = subjectIdentity(left.subjectCode, left.subjectName)
      const b = subjectIdentity(right.subjectCode, right.subjectName)
      return (a.code && b.code && a.code === b.code) || (a.name && b.name && a.name === b.name)
}

const isContinuousPractical = (left, right) => {
      if (normalizeKey(left.type) !== 'PRACTICAL' || normalizeKey(right.type) !== 'PRACTICAL') return false
      return parseMinutes(left.startTime) <= parseMinutes(right.endTime) && parseMinutes(right.startTime) <= parseMinutes(left.endTime)
}

const parseMinutes = (time) => {
      if (!time || typeof time !== 'string') return 0
      const [hours, minutes] = time.split(':').map(Number)
      return (hours || 0) * 60 + (minutes || 0)
}

const minutesToTime = (minutes) => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const isTimeRangeOverlap = (startA, endA, startB, endB) => {
      const aStart = parseMinutes(startA)
      const aEnd = parseMinutes(endA)
      const bStart = parseMinutes(startB)
      const bEnd = parseMinutes(endB)
      return aStart < bEnd && bStart < aEnd
}

const getAffectedGroups = (slot, groups) => {
      const scope = normalizeKey(slot.scope)
      const slotBranch = normalizeKey(slot.branch)
      const slotSem = normalizeKey(slot.semester)
      const slotSection = normalizeKey(slot.section)
      const slotSections = Array.isArray(slot.sections) ? slot.sections.map(normalizeKey) : []

      return groups.filter(group => {
            const groupBranch = normalizeKey(group.branch)
            const groupSem = normalizeKey(group.semester)
            const groupSection = normalizeKey(group.section)
            if (scope === 'COLLEGE') return true
            if (scope === 'BRANCH' && slotBranch && groupBranch === slotBranch) return true
            if (scope === 'SEMESTER' && slotBranch && groupBranch === slotBranch && slotSem && groupSem === slotSem) return true
            if (scope === 'SECTION' && slotBranch && groupBranch === slotBranch && slotSem && groupSem === slotSem && slotSection && groupSection === slotSection) return true
            if (scope === 'MULTIPLE SECTIONS' && slotBranch && groupBranch === slotBranch && slotSem && groupSem === slotSem && slotSections.includes(groupSection)) return true
            return false
      })
}

const buildTimeSlots = (collegeTiming) => {
      const slots = []
      const workingDays = Object.entries(collegeTiming.workingDays || {})
            .filter(([day, flag]) => flag)
            .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
      const lectureDuration = Number(collegeTiming.lectureDuration) || 50
      const lunchStart = collegeTiming.lunchBreak?.startTime || null
      const lunchEnd = collegeTiming.lunchBreak?.endTime || null
      const timeToMinutes = parseMinutes
      const start = timeToMinutes(collegeTiming.startTime || '08:00')
      const end = timeToMinutes(collegeTiming.endTime || '16:00')
      let slotNumber = 1

      const isLunch = (startTime, endTime) => {
            if (!lunchStart || !lunchEnd) return false
            return isTimeRangeOverlap(startTime, endTime, lunchStart, lunchEnd)
      }

      for (const day of workingDays) {
            let cursor = start
            while (cursor + lectureDuration <= end) {
                  const next = cursor + lectureDuration
                  if (!isLunch(cursor, next)) {
                        slots.push({
                              id: `slot-${slotNumber}`,
                              day,
                              startTime: minutesToTime(cursor),
                              endTime: minutesToTime(next),
                              type: 'Lecture',
                              duration: lectureDuration,
                              slotNumber: slotNumber++
                        })
                  }
                  cursor = next
            }
      }
      return slots
}

const buildAvailabilityMap = (availabilityRecords) => {
      const map = {}
      availabilityRecords.forEach(record => {
            if (!record.facultyId) return
            const facultyId = normalizeKey(record.facultyId)
            const day = normalizeKey(record.day)
            if (!map[facultyId]) map[facultyId] = {}
            if (!map[facultyId][day]) map[facultyId][day] = []
            map[facultyId][day].push({ start: record.startTime, end: record.endTime })
      })
      return map
}

const isTeacherUnavailable = (facultyId, day, time, availabilityMap) => {
      const facKey = normalizeKey(facultyId)
      const dayKey = normalizeKey(day)
      if (!availabilityMap[facKey] || !availabilityMap[facKey][dayKey]) return false
      return availabilityMap[facKey][dayKey].some(range => {
            return isTimeRangeOverlap(time, minutesToTime(parseMinutes(time) + 1), range.start, range.end)
      })
}

const reserve = (map, resourceId, slotKey) => {
      if (!resourceId) return
      if (!map[resourceId]) map[resourceId] = new Set()
      map[resourceId].add(slotKey)
}

const isReserved = (map, resourceId, slotKey) => {
      if (!resourceId) return false
      return map[resourceId]?.has(slotKey)
}

const buildGroupMap = (mappings, subjects) => {
      const groupMap = {}
      mappings.forEach(mapping => {
            const branch = normalizeKey(mapping.branch || 'CSE')
            const section = normalizeKey(mapping.section || 'A')
            const semester = normalizeKey(mapping.semester || '')
            const key = `${branch}-${section}-${semester}`
            if (!groupMap[key]) {
                  groupMap[key] = { branch, section, semester, theories: [], practicals: [] }
            }
            const subjectName = mapping.subjectName || (subjects.find(s => normalizeKey(s.subjectCode) === normalizeKey(mapping.subjectCode))?.subjectName) || mapping.subjectName || ''
            const loadTheory = Number(mapping.loadTheory) || 0
            const loadPractical = Number(mapping.loadPractical) || 0
            const facultyId = mapping.facultyId || ''
            const facultyName = mapping.facultyName || 'TBD'
            const preferredRoom = mapping.preferredRoom || ''
            const preferredLab = mapping.preferredLab || ''
            const subjectType = mapping.subjectType || 'Theory'
            const subjectCode = mapping.subjectCode || ''
            const batch = mapping.batch || 'NA'
            const slotInfo = {
                  ...mapping,
                  branch,
                  section,
                  semester,
                  subjectName,
                  subjectCode,
                  facultyId,
                  facultyName,
                  preferredRoom,
                  preferredLab,
                  loadTheory,
                  loadPractical,
                  subjectType,
                  batch
            }
            const isPractical = ['Practical', 'Lab', 'Tutorial', 'Project'].includes(subjectType)
            if (isPractical) groupMap[key].practicals.push(slotInfo)
            else groupMap[key].theories.push(slotInfo)
      })
      return groupMap
}

const getConsecutiveSlotIndex = (lectureSlots, index) => {
      const current = lectureSlots[index]
      if (!current) return -1
      for (let j = index + 1; j < lectureSlots.length; j += 1) {
            const next = lectureSlots[j]
            if (next.startTime === current.endTime) return j
            if (parseMinutes(next.startTime) > parseMinutes(current.endTime)) return -1
      }
      return -1
}

const safeId = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const scheduleFixedSlots = ({ fixedSlots, groups, generatedSlots, reservations, subjectReservations, conflicts }) => {
      const preserved = { locked: 0, activities: 0 }
      const allGroupKeys = Object.keys(groups)
      fixedSlots.forEach(slot => {
            const affected = getAffectedGroups(slot, Object.values(groups))
            const slotSubjectCode = slot.subjectCode || ''
            const slotSubjectName = slot.subjectName || ''
            const slotFacultyId = slot.facultyId || ''
            const slotFacultyName = slot.facultyName || ''
            const slotRoom = slot.roomName || ''
            const slotBatch = slot.batch || 'NA'
            const type = slot.type || slot.activityType || 'Activity'
            const activity = normalizeKey(type)
            affected.forEach(group => {
                  const sectionKey = `${normalizeKey(group.branch)}-${normalizeKey(group.section)}-${normalizeKey(group.semester)}`
                  const slotKey = `${slot.day}|${slot.startTime}`
                  const entry = {
                        id: `fixed-${slot._id || safeId()}-${sectionKey}`,
                        day: slot.day,
                        branch: group.branch,
                        section: group.section,
                        semester: group.semester,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        subjectCode: slotSubjectCode,
                        subjectName: slotSubjectName || slot.activityName || type,
                        facultyId: slotFacultyId,
                        facultyName: slotFacultyName,
                        room: slotRoom,
                        batch: slotBatch,
                        type,
                        activityType: slot.activityType || type,
                        isLocked: Boolean(slot.locked),
                        fixed: true
                  }
                  const existingSubject = subjectReservations[sectionKey]?.[normalizeKey(slot.day)]?.find(existing => subjectsMatch(existing, entry) && !isContinuousPractical(existing, entry))
                  if (existingSubject) {
                        conflicts.push({
                              type: 'sameSubjectSameDay',
                              message: 'Same subject scheduled multiple times on the same day.',
                              section: sectionKey,
                              subject: entry.subjectName || entry.subjectCode,
                              day: entry.day,
                              existingPeriod: existingSubject.startTime,
                              conflictingPeriod: entry.startTime,
                              requiredPeriods: 0,
                              availableDays: []
                        })
                  }
                  generatedSlots.push(entry)
                  if (!subjectReservations[sectionKey]) subjectReservations[sectionKey] = {}
                  if (!subjectReservations[sectionKey][normalizeKey(slot.day)]) subjectReservations[sectionKey][normalizeKey(slot.day)] = []
                  subjectReservations[sectionKey][normalizeKey(slot.day)].push(entry)
                  reserve(reservations.section, sectionKey, slotKey)
                  if (slotFacultyId) reserve(reservations.faculty, normalizeKey(slotFacultyId), slotKey)
                  if (slotRoom) reserve(reservations.room, normalizeKey(slotRoom), slotKey)
                  reserve(reservations.global, 'activity', slotKey)
                  if (activity !== 'THEORY' && activity !== 'PRACTICAL') preserved.activities += 1
                  if (slot.locked) preserved.locked += 1
            })
      })
      return preserved
}

const scheduleLecture = ({ generatedSlots, reservations, sectionKey, facultyId, facultyName, room, day, lectureSlot, subjectCode, subjectName, batch, type }) => {
      const slotKey = `${day}|${lectureSlot.startTime}`
      generatedSlots.push({
            id: `sched-${safeId()}`,
            day,
            branch: sectionKey.split('-')[0],
            section: sectionKey.split('-')[1],
            semester: sectionKey.split('-')[2],
            startTime: lectureSlot.startTime,
            endTime: lectureSlot.endTime,
            subjectCode,
            subjectName,
            facultyId,
            facultyName,
            room,
            batch: batch || '',
            type,
            isLocked: false,
            fixed: false
      })
      reserve(reservations.section, sectionKey, slotKey)
      if (facultyId) reserve(reservations.faculty, normalizeKey(facultyId), slotKey)
      if (room) reserve(reservations.room, normalizeKey(room), slotKey)
}

const schedulePracticalSession = ({ generatedSlots, reservations, sectionKey, day, slot1, slot2, assignmentA, assignmentB }) => {
      const slotKey1 = `${day}|${slot1.startTime}`
      const slotKey2 = `${day}|${slot2.startTime}`
      const base = {
            day,
            branch: sectionKey.split('-')[0],
            section: sectionKey.split('-')[1],
            semester: sectionKey.split('-')[2],
            startTime: slot1.startTime,
            endTime: slot2.endTime,
            type: 'Practical',
            isLocked: false,
            fixed: false
      }
      generatedSlots.push({
            ...base,
            id: `prac-${safeId()}`,
            subjectCode: assignmentA.subjectCode,
            subjectName: assignmentA.subjectName,
            facultyId: assignmentA.facultyId,
            facultyName: assignmentA.facultyName,
            room: assignmentA.preferredRoom || assignmentA.preferredLab || '',
            batch: assignmentA.batch === 'B2' ? 'B2' : 'B1'
      })
      generatedSlots.push({
            ...base,
            id: `prac-${safeId()}`,
            subjectCode: assignmentB.subjectCode,
            subjectName: assignmentB.subjectName,
            facultyId: assignmentB.facultyId,
            facultyName: assignmentB.facultyName,
            room: assignmentB.preferredRoom || assignmentB.preferredLab || '',
            batch: assignmentB.batch === 'B2' ? 'B2' : 'B2'
      })
      reserve(reservations.section, sectionKey, slotKey1)
      reserve(reservations.section, sectionKey, slotKey2)
      if (assignmentA.facultyId) reserve(reservations.faculty, normalizeKey(assignmentA.facultyId), slotKey1)
      if (assignmentA.facultyId) reserve(reservations.faculty, normalizeKey(assignmentA.facultyId), slotKey2)
      if (assignmentB.facultyId) reserve(reservations.faculty, normalizeKey(assignmentB.facultyId), slotKey1)
      if (assignmentB.facultyId) reserve(reservations.faculty, normalizeKey(assignmentB.facultyId), slotKey2)
      if (assignmentA.preferredRoom) reserve(reservations.room, normalizeKey(assignmentA.preferredRoom), slotKey1)
      if (assignmentA.preferredRoom) reserve(reservations.room, normalizeKey(assignmentA.preferredRoom), slotKey2)
      if (assignmentB.preferredRoom) reserve(reservations.room, normalizeKey(assignmentB.preferredRoom), slotKey1)
      if (assignmentB.preferredRoom) reserve(reservations.room, normalizeKey(assignmentB.preferredRoom), slotKey2)
      reserve(reservations.global, 'activity', slotKey1)
      reserve(reservations.global, 'activity', slotKey2)
}

const canScheduleAt = ({ sectionKey, facultyId, room, day, lectureSlot, reservations, availabilityMap, subjectReservations, subjectCode, subjectName, type }) => {
      const slotKey = `${day}|${lectureSlot.startTime}`
      if (isReserved(reservations.section, sectionKey, slotKey)) return false
      if (facultyId && isReserved(reservations.faculty, normalizeKey(facultyId), slotKey)) return false
      if (room && isReserved(reservations.room, normalizeKey(room), slotKey)) return false
      if (isReserved(reservations.global, 'activity', slotKey)) return false
      if (facultyId && isTeacherUnavailable(facultyId, day, lectureSlot.startTime, availabilityMap)) return false
      const existingSubjects = subjectReservations[sectionKey]?.[normalizeKey(day)] || []
      if (existingSubjects.some(existing => subjectsMatch(existing, { subjectCode, subjectName }) && !isContinuousPractical(existing, { subjectCode, subjectName, type, startTime: lectureSlot.startTime, endTime: lectureSlot.endTime }))) return false
      return true
}

const registerSubject = (subjectReservations, sectionKey, day, entry) => {
      if (!subjectReservations[sectionKey]) subjectReservations[sectionKey] = {}
      const dayKey = normalizeKey(day)
      if (!subjectReservations[sectionKey][dayKey]) subjectReservations[sectionKey][dayKey] = []
      subjectReservations[sectionKey][dayKey].push(entry)
}

const validateSameSubjectSameDay = (slots) => {
      const conflicts = []
      const bySectionDay = {}
      slots.filter(slot => normalizeKey(slot.type) !== 'LUNCH').forEach(slot => {
            const sectionKey = `${normalizeKey(slot.branch)}-${normalizeKey(slot.section)}-${normalizeKey(slot.semester)}`
            const key = `${sectionKey}|${normalizeKey(slot.day)}`
            if (!bySectionDay[key]) bySectionDay[key] = []
            const existing = bySectionDay[key].find(previous => subjectsMatch(previous, slot) && !isContinuousPractical(previous, slot))
            if (existing) {
                  conflicts.push({
                        type: 'sameSubjectSameDay',
                        message: 'Same subject scheduled multiple times on the same day.',
                        section: sectionKey,
                        subject: slot.subjectName || slot.subjectCode,
                        day: slot.day,
                        existingPeriod: existing.startTime,
                        conflictingPeriod: slot.startTime,
                        requiredPeriods: 0,
                        availableDays: []
                  })
            }
            bySectionDay[key].push(slot)
      })
      return conflicts
}

const validatePairedLabSessions = (slots) => {
      const conflicts = []
      const sectionDayMap = {}

      slots.filter(slot => slot && (normalizeKey(slot.type) === 'PRACTICAL' || normalizeKey(slot.type) === 'LAB' || slot.isPractical)).forEach(slot => {
            const sectionKey = `${normalizeKey(slot.branch)}-${normalizeKey(slot.section)}-${normalizeKey(slot.semester)}`
            const dayKey = normalizeKey(slot.day)
            const key = `${sectionKey}|${dayKey}`
            if (!sectionDayMap[key]) sectionDayMap[key] = []
            sectionDayMap[key].push(slot)
      })

      Object.entries(sectionDayMap).forEach(([sectionDayKey, entries]) => {
            const batchMap = { B1: [], B2: [] }
            entries.forEach(entry => {
                  const batch = normalizeKey(entry.batch)
                  if (batch === 'B1' || batch === 'B2') batchMap[batch].push(entry)
            })

            const hasBatch1 = batchMap.B1.length > 0
            const hasBatch2 = batchMap.B2.length > 0
            if (hasBatch1 !== hasBatch2) {
                  conflicts.push({
                        type: 'pairedLabMismatch',
                        message: 'Batch lab pairing mismatch: one batch has a lab and the other does not.',
                        section: sectionDayKey.split('|')[0],
                        day: sectionDayKey.split('|')[1],
                        existingPeriod: hasBatch1 ? batchMap.B1[0].startTime : batchMap.B2[0].startTime,
                        conflictingPeriod: 'missing batch',
                        requiredPeriods: 0,
                        availableDays: []
                  })
                  return
            }

            if (!hasBatch1 || !hasBatch2) return

            const b1Sessions = new Set(batchMap.B1.map(entry => `${entry.startTime}|${entry.endTime}`))
            const b2Sessions = new Set(batchMap.B2.map(entry => `${entry.startTime}|${entry.endTime}`))
            if (b1Sessions.size > 1 || b2Sessions.size > 1) {
                  conflicts.push({
                        type: 'pairedLabMismatch',
                        message: 'A section has more than one synchronized lab session on the same day.',
                        section: sectionDayKey.split('|')[0],
                        day: sectionDayKey.split('|')[1],
                        existingPeriod: batchMap.B1[0]?.startTime || batchMap.B2[0]?.startTime,
                        conflictingPeriod: batchMap.B1[1]?.startTime || batchMap.B2[1]?.startTime,
                        requiredPeriods: 0,
                        availableDays: []
                  })
            }

            const b1 = batchMap.B1[0]
            const b2 = batchMap.B2[0]
            if (!b1 || !b2) return

            if (subjectsMatch(b1, b2)) {
                  conflicts.push({
                        type: 'pairedLabMismatch',
                        message: 'Batch lab subjects must be different on the same day.',
                        section: sectionDayKey.split('|')[0],
                        day: sectionDayKey.split('|')[1],
                        subject: b1.subjectName || b1.subjectCode,
                        existingPeriod: b1.startTime,
                        conflictingPeriod: b2.startTime,
                        requiredPeriods: 0,
                        availableDays: []
                  })
            }

            if (b1.startTime !== b2.startTime || b1.endTime !== b2.endTime) {
                  conflicts.push({
                        type: 'pairedLabMismatch',
                        message: 'Batch lab periods must be synchronized exactly.',
                        section: sectionDayKey.split('|')[0],
                        day: sectionDayKey.split('|')[1],
                        subject: b1.subjectName || b1.subjectCode,
                        existingPeriod: b1.startTime,
                        conflictingPeriod: b2.startTime,
                        requiredPeriods: 0,
                        availableDays: []
                  })
            }

            if (parseMinutes(b1.endTime) - parseMinutes(b1.startTime) !== parseMinutes(b2.endTime) - parseMinutes(b2.startTime)) {
                  conflicts.push({
                        type: 'pairedLabMismatch',
                        message: 'Batch lab durations must match exactly.',
                        section: sectionDayKey.split('|')[0],
                        day: sectionDayKey.split('|')[1],
                        subject: b1.subjectName || b1.subjectCode,
                        existingPeriod: b1.startTime,
                        conflictingPeriod: b2.startTime,
                        requiredPeriods: 0,
                        availableDays: []
                  })
            }
      })

      return conflicts
}

const validateLabDailyLimit = (slots) => {
      const conflicts = []
      const sectionDayMap = {}

      slots.filter(slot => slot && (normalizeKey(slot.type) === 'PRACTICAL' || normalizeKey(slot.type) === 'LAB' || slot.isPractical)).forEach(slot => {
            const sectionKey = `${normalizeKey(slot.branch)}-${normalizeKey(slot.section)}-${normalizeKey(slot.semester)}`
            const dayKey = normalizeKey(slot.day)
            const key = `${sectionKey}|${dayKey}`
            if (!sectionDayMap[key]) sectionDayMap[key] = new Set()
            sectionDayMap[key].add(`${slot.startTime}|${slot.endTime}`)
      })

      Object.entries(sectionDayMap).forEach(([sectionDayKey, sessionSet]) => {
            if (sessionSet.size > 1) {
                  const [section, day] = sectionDayKey.split('|')
                  conflicts.push({
                        type: 'labDailyLimit',
                        message: 'Maximum one synchronized lab session per section per day.',
                        section,
                        day,
                        existingPeriod: 'existing lab session',
                        conflictingPeriod: 'additional lab session',
                        requiredPeriods: 0,
                        availableDays: []
                  })
            }
      })

      return conflicts
}

const generateSchedule = async ({ collegeTiming, subjects, faculty, teacherMappings, fixedSlots = [], teacherAvailabilities = [] }) => {
      const timeSlots = buildTimeSlots(collegeTiming)
      const lectureSlots = timeSlots.filter(s => s.type === 'Lecture')
      const availabilityMap = buildAvailabilityMap(teacherAvailabilities)
      const filteredMappings = teacherMappings.filter(m => m && m.subjectCode)
      const groupMap = buildGroupMap(filteredMappings, subjects)
      const groups = Object.values(groupMap)
      const generatedSlots = []
      const subjectReservations = {}
      const pairedLabReservations = {}
      const sectionDayLabSessions = {}
      const conflicts = []

      const reservations = {
            faculty: {},
            room: {},
            section: {},
            global: {}
      }

      const fixedStats = scheduleFixedSlots({ fixedSlots, groups, generatedSlots, reservations, subjectReservations, conflicts })

      generatedSlots
            .filter(slot => slot && (normalizeKey(slot.type) === 'PRACTICAL' || normalizeKey(slot.type) === 'LAB' || slot.isPractical))
            .forEach(slot => {
                  const sectionKey = `${normalizeKey(slot.branch)}-${normalizeKey(slot.section)}-${normalizeKey(slot.semester)}`
                  const dayKey = normalizeKey(slot.day)
                  if (!sectionDayLabSessions[sectionKey]) sectionDayLabSessions[sectionKey] = {}
                  sectionDayLabSessions[sectionKey][dayKey] = 1
            })

      const stats = {
            totalRequiredLectures: 0,
            scheduledLectures: 0,
            missingLectures: 0,
            teacherConflicts: 0,
            roomConflicts: 0,
            sectionConflicts: 0,
            practicalConflicts: 0,
            activityConflicts: 0,
            lockedLecturesPreserved: fixedStats.locked > 0,
            activitiesPreserved: fixedStats.activities > 0,
            blockedTeacherSlotsRespected: true,
            facultyLoadsCompleted: true,
            theoryLoadsCompleted: true,
            practicalLoadsCompleted: true,
            conflictCount: 0
      }

      const facultyLoad = {}
      const recordFacultyLoad = (facultyId, facultyName) => {
            const fid = normalizeKey(facultyId) || 'TBD'
            if (!facultyLoad[fid]) {
                  facultyLoad[fid] = { facultyName: facultyName || fid, assignedTheory: 0, scheduledTheory: 0, assignedPractical: 0, scheduledPractical: 0 }
            }
            return facultyLoad[fid]
      }

      const pendingPracticals = []
      const pendingTheories = []

      groups.forEach(group => {
            const sectionKey = `${group.branch}-${group.section}-${group.semester}`
            group.practicals.forEach(mapping => {
                  const sessionsNeeded = Math.max(1, Math.ceil(mapping.loadPractical / 2))
                  const facLoad = recordFacultyLoad(mapping.facultyId, mapping.facultyName)
                  facLoad.assignedPractical += sessionsNeeded
                  stats.totalRequiredLectures += sessionsNeeded * 2
                  pendingPracticals.push({ ...mapping, sessionsRemaining: sessionsNeeded, sectionKey })
            })
            group.theories.forEach(mapping => {
                  const lecturesNeeded = Math.max(0, mapping.loadTheory)
                  const facLoad = recordFacultyLoad(mapping.facultyId, mapping.facultyName)
                  facLoad.assignedTheory += lecturesNeeded
                  stats.totalRequiredLectures += lecturesNeeded
                  if (lecturesNeeded > 0) {
                        pendingTheories.push({ ...mapping, lecturesRemaining: lecturesNeeded, sectionKey })
                  }
            })
      })

      const findPracticalPair = (entries) => {
            const sorted = [...entries].sort((a, b) => normalizeKey(a.subjectCode).localeCompare(normalizeKey(b.subjectCode)) || normalizeKey(a.facultyId).localeCompare(normalizeKey(b.facultyId)))
            for (let i = 0; i < sorted.length; i += 1) {
                  for (let j = i + 1; j < sorted.length; j += 1) {
                        const a = sorted[i]
                        const b = sorted[j]
                        if (!a || !b) continue
                        if (normalizeKey(a.sectionKey) !== normalizeKey(b.sectionKey)) continue
                        if (normalizeKey(a.facultyId) && normalizeKey(a.facultyId) === normalizeKey(b.facultyId)) continue
                        if (normalizeKey(a.preferredRoom) && normalizeKey(a.preferredRoom) === normalizeKey(b.preferredRoom)) continue
                        return [a, b]
                  }
            }
            return []
      }

      const canSchedulePairedLab = ({ sectionKey, day, batch, startTime, endTime }) => {
            const dayKey = normalizeKey(day)
            if (sectionDayLabSessions[sectionKey]?.[dayKey] >= 1) return false
            const batchKey = `${sectionKey}|${normalizeKey(day)}|${normalizeKey(batch)}`
            const existing = pairedLabReservations[batchKey] || []
            return !existing.some(entry => entry.startTime !== startTime || entry.endTime !== endTime)
      }

      const registerPairedLab = ({ sectionKey, day, batch, startTime, endTime }) => {
            const dayKey = normalizeKey(day)
            if (!sectionDayLabSessions[sectionKey]) sectionDayLabSessions[sectionKey] = {}
            sectionDayLabSessions[sectionKey][dayKey] = 1
            const batchKey = `${sectionKey}|${normalizeKey(day)}|${normalizeKey(batch)}`
            if (!pairedLabReservations[batchKey]) pairedLabReservations[batchKey] = []
            pairedLabReservations[batchKey].push({ startTime, endTime })
      }

      const schedulePracticalBatch = (entries) => {
            const results = []
            const available = entries.filter(e => e.sessionsRemaining > 0)
            const pair = findPracticalPair(available)
            if (pair.length !== 2) return results
            const [a, b] = pair
            for (const day of [...new Set(timeSlots.map(s => s.day))]) {
                  for (let si = 0; si < lectureSlots.length; si += 1) {
                        const slot1 = lectureSlots[si]
                        const nextIndex = getConsecutiveSlotIndex(lectureSlots, si)
                        if (nextIndex < 0) continue
                        const slot2 = lectureSlots[nextIndex]
                        const key1 = `${day}|${slot1.startTime}`
                        const key2 = `${day}|${slot2.startTime}`
                        if (!canScheduleAt({ sectionKey: a.sectionKey, facultyId: a.facultyId, room: a.preferredRoom || a.preferredLab, day, lectureSlot: slot1, reservations, availabilityMap, subjectReservations, subjectCode: a.subjectCode, subjectName: a.subjectName, type: 'Practical' })) continue
                        if (!canScheduleAt({ sectionKey: a.sectionKey, facultyId: a.facultyId, room: a.preferredRoom || a.preferredLab, day, lectureSlot: slot2, reservations, availabilityMap, subjectReservations, subjectCode: a.subjectCode, subjectName: a.subjectName, type: 'Practical' })) continue
                        if (!canScheduleAt({ sectionKey: b.sectionKey, facultyId: b.facultyId, room: b.preferredRoom || b.preferredLab, day, lectureSlot: slot1, reservations, availabilityMap, subjectReservations, subjectCode: b.subjectCode, subjectName: b.subjectName, type: 'Practical' })) continue
                        if (!canScheduleAt({ sectionKey: b.sectionKey, facultyId: b.facultyId, room: b.preferredRoom || b.preferredLab, day, lectureSlot: slot2, reservations, availabilityMap, subjectReservations, subjectCode: b.subjectCode, subjectName: b.subjectName, type: 'Practical' })) continue
                        if (!canSchedulePairedLab({ sectionKey: a.sectionKey, day, batch: 'B1', startTime: slot1.startTime, endTime: slot2.endTime })) continue
                        if (!canSchedulePairedLab({ sectionKey: a.sectionKey, day, batch: 'B2', startTime: slot1.startTime, endTime: slot2.endTime })) continue
                        if (reservations.section[a.sectionKey]?.has(key1) || reservations.section[a.sectionKey]?.has(key2)) continue
                        if (reservations.section[b.sectionKey]?.has(key1) || reservations.section[b.sectionKey]?.has(key2)) continue
                        schedulePracticalSession({ generatedSlots, reservations, sectionKey: a.sectionKey, day, slot1, slot2, assignmentA: a, assignmentB: b })
                        registerSubject(subjectReservations, a.sectionKey, day, { subjectCode: a.subjectCode, subjectName: a.subjectName, type: 'Practical', startTime: slot1.startTime, endTime: slot2.endTime })
                        registerSubject(subjectReservations, b.sectionKey, day, { subjectCode: b.subjectCode, subjectName: b.subjectName, type: 'Practical', startTime: slot1.startTime, endTime: slot2.endTime })
                        registerPairedLab({ sectionKey: a.sectionKey, day, batch: 'B1', startTime: slot1.startTime, endTime: slot2.endTime })
                        registerPairedLab({ sectionKey: a.sectionKey, day, batch: 'B2', startTime: slot1.startTime, endTime: slot2.endTime })
                        a.sessionsRemaining -= 1
                        b.sessionsRemaining -= 1
                        const loadA = recordFacultyLoad(a.facultyId, a.facultyName)
                        const loadB = recordFacultyLoad(b.facultyId, b.facultyName)
                        loadA.scheduledPractical += 1
                        loadB.scheduledPractical += 1
                        stats.scheduledLectures += 2
                        return [{ a, b }]
                  }
            }
            return results
      }

      let practicalProgress = true
      while (practicalProgress) {
            practicalProgress = false
            const available = pendingPracticals.filter(p => p.sessionsRemaining > 0)
            if (available.length < 2) break
            const scheduled = schedulePracticalBatch(available)
            if (scheduled.length > 0) practicalProgress = true
            else break
      }

      pendingPracticals.forEach(entry => {
            if (entry.sessionsRemaining > 0) {
                  stats.missingLectures += entry.sessionsRemaining * 2
                  stats.practicalConflicts += entry.sessionsRemaining
                  entry.unscheduled = true
            }
      })

      const sortTheories = pendingTheories.sort((a, b) => {
            const keyA = `${a.sectionKey}-${normalizeKey(a.subjectCode)}`
            const keyB = `${b.sectionKey}-${normalizeKey(b.subjectCode)}`
            return keyA.localeCompare(keyB)
      })

      // Helper: check if a subject already has a slot on a given day for a section
      const subjectAlreadyOnDay = (sectionKey, day, subjectCode, subjectName) => {
            const dayKey = normalizeKey(day)
            const entries = subjectReservations[sectionKey]?.[dayKey] || []
            return entries.some(entry => subjectsMatch(entry, { subjectCode, subjectName }))
      }

      sortTheories.forEach(mapping => {
            let remaining = mapping.lecturesRemaining
            const workingDaysList = [...new Set(timeSlots.map(s => s.day))]

            // Pass A: spread — place at most ONE lecture per day per subject
            for (const day of workingDaysList) {
                  if (remaining <= 0) break
                  // Skip this day if subject is already scheduled here
                  if (subjectAlreadyOnDay(mapping.sectionKey, day, mapping.subjectCode, mapping.subjectName)) continue
                  for (const lectureSlot of lectureSlots) {
                        if (remaining <= 0) break
                        if (!canScheduleAt({ sectionKey: mapping.sectionKey, facultyId: mapping.facultyId, room: mapping.preferredRoom || mapping.preferredLab, day, lectureSlot, reservations, availabilityMap, subjectReservations, subjectCode: mapping.subjectCode, subjectName: mapping.subjectName, type: 'Theory' })) continue
                        scheduleLecture({ generatedSlots, reservations, sectionKey: mapping.sectionKey, facultyId: mapping.facultyId, facultyName: mapping.facultyName, room: mapping.preferredRoom || mapping.preferredLab, day, lectureSlot, subjectCode: mapping.subjectCode, subjectName: mapping.subjectName, batch: '', type: 'Theory' })
                        registerSubject(subjectReservations, mapping.sectionKey, day, { subjectCode: mapping.subjectCode, subjectName: mapping.subjectName, type: 'Theory', startTime: lectureSlot.startTime, endTime: lectureSlot.endTime })
                        remaining -= 1
                        const load = recordFacultyLoad(mapping.facultyId, mapping.facultyName)
                        load.scheduledTheory += 1
                        stats.scheduledLectures += 1
                        break // only one slot per day per subject in pass A
                  }
            }

            // Pass B: if load > working days, allow a second slot per day (but canScheduleAt still
            // blocks placing the same subject in the same slot via subjectReservations)
            if (remaining > 0) {
                  for (const day of workingDaysList) {
                        if (remaining <= 0) break
                        for (const lectureSlot of lectureSlots) {
                              if (remaining <= 0) break
                              if (!canScheduleAt({ sectionKey: mapping.sectionKey, facultyId: mapping.facultyId, room: mapping.preferredRoom || mapping.preferredLab, day, lectureSlot, reservations, availabilityMap, subjectReservations, subjectCode: mapping.subjectCode, subjectName: mapping.subjectName, type: 'Theory' })) continue
                              scheduleLecture({ generatedSlots, reservations, sectionKey: mapping.sectionKey, facultyId: mapping.facultyId, facultyName: mapping.facultyName, room: mapping.preferredRoom || mapping.preferredLab, day, lectureSlot, subjectCode: mapping.subjectCode, subjectName: mapping.subjectName, batch: '', type: 'Theory' })
                              registerSubject(subjectReservations, mapping.sectionKey, day, { subjectCode: mapping.subjectCode, subjectName: mapping.subjectName, type: 'Theory', startTime: lectureSlot.startTime, endTime: lectureSlot.endTime })
                              remaining -= 1
                              const load = recordFacultyLoad(mapping.facultyId, mapping.facultyName)
                              load.scheduledTheory += 1
                              stats.scheduledLectures += 1
                        }
                  }
            }
            if (remaining > 0) {
                  stats.missingLectures += remaining
                  stats.teacherConflicts += remaining
                  stats.sectionConflicts += remaining
                  const existingSubject = Object.entries(subjectReservations[mapping.sectionKey] || {})
                        .flatMap(([day, entries]) => entries.filter(entry => subjectsMatch(entry, mapping)).map(entry => ({ day, entry })))
                        .find(Boolean)
                  if (existingSubject) {
                        conflicts.push({
                              type: 'sameSubjectSameDay',
                              message: 'Same subject scheduled multiple times on the same day.',
                              section: mapping.sectionKey,
                              subject: mapping.subjectName || mapping.subjectCode,
                              day: existingSubject.day,
                              existingPeriod: existingSubject.entry.startTime,
                              conflictingPeriod: 'unscheduled',
                              requiredPeriods: mapping.lecturesRemaining,
                              availableDays: [...new Set(timeSlots.map(slot => slot.day))]
                        })
                  }
                  mapping.unscheduled = true
            }
      })

      const facultyFailures = Object.values(facultyLoad).filter(fl => fl.scheduledTheory < fl.assignedTheory || fl.scheduledPractical < fl.assignedPractical)
      stats.facultyLoadsCompleted = facultyFailures.length === 0
      stats.theoryLoadsCompleted = Object.values(facultyLoad).every(fl => fl.scheduledTheory >= fl.assignedTheory)
      stats.practicalLoadsCompleted = Object.values(facultyLoad).every(fl => fl.scheduledPractical >= fl.assignedPractical)
      stats.conflictCount = stats.teacherConflicts + stats.roomConflicts + stats.sectionConflicts + stats.practicalConflicts + stats.activityConflicts
      conflicts.push(...validateSameSubjectSameDay(generatedSlots))
      conflicts.push(...validatePairedLabSessions(generatedSlots))
      conflicts.push(...validateLabDailyLimit(generatedSlots))
      stats.sameSubjectSameDayConflicts = conflicts.filter(conflict => conflict.type === 'sameSubjectSameDay').length
      stats.pairedLabConflicts = conflicts.filter(conflict => conflict.type === 'pairedLabMismatch').length
      stats.labDailyLimitConflicts = conflicts.filter(conflict => conflict.type === 'labDailyLimit').length
      stats.conflictCount += stats.sameSubjectSameDayConflicts + stats.pairedLabConflicts + stats.labDailyLimitConflicts

      const report = {
            totalGroups: groups.length,
            totalFixedSlots: fixedSlots.length,
            totalRequiredLectures: stats.totalRequiredLectures,
            scheduledLectures: stats.scheduledLectures,
            missingLectures: stats.missingLectures,
            facultyLoad: Object.values(facultyLoad),
            unscheduledTheory: pendingTheories.filter(m => m.unscheduled).map(m => ({ subjectCode: m.subjectCode, subjectName: m.subjectName, sectionKey: m.sectionKey, reason: 'No valid slot available', requested: m.lecturesRemaining, availableDays: [...new Set(timeSlots.map(slot => slot.day))] })),
            unscheduledPracticals: pendingPracticals.filter(p => p.unscheduled).map(p => ({ subjectCode: p.subjectCode, subjectName: p.subjectName, sectionKey: p.sectionKey, reason: 'No valid pair slot available', sessionsRemaining: p.sessionsRemaining, availableDays: [...new Set(timeSlots.map(slot => slot.day))] })),
            sameSubjectSameDayConflicts: conflicts.filter(conflict => conflict.type === 'sameSubjectSameDay'),
            pairedLabConflicts: conflicts.filter(conflict => conflict.type === 'pairedLabMismatch'),
            labDailyLimitConflicts: conflicts.filter(conflict => conflict.type === 'labDailyLimit')
      }

      return {
            slots: generatedSlots,
            timeSlots,
            stats,
            report,
            conflicts,
            generatedAt: new Date().toISOString(),
            groups
      }
}

module.exports = {
      generateSchedule,
      buildTimeSlots,
      minutesToTime,
      normalizeSubjectName,
      validateSameSubjectSameDay,
      validatePairedLabSessions,
      validateLabDailyLimit
}
