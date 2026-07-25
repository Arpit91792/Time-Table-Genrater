import { useState, useRef } from 'react'
import { Users, Download, Upload, Plus, Trash2, Copy, Save, Search, AlertCircle, X, CheckCircle } from 'lucide-react'
import { useTimetable } from '../../../context/TimetableContext'

const DEPARTMENTS = ['CSE', 'CSE (AI)', 'AI', 'IT', 'ECE', 'ME', 'CE', 'EE', 'Math', 'Physics', 'Chemistry']
const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Visiting Faculty', 'Guest Faculty', 'HOD', 'Dean']

const emptyFaculty = () => ({
      name: '', designation: 'Assistant Professor', department: 'CSE',
      inTime: '09:00', outTime: '17:00', shortName: '', remarks: ''
})

// ── Robust CSV parser ─────────────────────────────────────────────────────────
function parseCsvLine(line, delim = ',') {
      const result = []; let cur = ''; let inQuote = false
      for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') { inQuote = !inQuote; continue }
            if (ch === delim && !inQuote) { result.push(cur.trim()); cur = ''; continue }
            cur += ch
      }
      result.push(cur.trim()); return result
}

function parseFacultyImport(text) {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length === 0) return []
      const delim = lines[0].includes('\t') ? '\t' : ','
      const firstLower = lines[0].toLowerCase()
      // Detect header — first col is '#' / 'no' / 'sr', or contains known keywords
      const hasHeader =
            firstLower.startsWith('#') ||
            firstLower.startsWith('no') ||
            firstLower.startsWith('sr') ||
            firstLower.includes('name') ||
            firstLower.includes('faculty') ||
            firstLower.includes('department')
      const dataLines = hasHeader ? lines.slice(1) : lines
      return dataLines.map(line => {
            const c = parseCsvLine(line, delim)
            // Format: # | Department | Faculty Name | Designation | Short Name | In Time | Out Time | Remarks
            // c[0] = row number (ignored)
            return {
                  department: c[1] || 'CSE',
                  name: c[2] || '',
                  designation: c[3] || 'Assistant Professor',
                  shortName: c[4] || '',
                  inTime: c[5] || '09:00',
                  outTime: c[6] || '17:00',
                  remarks: c[7] || '',
            }
      }).filter(r => r.name.trim())
}

const Step3FacultyDetails = () => {
      const { faculty, isLoading, isSaving, createFaculty, updateFaculty, deleteFaculty } = useTimetable()

      const [editingCell, setEditingCell] = useState(null)
      const [cellValue, setCellValue] = useState('')
      const [searchTerm, setSearchTerm] = useState('')
      const [error, setError] = useState('')
      const [importResult, setImportResult] = useState(null)
      const [importPreview, setImportPreview] = useState(null)
      const [importing, setImporting] = useState(false)
      const [pendingRows, setPendingRows] = useState([])
      const [deleting, setDeleting] = useState(false)
      const fileInputRef = useRef(null)

      const displayFaculty = [...faculty, ...pendingRows]
      const filteredFaculty = displayFaculty.filter(f => {
            const q = searchTerm.toLowerCase()
            return (f.name || '').toLowerCase().includes(q) || (f.department || '').toLowerCase().includes(q)
      })

      const columns = [
            { key: 'department', label: 'Department', width: '120px' },
            { key: 'name', label: 'Faculty Name', width: '180px' },
            { key: 'designation', label: 'Designation', width: '160px' },
            { key: 'shortName', label: 'Short Name', width: '100px' },
            { key: 'inTime', label: 'In Time', width: '90px' },
            { key: 'outTime', label: 'Out Time', width: '90px' },
            { key: 'remarks', label: 'Remarks', width: '180px' },
      ]

      const getRowId = f => f._id || f.tempId

      // ── Cell editing ────────────────────────────────────────────────────────────
      const handleCellClick = (member, colName) => {
            setEditingCell({ id: getRowId(member), colName })
            setCellValue(member[colName] ?? '')
            setError('')
      }

      const saveCellEdit = async (overrideValue) => {
            if (!editingCell) return
            const member = displayFaculty.find(f => getRowId(f) === editingCell.id)
            const colName = editingCell.colName
            let newValue = overrideValue !== undefined ? overrideValue : cellValue
            if (newValue && typeof newValue === 'object' && newValue.target) newValue = newValue.target.value
            newValue = (typeof newValue === 'string' || typeof newValue === 'number') ? newValue : ''
            setEditingCell(null)
            if (!member) return

            if (member.tempId && !member._id) {
                  const updated = { ...member, [colName]: newValue }
                  setPendingRows(prev => prev.map(r => r.tempId === member.tempId ? updated : r))
                  if (updated.name?.trim()) {
                        const { tempId, ...payload } = updated
                        const res = await createFaculty(payload)
                        if (res.success) { setPendingRows(prev => prev.filter(r => r.tempId !== tempId)); setError('') }
                        else setError(res.message || 'Failed to create faculty')
                  }
                  return
            }
            if (String(member[colName] ?? '') === String(newValue)) return
            const res = await updateFaculty(member._id, { [colName]: newValue })
            if (!res.success) setError(res.message || 'Failed to save change')
      }

      // ── Row actions ─────────────────────────────────────────────────────────────
      const addRow = () => { setPendingRows(prev => [...prev, { ...emptyFaculty(), tempId: `draft-${Date.now()}` }]); setError('') }

      const saveDraftRow = async (tempId) => {
            const draft = pendingRows.find(r => r.tempId === tempId)
            if (!draft?.name?.trim()) { setError('Faculty name is required'); return }
            const { tempId: _t, ...payload } = draft
            const res = await createFaculty(payload)
            if (res.success) { setPendingRows(prev => prev.filter(r => r.tempId !== tempId)); setError('') }
            else setError(res.message || 'Failed to create faculty')
      }

      const deleteRow = async (member) => {
            if (member.tempId && !member._id) { setPendingRows(prev => prev.filter(r => r.tempId !== member.tempId)); return }
            if (!window.confirm(`Delete "${member.name}"?`)) return
            const res = await deleteFaculty(member._id)
            if (!res.success) setError(res.message || 'Failed to delete')
      }

      const duplicateRow = async (member) => {
            const payload = {
                  name: `${member.name} (Copy)`, designation: member.designation || 'Assistant Professor',
                  department: member.department || 'CSE', inTime: member.inTime || '09:00', outTime: member.outTime || '17:00',
                  shortName: member.shortName || '', remarks: member.remarks || ''
            }
            if (!member._id) { setPendingRows(prev => [...prev, { ...payload, tempId: `draft-${Date.now()}` }]); return }
            const res = await createFaculty(payload)
            if (!res.success) setError(res.message || 'Failed to duplicate')
      }

      // ── Delete All ───────────────────────────────────────────────────────────────
      const deleteAll = async () => {
            if (faculty.length === 0 && pendingRows.length === 0) return
            if (!window.confirm(`Delete ALL ${faculty.length} faculty member${faculty.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
            setDeleting(true)
            setPendingRows([])
            for (const f of [...faculty]) { await deleteFaculty(f._id) }
            setDeleting(false)
      }

      // ── Import ───────────────────────────────────────────────────────────────────
      const handleFileSelected = (e) => {
            const file = e.target.files?.[0]; e.target.value = ''
            if (!file) return
            const reader = new FileReader()
            reader.onload = ev => {
                  const rows = parseFacultyImport(ev.target.result)
                  if (rows.length === 0) { setError('No valid rows found. Expected format: #, Department, Faculty Name, Designation, Short Name, In Time, Out Time, Remarks'); return }
                  setImportPreview(rows); setImportResult(null)
            }
            reader.onerror = () => setError('Failed to read file')
            reader.readAsText(file)
      }

      const handlePaste = async () => {
            try {
                  const text = await navigator.clipboard.readText()
                  const rows = parseFacultyImport(text)
                  if (rows.length === 0) { setError('No valid rows in clipboard'); return }
                  setImportPreview(rows); setImportResult(null)
            } catch { setError('Clipboard access denied — use file import instead') }
      }

      const confirmImport = async () => {
            if (!importPreview?.length) return
            setImporting(true)
            let ok = 0, failed = 0
            // Import one at a time to avoid localStorage race conditions
            for (const row of importPreview) {
                  try {
                        const res = await createFaculty(row)
                        res.success ? ok++ : failed++
                  } catch { failed++ }
                  // tiny yield so React can batch state updates between calls
                  await new Promise(r => setTimeout(r, 10))
            }
            setImporting(false); setImportResult({ ok, failed }); setImportPreview(null)
            if (failed === 0) setError('')
      }

      const downloadTemplate = () => {
            const csv = [
                  '#,Department,Faculty Name,Designation,Short Name,In Time,Out Time,Remarks',
                  '1,CSE,Dr. Rajesh Singh,Professor,DR RS,09:00,17:00,HOD',
                  '2,CSE,Vivek Bansal,Associate Professor,VB,09:00,17:00,',
                  '3,IT,Manish Tiwari,Assistant Professor,MT,09:30,17:30,',
            ].join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'faculty_template.csv'; a.click()
            URL.revokeObjectURL(url)
      }

      const handleExport = () => {
            if (faculty.length === 0) { setError('No faculty to export'); return }
            const csv = [
                  ['#', 'Department', 'Faculty Name', 'Designation', 'Short Name', 'In Time', 'Out Time', 'Remarks'],
                  ...faculty.map((f, i) => [i + 1, f.department, f.name, f.designation, f.shortName || '', f.inTime, f.outTime, f.remarks || ''])
            ].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'faculty_export.csv'; a.click()
            URL.revokeObjectURL(url)
      }

      // ── Cell renderer ─────────────────────────────────────────────────────────────
      const renderCell = (member, col) => {
            const isEditing = editingCell?.id === getRowId(member) && editingCell?.colName === col.key
            const val = member[col.key]
            if (isEditing) {
                  if (col.key === 'designation' || col.key === 'department') {
                        const opts = col.key === 'designation' ? DESIGNATIONS : DEPARTMENTS
                        return (
                              <select value={cellValue} autoFocus
                                    onChange={e => { const v = e.target.value; setCellValue(v); saveCellEdit(v) }}
                                    className="w-full px-2 py-1 border border-purple-400 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                        )
                  }
                  return (
                        <input type={['inTime', 'outTime'].includes(col.key) ? 'time' : 'text'} value={cellValue} autoFocus
                              onChange={e => setCellValue(e.target.value)}
                              onBlur={() => saveCellEdit()} onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
                              className="w-full px-2 py-1 border border-purple-400 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  )
            }
            if (col.key === 'name') return <span className="font-medium text-gray-900">{val || '—'}</span>
            if (col.key === 'shortName') return <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{val || 'auto'}</span>
            if (['inTime', 'outTime'].includes(col.key)) return <span className="text-gray-700 font-medium">{val || '—'}</span>
            return <span className="text-gray-600 text-sm">{val || '—'}</span>
      }

      // ── JSX ───────────────────────────────────────────────────────────────────────
      return (
            <div className="max-w-full">
                  {/* Header */}
                  <div className="mb-5 flex items-start gap-4">
                        <div className="bg-purple-100 p-3 rounded-xl"><Users className="h-8 w-8 text-purple-600" /></div>
                        <div>
                              <h2 className="text-2xl font-bold text-gray-900">Faculty Details</h2>
                              <p className="text-gray-500 mt-1 text-sm">Add manually, import CSV, or paste from Excel. Short Name appears in timetable cells.</p>
                        </div>
                  </div>

                  {/* Banners */}
                  {error && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-red-700 flex-1">{error}</p>
                              <button onClick={() => setError('')}><X className="h-4 w-4 text-red-400 hover:text-red-600" /></button>
                        </div>
                  )}
                  {importResult && (
                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <p className="text-sm text-green-700 flex-1">
                                    Imported <strong>{importResult.ok}</strong> faculty member{importResult.ok !== 1 ? 's' : ''}
                                    {importResult.failed > 0 && <span className="text-red-600 ml-1">· {importResult.failed} failed</span>}
                              </p>
                              <button onClick={() => setImportResult(null)}><X className="h-4 w-4 text-green-400 hover:text-green-600" /></button>
                        </div>
                  )}

                  {/* Hidden file input */}
                  <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileSelected} />

                  {/* Import Preview Modal */}
                  {importPreview && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                                          <div>
                                                <h3 className="text-lg font-bold text-gray-900">Import Preview</h3>
                                                <p className="text-sm text-gray-500 mt-0.5">{importPreview.length} row{importPreview.length !== 1 ? 's' : ''} ready — review then confirm</p>
                                          </div>
                                          <button onClick={() => setImportPreview(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
                                    </div>
                                    <div className="flex-1 overflow-auto px-6 py-4">
                                          <table className="w-full text-sm border-collapse">
                                                <thead className="sticky top-0 bg-purple-50">
                                                      <tr>{['#', 'Name', 'Designation', 'Department', 'In', 'Out', 'Short Name', 'Remarks'].map(h => (
                                                            <th key={h} className="px-3 py-2 text-left font-semibold text-purple-800 border border-purple-200 whitespace-nowrap">{h}</th>
                                                      ))}</tr>
                                                </thead>
                                                <tbody>
                                                      {importPreview.map((row, i) => (
                                                            <tr key={i} className="hover:bg-gray-50">
                                                                  <td className="px-3 py-2 text-gray-400 border border-gray-200">{i + 1}</td>
                                                                  <td className="px-3 py-2 font-medium border border-gray-200">{row.name || <span className="text-red-400">MISSING</span>}</td>
                                                                  <td className="px-3 py-2 text-gray-600 border border-gray-200">{row.designation}</td>
                                                                  <td className="px-3 py-2 text-gray-600 border border-gray-200">{row.department}</td>
                                                                  <td className="px-3 py-2 text-gray-600 border border-gray-200">{row.inTime}</td>
                                                                  <td className="px-3 py-2 text-gray-600 border border-gray-200">{row.outTime}</td>
                                                                  <td className="px-3 py-2 border border-gray-200">
                                                                        {row.shortName
                                                                              ? <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{row.shortName}</span>
                                                                              : <span className="text-xs text-gray-300">auto</span>}
                                                                  </td>
                                                                  <td className="px-3 py-2 text-gray-500 border border-gray-200 max-w-[140px] truncate">{row.remarks}</td>
                                                            </tr>
                                                      ))}
                                                </tbody>
                                          </table>
                                    </div>
                                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                                          <button onClick={() => setImportPreview(null)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition">Cancel</button>
                                          <button onClick={confirmImport} disabled={importing}
                                                className="px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60 transition flex items-center gap-2">
                                                {importing
                                                      ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Importing…</>
                                                      : <><Upload className="h-4 w-4" /> Import {importPreview.length} Faculty</>}
                                          </button>
                                    </div>
                              </div>
                        </div>
                  )}

                  {/* Toolbar */}
                  <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                          className="px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Upload className="h-4 w-4" /> Import CSV
                                    </button>
                                    <button type="button" onClick={handlePaste}
                                          className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Copy className="h-4 w-4" /> Paste from Excel
                                    </button>
                                    <button type="button" onClick={downloadTemplate}
                                          className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Download className="h-4 w-4" /> Template
                                    </button>
                                    <button type="button" onClick={handleExport}
                                          className="px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Download className="h-4 w-4" /> Export
                                    </button>
                                    <button type="button" onClick={addRow}
                                          className="px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg flex items-center gap-1.5 text-sm font-medium transition">
                                          <Plus className="h-4 w-4" /> Add Faculty
                                    </button>
                                    {faculty.length > 0 && (
                                          <button type="button" onClick={deleteAll} disabled={deleting}
                                                className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-50">
                                                <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting…' : `Delete All (${faculty.length})`}
                                          </button>
                                    )}
                              </div>
                              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                                    <Search className="h-4 w-4 text-gray-400 mr-2" />
                                    <input type="text" placeholder="Search faculty…" value={searchTerm}
                                          onChange={e => setSearchTerm(e.target.value)}
                                          className="text-sm focus:outline-none bg-transparent w-44 text-gray-800 placeholder-gray-400" />
                              </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                              CSV columns: <code className="bg-gray-100 px-1 rounded">#, Department, Faculty Name, Designation, Short Name, In Time, Out Time, Remarks</code>
                              &nbsp;· Tab-separated also works &nbsp;· First row auto-detected as header
                        </p>
                  </div>

                  {/* Table */}
                  <div className="max-h-[620px] overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white">
                        <table className="w-full text-left border-collapse text-sm">
                              <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                                    <tr>
                                          <th className="px-3 py-3 font-semibold text-gray-700 w-10 text-center">#</th>
                                          {columns.map(col => (
                                                <th key={col.key} className="px-3 py-3 font-semibold text-gray-700 whitespace-nowrap" style={{ minWidth: col.width }}>{col.label}</th>
                                          ))}
                                          <th className="px-3 py-3 font-semibold text-gray-700 text-center w-24">Actions</th>
                                    </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                    {isLoading && filteredFaculty.length === 0 && (
                                          <tr><td colSpan={columns.length + 2} className="px-6 py-12 text-center text-gray-400">Loading…</td></tr>
                                    )}
                                    {!isLoading && filteredFaculty.length === 0 && (
                                          <tr>
                                                <td colSpan={columns.length + 2} className="px-6 py-14 text-center">
                                                      <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                                                      <p className="font-medium text-gray-500">No faculty yet.</p>
                                                      <p className="text-sm text-gray-400 mt-1">Click "Add Faculty" or import a CSV file.</p>
                                                      <button type="button" onClick={addRow}
                                                            className="mt-5 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm inline-flex items-center gap-2">
                                                            <Plus className="h-4 w-4" /> Add Faculty
                                                      </button>
                                                </td>
                                          </tr>
                                    )}
                                    {filteredFaculty.map((member, idx) => {
                                          const isDraft = Boolean(member.tempId && !member._id)
                                          return (
                                                <tr key={getRowId(member)} className={`hover:bg-purple-50/40 transition-colors ${isDraft ? 'bg-amber-50/50' : idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                                                      <td className="px-3 py-3 text-center text-gray-400 text-xs">{idx + 1}</td>
                                                      {columns.map(col => (
                                                            <td key={col.key} className="px-3 py-3 cursor-pointer" onClick={() => handleCellClick(member, col.key)}>
                                                                  {renderCell(member, col)}
                                                            </td>
                                                      ))}
                                                      <td className="px-3 py-3">
                                                            <div className="flex items-center justify-center gap-1">
                                                                  {isDraft && (
                                                                        <button type="button" onClick={() => saveDraftRow(member.tempId)} disabled={isSaving}
                                                                              className="p-1.5 text-green-600 hover:bg-green-100 rounded transition" title="Save">
                                                                              <Save className="h-3.5 w-3.5" />
                                                                        </button>
                                                                  )}
                                                                  {!isDraft && (
                                                                        <button type="button" onClick={() => duplicateRow(member)}
                                                                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition" title="Duplicate">
                                                                              <Copy className="h-3.5 w-3.5" />
                                                                        </button>
                                                                  )}
                                                                  <button type="button" onClick={() => deleteRow(member)}
                                                                        className="p-1.5 text-red-500 hover:bg-red-100 rounded transition" title="Delete">
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                  </button>
                                                            </div>
                                                      </td>
                                                </tr>
                                          )
                                    })}
                              </tbody>
                        </table>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                        <p className="text-sm text-gray-600">
                              <strong>{faculty.length}</strong> faculty saved
                              {pendingRows.length > 0 && <span className="text-amber-600"> · {pendingRows.length} draft</span>}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Save className="h-3 w-3" /> {isSaving ? 'Saving…' : 'Auto-saved to browser storage'}
                        </p>
                  </div>
            </div>
      )
}

export default Step3FacultyDetails
