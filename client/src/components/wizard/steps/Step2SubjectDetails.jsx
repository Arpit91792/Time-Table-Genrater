import { useState, useRef } from 'react'
import { BookOpen, Download, Upload, Plus, Trash2, Copy, Save, AlertCircle, X, CheckCircle } from 'lucide-react'
import { useTimetable } from '../../../context/TimetableContext'

const BRANCHES = ['CSE', 'CSE (AI)', 'AI', 'IT', 'ECE', 'ME', 'CE', 'EE']
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]

const emptySubject = () => ({
      subjectCode: '',
      subjectName: '',
      semester: 3,
      branch: 'CSE',
      section: 'A',
      theoryOrLab: 'Theory',
      hoursPerWeek: 3,
      credits: 3,
      lecturesRequired: 0,
      practicalRequired: 0,
})

// ── Robust CSV parser (handles quoted fields with commas) ─────────────────────
function parseCsvLine(line, delim = ',') {
      const result = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') { inQuote = !inQuote; continue }
            if (ch === delim && !inQuote) { result.push(cur.trim()); cur = ''; continue }
            cur += ch
      }
      result.push(cur.trim())
      return result
}

function parseSubjectImport(text) {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length === 0) return []
      const delim = lines[0].includes('\t') ? '\t' : ','
      const firstLower = lines[0].toLowerCase()
      const hasHeader = firstLower.includes('subject') || firstLower.includes('code') || firstLower.includes('name')
      const dataLines = hasHeader ? lines.slice(1) : lines
      return dataLines.map(line => {
            const cols = parseCsvLine(line, delim)
            return {
                  subjectCode: (cols[0] || '').toUpperCase(),
                  subjectName: cols[1] || '',
                  semester: Number(cols[2]) || 3,
                  branch: (cols[3] || 'CSE').toUpperCase(),
                  section: (cols[4] || 'A').toUpperCase(),
                  theoryOrLab: cols[5] || 'Theory',
                  hoursPerWeek: Number(cols[6]) || 3,
                  credits: Number(cols[7]) || 3,
            }
      }).filter(r => r.subjectCode && r.subjectName)
}

const Step2SubjectDetails = ({ showHeader = true } = {}) => {
      const {
            subjects,
            isLoading,
            isSaving,
            createSubject,
            updateSubject,
            deleteSubject,
      } = useTimetable()

      const [editingCell, setEditingCell] = useState(null)
      const [cellValue, setCellValue] = useState('')
      const [error, setError] = useState('')
      const [importResult, setImportResult] = useState(null)
      const [pendingRows, setPendingRows] = useState([])
      const [deleting, setDeleting] = useState(false)
      const fileInputRef = useRef(null)
      const isSavingCell = useRef(false)

      const displaySubjects = [...(subjects || []), ...(pendingRows || [])]

      // ── Cell editing ────────────────────────────────────────────────────────────
      const handleCellClick = (rowIndex, colName) => {
            const subject = displaySubjects[rowIndex]
            if (!subject) return
            setEditingCell({ rowIndex, colName, id: subject._id || subject.tempId })
            setCellValue(subject[colName] ?? '')
            setError('')
      }

      const saveCellEdit = async (overrideValue) => {
            if (!editingCell) return
            const { rowIndex, colName } = editingCell
            const subject = displaySubjects[rowIndex]
            if (!subject) { setEditingCell(null); return }

            let newValue = overrideValue !== undefined ? overrideValue : cellValue
            if (colName === 'semester') newValue = Number(newValue)
            setEditingCell(null)

            if (subject.tempId && !subject._id) {
                  const updated = { ...subject, [colName]: newValue }
                  setPendingRows(prev => prev.map(r => r.tempId === subject.tempId ? updated : r))
                  if (updated.subjectCode?.trim() && updated.subjectName?.trim()) {
                        const { tempId, ...payload } = updated
                        const res = await createSubject(payload)
                        if (res.success) setPendingRows(prev => prev.filter(r => r.tempId !== tempId))
                        else setError(res.message || 'Failed to create subject')
                  }
                  return
            }
            if (String(subject[colName]) === String(newValue)) return
            const res = await updateSubject(subject._id, { [colName]: newValue })
            if (!res.success) setError(res.message || 'Failed to save change')
      }

      // ── Row actions ─────────────────────────────────────────────────────────────
      const addRow = () => {
            setPendingRows(prev => [...prev, { ...emptySubject(), tempId: `draft-${Date.now()}` }])
            setError('')
      }

      const saveDraftRow = async (tempId) => {
            const draft = pendingRows.find(r => r.tempId === tempId)
            if (!draft) return
            if (!draft.subjectCode?.trim() || !draft.subjectName?.trim()) {
                  setError('Subject code and name are required before saving'); return
            }
            const { tempId: _t, ...payload } = draft
            const res = await createSubject(payload)
            if (res.success) { setPendingRows(prev => prev.filter(r => r.tempId !== tempId)); setError('') }
            else setError(res.message || 'Failed to create subject')
      }

      const deleteRow = async (rowIndex) => {
            const subject = displaySubjects[rowIndex]
            if (!subject) return
            if (subject.tempId && !subject._id) {
                  setPendingRows(prev => prev.filter(r => r.tempId !== subject.tempId)); return
            }
            if (!window.confirm(`Delete "${subject.subjectCode}" permanently?`)) return
            const res = await deleteSubject(subject._id)
            if (!res.success) setError(res.message || 'Failed to delete subject')
      }

      const duplicateRow = async (rowIndex) => {
            const source = displaySubjects[rowIndex]
            if (!source) return
            const payload = {
                  subjectCode: `${source.subjectCode || 'NEW'}_COPY`,
                  subjectName: source.subjectName || '',
                  semester: Number(source.semester) || 3,
                  branch: source.branch || 'CSE',
                  theoryOrLab: source.theoryOrLab || 'Theory',
                  hoursPerWeek: source.hoursPerWeek || 3,
                  credits: source.credits || 3,
            }
            if (!source._id) { setPendingRows(prev => [...prev, { ...payload, tempId: `draft-${Date.now()}` }]); return }
            const res = await createSubject(payload)
            if (!res.success) setError(res.message || 'Failed to duplicate subject')
      }

      // ── Delete All ──────────────────────────────────────────────────────────────
      const deleteAll = async () => {
            if (subjects.length === 0 && pendingRows.length === 0) return
            if (!window.confirm(`Delete ALL ${subjects.length} subject${subjects.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
            setDeleting(true)
            setPendingRows([])
            for (const s of [...subjects]) {
                  await deleteSubject(s._id)
            }
            setDeleting(false)
      }

      // ── Import ───────────────────────────────────────────────────────────────────
      const handleFileSelected = async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
                  const text = await file.text()
                  const rows = parseSubjectImport(text)
                  if (rows.length === 0) { setError('No valid rows found. Required columns: Subject Code, Subject Name, Semester, Branch'); return }
                  let ok = 0, failed = 0
                  for (const row of rows) {
                        const res = await createSubject(row)
                        res.success ? ok++ : failed++
                  }
                  setImportResult({ ok, failed })
                  if (failed === 0) setError('')
            } catch (err) {
                  setError(err.message || 'Failed to import file')
            }
      }

      const handlePaste = () => {
            navigator.clipboard.readText().then(async text => {
                  const rows = parseSubjectImport(text)
                  if (rows.length === 0) { setError('No valid rows in clipboard'); return }
                  let ok = 0
                  for (const row of rows) {
                        const res = await createSubject(row)
                        if (res.success) ok++
                  }
                  setImportResult({ ok, failed: rows.length - ok })
                  if (ok > 0) setError('')
            }).catch(() => setError('Clipboard access denied'))
      }

      const downloadTemplate = () => {
            const csv = [
                  'Subject Code,Subject Name,Semester,Branch',
                  'CS301,Operating System,3,CSE',
                  'CS302,Data Structures,3,CSE',
                  'CS303,OS Lab,3,IT',
                  'CS401,Computer Networks,4,CSE',
            ].join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'subjects_template.csv'; a.click()
            URL.revokeObjectURL(url)
      }

      const handleExport = () => {
            if (subjects.length === 0) { setError('No subjects to export'); return }
            const csv = [
                  ['Subject Code', 'Subject Name', 'Semester', 'Branch', 'Section', 'Type', 'Hours/Week', 'Credits'],
                  ...subjects.map(s => [s.subjectCode, s.subjectName, s.semester, s.branch, s.section || 'A', s.theoryOrLab || 'Theory', s.hoursPerWeek || 3, s.credits || 3])
            ].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'subjects_export.csv'; a.click()
            URL.revokeObjectURL(url)
      }

      // ── Cell renderer ────────────────────────────────────────────────────────────
      const renderEditableCell = (subject, rowIndex, colName, isSelect, options) => {
            const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colName === colName
            if (isEditing && isSelect) {
                  return (
                        <select
                              value={cellValue}
                              onChange={e => { const v = e.target.value; setCellValue(v); saveCellEdit(v) }}
                              className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                              autoFocus
                        >
                              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                  )
            }
            if (isEditing) {
                  return (
                        <input
                              type={colName === 'semester' ? 'number' : 'text'}
                              value={cellValue}
                              onChange={e => setCellValue(e.target.value)}
                              onBlur={() => { if (!isSavingCell.current) saveCellEdit(); isSavingCell.current = false }}
                              onKeyDown={e => { if (e.key === 'Enter') { isSavingCell.current = true; saveCellEdit() } }}
                              className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                              autoFocus
                        />
                  )
            }
            return (
                  <div onClick={() => handleCellClick(rowIndex, colName)} className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors min-h-[28px] text-sm">
                        {subject[colName] ?? ''}
                  </div>
            )
      }

      return (
            <div className="max-w-full overflow-x-auto">
                  {showHeader && (
                        <div className="mb-6">
                              <div className="flex items-start space-x-4 mb-4">
                                    <div className="bg-green-100 p-3 rounded-lg">
                                          <BookOpen className="h-8 w-8 text-green-600" />
                                    </div>
                                    <div>
                                          <h2 className="text-2xl font-bold text-gray-900">Subject Details</h2>
                                          <p className="text-gray-600 mt-1">Add subjects manually, import from CSV, or paste from Excel.</p>
                                    </div>
                              </div>
                        </div>
                  )}

                  {/* Banners */}
                  {error && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-red-700 flex-1">{error}</p>
                              <button onClick={() => setError('')}><X className="h-4 w-4 text-red-400 hover:text-red-600" /></button>
                        </div>
                  )}
                  {importResult && (
                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                              <p className="text-sm text-green-700 flex-1">
                                    Imported <strong>{importResult.ok}</strong> subject{importResult.ok !== 1 ? 's' : ''}
                                    {importResult.failed > 0 && <span className="text-red-600"> · {importResult.failed} failed</span>}
                              </p>
                              <button onClick={() => setImportResult(null)}><X className="h-4 w-4 text-green-400 hover:text-green-600" /></button>
                        </div>
                  )}

                  {/* Hidden file input */}
                  <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileSelected} />

                  {/* Toolbar */}
                  <div className="bg-white border border-gray-300 rounded-lg p-3 mb-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                          className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Upload className="h-4 w-4" /> Import CSV
                                    </button>
                                    <button type="button" onClick={handlePaste}
                                          className="px-3 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Copy className="h-4 w-4" /> Paste from Excel
                                    </button>
                                    <button type="button" onClick={downloadTemplate}
                                          className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Download className="h-4 w-4" /> Template
                                    </button>
                                    <button type="button" onClick={handleExport}
                                          className="px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Download className="h-4 w-4" /> Export CSV
                                    </button>
                                    <button type="button" onClick={addRow}
                                          className="px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Plus className="h-4 w-4" /> Add Subject
                                    </button>
                                    {subjects.length > 0 && (
                                          <button type="button" onClick={deleteAll} disabled={deleting}
                                                className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-50">
                                                <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting…' : `Delete All (${subjects.length})`}
                                          </button>
                                    )}
                              </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                              CSV columns: <code className="bg-gray-100 px-1 rounded">Subject Code, Subject Name, Semester, Branch</code>
                              &nbsp;· Tab-separated also works &nbsp;· Header row auto-detected
                        </p>
                  </div>

                  {/* Spreadsheet grid */}
                  <div className="max-h-[620px] overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white">
                        {/* Header */}
                        <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-300 sticky top-0 z-10 min-w-[700px]">
                              {[
                                    { label: 'Subject Code', span: 2 },
                                    { label: 'Subject Name', span: 3 },
                                    { label: 'Semester', span: 1 },
                                    { label: 'Branch', span: 2 },
                                    { label: 'Actions', span: 4 },
                              ].map(h => (
                                    <div key={h.label}
                                          className={`px-3 py-3 text-sm font-semibold text-gray-700 border-r border-gray-300 last:border-r-0 col-span-${h.span}`}>
                                          {h.label}
                                    </div>
                              ))}
                        </div>

                        <div className="bg-white divide-y divide-gray-100 min-w-[700px]">
                              {isLoading && displaySubjects.length === 0 && (
                                    <div className="px-6 py-12 text-center text-gray-400">Loading subjects…</div>
                              )}
                              {!isLoading && displaySubjects.length === 0 && (
                                    <div className="px-6 py-16 text-center">
                                          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                          <p className="font-medium text-gray-600">No subjects yet.</p>
                                          <p className="text-sm text-gray-400 mt-1">Click "Add Subject" or import from CSV.</p>
                                          <button type="button" onClick={addRow}
                                                className="mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2 text-sm">
                                                <Plus className="h-4 w-4" /> Add Subject
                                          </button>
                                    </div>
                              )}

                              {displaySubjects.map((subject, rowIndex) => {
                                    const isDraft = Boolean(subject.tempId && !subject._id)
                                    return (
                                          <div key={subject._id || subject.tempId}
                                                className={`grid grid-cols-12 hover:bg-gray-50 transition-colors ${isDraft ? 'bg-amber-50/60' : ''}`}>
                                                <div className="px-3 py-2.5 border-r border-gray-200 col-span-2">
                                                      {renderEditableCell(subject, rowIndex, 'subjectCode')}
                                                </div>
                                                <div className="px-3 py-2.5 border-r border-gray-200 col-span-3">
                                                      {renderEditableCell(subject, rowIndex, 'subjectName')}
                                                </div>
                                                <div className="px-3 py-2.5 border-r border-gray-200 col-span-1">
                                                      {renderEditableCell(subject, rowIndex, 'semester', true, SEMESTERS)}
                                                </div>
                                                <div className="px-3 py-2.5 border-r border-gray-200 col-span-2">
                                                      {renderEditableCell(subject, rowIndex, 'branch', true, BRANCHES)}
                                                </div>
                                                <div className="px-3 py-2.5 flex items-center gap-1.5 col-span-4">
                                                      {isDraft && (
                                                            <button type="button" onClick={() => saveDraftRow(subject.tempId)} disabled={isSaving}
                                                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition" title="Save">
                                                                  <Save className="h-3.5 w-3.5" />
                                                            </button>
                                                      )}
                                                      {!isDraft && (
                                                            <button type="button" onClick={() => duplicateRow(rowIndex)}
                                                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" title="Duplicate">
                                                                  <Copy className="h-3.5 w-3.5" />
                                                            </button>
                                                      )}
                                                      <button type="button" onClick={() => deleteRow(rowIndex)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition" title="Delete">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                      </button>
                                                </div>
                                          </div>
                                    )
                              })}
                        </div>
                  </div>

                  {/* Footer summary */}
                  <div className="mt-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                        <p className="text-sm text-gray-600">
                              <strong>{subjects.length}</strong> subject{subjects.length !== 1 ? 's' : ''} saved
                              {pendingRows.length > 0 && <span className="text-amber-600"> · {pendingRows.length} draft</span>}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Save className="h-3 w-3" /> {isSaving ? 'Saving…' : 'Auto-saved'}
                        </p>
                  </div>
            </div>
      )
}

export default Step2SubjectDetails
