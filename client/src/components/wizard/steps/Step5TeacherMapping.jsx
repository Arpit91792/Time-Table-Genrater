import { useState, useMemo, useEffect, useRef } from 'react'
import {
    Users, Download, Upload, Plus, Trash2, Copy, Edit2, CheckCircle2,
    RotateCcw, RotateCw, Save, Search, Filter, Settings, FileText,
    AlertCircle, X, CheckCircle, GripVertical
} from 'lucide-react'
import { useTimetable } from '../../../context/TimetableContext'

// ── CSV parser (handles quoted fields) ───────────────────────────────────────
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

// Format: # | Faculty Name | Faculty ID | Subject Code | Subject Name | Sem | Branch | Sec | Type | Load Theory | Load Practical | Pref. Room
// NOTE: Batch column is removed — B1/B2 auto-assigned by scheduler
function parseMappingImport(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return []
    const delim = lines[0].includes('\t') ? '\t' : ','
    const firstLower = lines[0].toLowerCase()
    const hasHeader =
        firstLower.startsWith('#') || firstLower.startsWith('no') ||
        firstLower.includes('faculty') || firstLower.includes('subject')
    const dataLines = hasHeader ? lines.slice(1) : lines
    return dataLines.map(line => {
        const c = parseCsvLine(line, delim)
        // c[0]=# (skip), c[1]=Faculty Name, c[2]=Faculty ID, c[3]=Subject Code,
        // c[4]=Subject Name, c[5]=Sem, c[6]=Branch, c[7]=Sec, c[8]=Type,
        // c[9]=Load Theory, c[10]=Load Practical, c[11]=Pref. Room
        return {
            facultyName: c[1] || '',
            facultyId: c[2] || '',
            subjectCode: c[3] || '',
            subjectName: c[4] || '',
            semester: c[5] || '1',
            branch: c[6] || 'CSE',
            section: c[7] || 'A',
            subjectType: c[8] || 'Theory',
            batch: 'NA',
            loadTheory: Number(c[9]) || 0,
            loadPractical: Number(c[10]) || 0,
            preferredRoom: c[11] || '',
        }
    }).filter(r => r.facultyName.trim() && r.subjectCode.trim())
}

const Step4TeacherMapping = ({
    availableSubjects: propsSubjects,
    availableFaculty: propsFaculty,
    selectedMappings,
    onSelectMappings
}) => {
    const { subjects: storeSubjects, faculty: storeFaculty,
        createTeacherMapping, updateTeacherMapping, deleteTeacherMapping,
        teacherMappings: persistedMappings
    } = useTimetable()

    // Global store is the single source of truth for subjects & faculty
    const subjectList = (propsSubjects?.length ? propsSubjects : storeSubjects) || []
    const facultyList = (propsFaculty?.length ? propsFaculty : storeFaculty) || []

    const subjectOptions = useMemo(() =>
        subjectList.map(s => ({
            code: s.subjectCode,
            name: s.subjectName,
            semester: String(s.semester ?? ''),
            branch: s.branch || '',
            section: s.section || 'A',
            _id: s._id
        })),
        [subjectList]
    )

    const facultyOptions = useMemo(() =>
        facultyList.map(f => ({
            id: f.facultyId || f._id,
            name: f.name,
            maxLoad: f.maxClassesPerWeek || 40,
            _id: f._id
        })),
        [facultyList]
    )

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const allSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '13:00-14:00', '14:00-15:00'];

    // Keep live wizard mappings in sync, but prefer current wizard data when available.
    const [mappings, setMappings] = useState(() =>
        Array.isArray(selectedMappings) && selectedMappings.length > 0
            ? selectedMappings
            : (persistedMappings || [])
    )

    // When the persisted store updates, resync only if the wizard has no current mappings.
    useEffect(() => {
        if (!Array.isArray(selectedMappings) || selectedMappings.length === 0) {
            setMappings(persistedMappings || [])
            if (onSelectMappings) onSelectMappings(persistedMappings || [])
        }
    }, [persistedMappings, selectedMappings, onSelectMappings])

    const pushMappings = (next) => {
        // Only for undo/redo local state; actual persistence goes through API calls
        setMappings(next)
        if (onSelectMappings) onSelectMappings(next)
    }

    // When a subject is renamed/updated in the global store, refresh mapping display names
    useEffect(() => {
        setMappings(prev => {
            const next = prev.map(m => {
                const live = subjectOptions.find(s => s.code === m.subjectCode || s._id === m.subjectId)
                if (!live) return m
                if (live.name === m.subjectName &&
                    String(live.semester) === String(m.semester) &&
                    live.branch === m.branch &&
                    live.section === m.section) {
                    return m
                }
                return {
                    ...m,
                    subjectName: live.name,
                    semester: live.semester || m.semester,
                    branch: live.branch || m.branch,
                    section: live.section || m.section
                }
            })
            const changed = next.some((m, i) => m !== prev[i])
            if (changed && onSelectMappings) onSelectMappings(next)
            return changed ? next : prev
        })
    }, [subjectOptions])

    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Import state
    const fileInputRef = useRef(null)
    const [importPreview, setImportPreview] = useState(null)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [importError, setImportError] = useState('')

    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingMappingId, setEditingMappingId] = useState(null);
    const [formData, setFormData] = useState({});
    const [formErrors, setFormErrors] = useState({});

    const initialFormData = {
        facultyId: '', facultyName: '', subjectCode: '', subjectName: '',
        semester: '1', branch: 'CSE', section: 'A', subjectType: 'Theory',
        preferredRoom: '', loadTheory: 0, loadPractical: 0
    };

    const handleSearch = (e) => {
        // Safely extract value from event object
        const value = e && e.target ? e.target.value : (typeof e === 'string' ? e : '')
        setSearchTerm(value)
    };

    const filteredMappings = useMemo(() => {
        return mappings.filter(m =>
            m.facultyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.facultyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.subjectCode.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [mappings, searchTerm]);

    const saveState = () => {
        setUndoStack([...undoStack, [...mappings]]);
        setRedoStack([]);
    };

    const handleUndo = () => {
        if (undoStack.length === 0) return;
        const lastState = undoStack[undoStack.length - 1];
        setRedoStack([[...mappings], ...redoStack]);
        pushMappings(lastState);
        setUndoStack(undoStack.slice(0, -1));
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const nextState = redoStack[0];
        setUndoStack([...undoStack, [...mappings]]);
        pushMappings(nextState);
        setRedoStack(redoStack.slice(1));
    };

    const deleteMapping = async (id) => {
        if (!window.confirm('Are you sure you want to delete this mapping?')) return
        // Find the mapping — it may have _id (persisted) or only id (local-only)
        const m = mappings.find(x => x._id === id || x.id === id)
        if (!m) return

        if (m?._id) {
            saveState()
            const next = mappings.filter(x => x._id !== m._id)
            pushMappings(next)
            await deleteTeacherMapping(m._id)
        } else {
            // Not persisted yet — just remove from local state
            saveState()
            pushMappings(mappings.filter(x => x.id !== id))
        }
    }

    const duplicateMapping = async (id) => {
        const mappingToCopy = mappings.find(m => m._id === id || m.id === id)
        if (!mappingToCopy) return
        const { _id, id: localId, createdAt, ...rest } = mappingToCopy
        await createTeacherMapping(rest)
    }

    const openDrawer = (mapping = null) => {
        if (mapping) {
            setEditingMappingId(mapping.id);
            setFormData({ ...mapping });
        } else {
            setEditingMappingId(null);
            setFormData({ ...initialFormData });
        }
        setFormErrors({});
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => setIsDrawerOpen(false);

    const handleFormChange = (field, value) => {
        let updatedData = { ...formData, [field]: value };

        // Auto-fill logic from global store
        if (field === 'facultyId') {
            const fac = facultyOptions.find(f => f.id === value);
            if (fac) {
                updatedData.facultyName = fac.name;
            } else {
                updatedData.facultyName = '';
            }
        }
        if (field === 'subjectCode') {
            const sub = subjectOptions.find(s => s.code === value);
            if (sub) {
                updatedData.subjectName = sub.name;
                updatedData.subjectId = sub._id;
                updatedData.semester = sub.semester || updatedData.semester;
                updatedData.branch = sub.branch || updatedData.branch;
                updatedData.section = sub.section || updatedData.section;
            }
        }

        setFormData(updatedData);

        // Clear error for field
        if (formErrors[field]) {
            setFormErrors({ ...formErrors, [field]: null });
        }
    };

    const toggleMultiSelect = (field, value) => {
        const currentList = formData[field] || [];
        if (currentList.includes(value)) {
            handleFormChange(field, currentList.filter(item => item !== value));
        } else {
            handleFormChange(field, [...currentList, value]);
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.facultyId) errors.facultyId = 'Faculty is required';
        if (!formData.subjectCode) errors.subjectCode = 'Subject is required';
        if ((!formData.loadTheory || formData.loadTheory < 0) && (!formData.loadPractical || formData.loadPractical < 0))
            errors.loadTheory = 'At least one load (Theory or Practical) must be greater than 0';

        // Check duplicates (no batch field)
        if (!editingMappingId) {
            const isDup = mappings.some(m =>
                m.facultyId === formData.facultyId &&
                m.subjectCode === formData.subjectCode &&
                m.semester === formData.semester &&
                m.section === formData.section
            );
            if (isDup) errors.general = 'This faculty-subject mapping already exists for this section.';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const saveMapping = async () => {
        if (!validateForm()) return
        if (editingMappingId) {
            // Find the stored _id for this mapping
            const existing = mappings.find(m => m.id === editingMappingId || m._id === editingMappingId)
            if (existing?._id) {
                await updateTeacherMapping(existing._id, { ...formData })
            } else {
                // Wasn't persisted yet — create it now
                await createTeacherMapping({ ...formData })
            }
        } else {
            await createTeacherMapping({ ...formData })
        }
        closeDrawer()
    }

    // ── Import / Export ───────────────────────────────────────────────────────
    const handleFileSelected = (e) => {
        const file = e.target.files?.[0]; e.target.value = ''
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            const rows = parseMappingImport(ev.target.result)
            if (rows.length === 0) {
                setImportError('No valid rows found. Check column order: #, Faculty Name, Faculty ID, Subject Code, Subject Name, Sem, Branch, Sec, Type, Load Theory, Load Practical, Pref. Room')
                return
            }
            setImportPreview(rows); setImportResult(null); setImportError('')
        }
        reader.onerror = () => setImportError('Failed to read file.')
        reader.readAsText(file)
    }

    const handlePasteImport = async () => {
        try {
            const text = await navigator.clipboard.readText()
            const rows = parseMappingImport(text)
            if (rows.length === 0) { setImportError('No valid rows in clipboard.'); return }
            setImportPreview(rows); setImportResult(null); setImportError('')
        } catch { setImportError('Clipboard access denied — use file import instead.') }
    }

    const confirmImport = async () => {
        if (!importPreview?.length) return
        setImporting(true)
        let ok = 0
        for (const row of importPreview) {
            const res = await createTeacherMapping(row)
            if (res.success) ok++
        }
        setImportResult({ ok })
        setImportPreview(null)
        setImporting(false)
    }

    const downloadTemplate = () => {
        const csv = [
            '#,Faculty Name,Faculty ID,Subject Code,Subject Name,Sem,Branch,Sec,Type,Load Theory,Load Practical,Pref. Room',
            '1,Dr. Rajesh Singh,FAC001,CS301,Operating System,3,CSE,A,Theory,3,0,Room 101',
            '2,Vivek Bansal,FAC002,CS302,Data Structures,3,CSE,B,Theory,4,0,',
            '3,Manish Tiwari,FAC003,CS303,OS Lab,3,CSE,A,Practical,0,2,Lab 5',
            '4,Aditya Sharma,FAC004,CS303,OS Lab,3,CSE,A,Practical,0,2,Lab 5',
        ].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'teacher_mapping_template.csv'; a.click()
        URL.revokeObjectURL(url)
    }

    const handleExport = () => {
        if (mappings.length === 0) return
        const csv = [
            ['#', 'Faculty Name', 'Faculty ID', 'Subject Code', 'Subject Name', 'Sem', 'Branch', 'Sec', 'Type', 'Load Theory', 'Load Practical', 'Pref. Room'],
            ...mappings.map((m, i) => [
                i + 1, m.facultyName, m.facultyId, m.subjectCode, m.subjectName,
                m.semester, m.branch, m.section, m.subjectType,
                m.loadTheory ?? 0, m.loadPractical ?? 0, m.preferredRoom || ''
            ])
        ].map(r => r.map(v => `"${(String(v || '')).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'teacher_mappings.csv'; a.click()
        URL.revokeObjectURL(url)
    }

    const deleteAll = async () => {
        if (mappings.length === 0) return
        if (!window.confirm(`Delete ALL ${mappings.length} mapping${mappings.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
        for (const m of [...mappings]) {
            if (m._id) await deleteTeacherMapping(m._id)
        }
    }

    // UI Helpers


    return (
        <div className="max-w-full overflow-hidden flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200">

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileSelected} />

            {/* Import Preview Modal */}
            {importPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Import Preview</h3>
                                <p className="text-sm text-gray-500 mt-0.5">{importPreview.length} row{importPreview.length !== 1 ? 's' : ''} — review then confirm</p>
                            </div>
                            <button onClick={() => setImportPreview(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
                        </div>
                        <div className="flex-1 overflow-auto px-4 py-3">
                            <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 bg-blue-50">
                                    <tr>{['#', 'Faculty Name', 'Faculty ID', 'Subject Code', 'Subject Name', 'Sem', 'Branch', 'Sec', 'Type', 'Th', 'Pr', 'Room'].map(h => (
                                        <th key={h} className="px-2 py-2 text-left font-semibold text-blue-800 border border-blue-200 whitespace-nowrap">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody>
                                    {importPreview.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-2 py-1.5 text-gray-400 border border-gray-200">{i + 1}</td>
                                            <td className="px-2 py-1.5 font-medium border border-gray-200">{row.facultyName || <span className="text-red-400">MISSING</span>}</td>
                                            <td className="px-2 py-1.5 text-gray-500 border border-gray-200 font-mono">{row.facultyId}</td>
                                            <td className="px-2 py-1.5 font-mono border border-gray-200">{row.subjectCode || <span className="text-red-400">MISSING</span>}</td>
                                            <td className="px-2 py-1.5 border border-gray-200">{row.subjectName}</td>
                                            <td className="px-2 py-1.5 text-center border border-gray-200">{row.semester}</td>
                                            <td className="px-2 py-1.5 text-center border border-gray-200">{row.branch}</td>
                                            <td className="px-2 py-1.5 text-center border border-gray-200">{row.section}</td>
                                            <td className="px-2 py-1.5 border border-gray-200">
                                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.subjectType === 'Theory' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{row.subjectType}</span>
                                            </td>
                                            <td className="px-2 py-1.5 text-center border border-gray-200 font-semibold text-indigo-700">{row.loadTheory}</td>
                                            <td className="px-2 py-1.5 text-center border border-gray-200 font-semibold text-emerald-700">{row.loadPractical}</td>
                                            <td className="px-2 py-1.5 border border-gray-200">{row.preferredRoom || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                            <button onClick={() => setImportPreview(null)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition">Cancel</button>
                            <button onClick={confirmImport} disabled={importing}
                                className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2">
                                {importing ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Importing…</> : <><Upload className="h-4 w-4" /> Import {importPreview.length} Mappings</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-start space-x-4 mb-4">
                    <div className="bg-blue-100 p-3 rounded-xl shadow-sm">
                        <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Teacher Mapping</h2>
                        <p className="text-gray-500 mt-1 text-sm">Assign subjects to faculty, manage workloads, and set scheduling preferences.</p>
                    </div>
                </div>

                {/* Error / result banners */}
                {importError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 flex-1">{importError}</p>
                        <button onClick={() => setImportError('')}><X className="h-4 w-4 text-red-400 hover:text-red-600" /></button>
                    </div>
                )}
                {importResult && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-green-700 flex-1">Imported <strong>{importResult.ok}</strong> mapping{importResult.ok !== 1 ? 's' : ''} successfully.</p>
                        <button onClick={() => setImportResult(null)}><X className="h-4 w-4 text-green-400 hover:text-green-600" /></button>
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition shadow-sm">
                            <Upload className="h-4 w-4" /> Import CSV
                        </button>
                        <button onClick={handlePasteImport}
                            className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition shadow-sm">
                            <Copy className="h-4 w-4" /> Paste from Excel
                        </button>
                        <button onClick={downloadTemplate}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition shadow-sm">
                            <FileText className="h-4 w-4" /> Template
                        </button>
                        <button onClick={handleExport} disabled={mappings.length === 0}
                            className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition shadow-sm disabled:opacity-40">
                            <Download className="h-4 w-4" /> Export
                        </button>
                        <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm w-56 focus-within:ring-2 focus-within:ring-blue-100">
                            <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                            <input type="text" placeholder="Search…" value={searchTerm} onChange={handleSearch}
                                className="text-sm focus:outline-none w-full bg-transparent" />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={handleUndo} disabled={undoStack.length === 0}
                            className={`p-2 rounded-lg border transition shadow-sm ${undoStack.length === 0 ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} title="Undo">
                            <RotateCcw className="h-4 w-4" />
                        </button>
                        <button onClick={handleRedo} disabled={redoStack.length === 0}
                            className={`p-2 rounded-lg border transition shadow-sm ${redoStack.length === 0 ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} title="Redo">
                            <RotateCw className="h-4 w-4" />
                        </button>
                        <button onClick={() => openDrawer()}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1.5 text-sm font-medium transition shadow-sm">
                            <Plus className="h-4 w-4" /> Add Mapping
                        </button>
                        {mappings.length > 0 && (
                            <button onClick={deleteAll}
                                className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg flex items-center gap-1.5 text-sm font-medium transition shadow-sm">
                                <Trash2 className="h-4 w-4" /> Delete All ({mappings.length})
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 px-1">
                    CSV: <code className="bg-gray-100 px-1 rounded">#, Faculty Name, Faculty ID, Subject Code, Subject Name, Sem, Branch, Sec, Type, Load Theory, Load Practical, Pref. Room</code>
                </p>
            </div>

            {/* Sticky Data Table */}
            <div className="flex-1 overflow-hidden p-6 bg-gray-50">
                <div className="max-h-[650px] overflow-auto relative border border-gray-200 rounded-xl shadow-sm bg-white scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                        <thead className="sticky top-0 z-40 bg-gray-100 border-b border-gray-200 text-gray-700 font-semibold shadow-sm">
                            <tr>
                                {/* Sticky Left Columns */}
                                <th className="sticky left-0 z-50 bg-gray-100 px-4 py-3 border-r border-b border-gray-200 w-12 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">#</th>
                                <th className="sticky left-12 z-50 bg-gray-100 px-4 py-3 border-r border-b border-gray-200 min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Faculty Name</th>

                                {/* Normal Columns */}
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium">Faculty ID</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium">Subject Code</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium min-w-[180px]">Subject Name</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium text-center">Sem</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium text-center">Branch</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium text-center">Sec</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium text-center">Type</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium text-center">Load Theory</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium text-center">Load Practical</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 font-medium">Pref. Room</th>

                                {/* Sticky Right Column */}
                                <th className="sticky right-0 z-50 bg-gray-100 px-4 py-3 border-l border-b border-gray-200 text-center shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-gray-600">
                            {filteredMappings.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="px-4 py-8 text-center text-gray-500">
                                        No mappings found. Click "Add Mapping" to create one.
                                    </td>
                                </tr>
                            ) : filteredMappings.map((mapping, index) => (
                                <tr key={mapping.id} className="hover:bg-blue-50/50 transition-colors group">
                                    {/* Sticky Left */}
                                    <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50/90 px-4 py-2 border-r border-gray-200 text-center text-gray-400 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        {index + 1}
                                    </td>
                                    <td className="sticky left-12 z-20 bg-white group-hover:bg-blue-50/90 px-4 py-2 border-r border-gray-200 font-medium text-gray-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        {mapping.facultyName}
                                    </td>

                                    {/* Normal Data */}
                                    <td className="px-4 py-2 border-r border-gray-200">{mapping.facultyId}</td>
                                    <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{mapping.subjectCode}</td>
                                    <td className="px-4 py-2 border-r border-gray-200 font-medium text-gray-700">{mapping.subjectName}</td>
                                    <td className="px-4 py-2 border-r border-gray-200 text-center">{mapping.semester}</td>
                                    <td className="px-4 py-2 border-r border-gray-200 text-center">{mapping.branch}</td>
                                    <td className="px-4 py-2 border-r border-gray-200 text-center">{mapping.section}</td>
                                    <td className="px-4 py-2 border-r border-gray-200 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${mapping.subjectType === 'Theory' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {mapping.subjectType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-r border-gray-200 text-center">
                                        <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                                            {mapping.loadTheory ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-r border-gray-200 text-center">
                                        <span className="inline-flex items-center justify-center w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                                            {mapping.loadPractical ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-r border-gray-200">{mapping.preferredRoom || '-'}</td>

                                    {/* Sticky Right Actions */}
                                    <td className="sticky right-0 z-20 bg-white group-hover:bg-blue-50/90 px-4 py-2 border-l border-gray-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => openDrawer(mapping)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => duplicateMapping(mapping._id || mapping.id)} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors" title="Duplicate">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => deleteMapping(mapping._id || mapping.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <div>Showing {filteredMappings.length} mappings</div>
                    <div className="flex space-x-1">
                        {/* Pagination mock */}
                        <button className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 border rounded bg-blue-50 text-blue-600 font-medium">1</button>
                        <button className="px-3 py-1 border rounded hover:bg-gray-50">2</button>
                        <button className="px-3 py-1 border rounded hover:bg-gray-50">Next</button>
                    </div>
                </div>
            </div>

            {/* Slide-out Drawer for Add/Edit Mapping */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={closeDrawer}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 border-l border-gray-200">
                        {/* Drawer Header */}
                        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingMappingId ? 'Edit Teacher Mapping' : 'Add New Mapping'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Configure faculty-subject assignment rules.</p>
                            </div>
                            <button
                                onClick={closeDrawer}
                                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Error Banner */}
                        {formErrors.general && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start space-x-2 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{formErrors.general}</span>
                            </div>
                        )}

                        {/* Drawer Body - Scrollable Form */}
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8 bg-gray-50/50">

                            {/* Section 1: Core Selection */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-2">1. Core Assignment</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Faculty <span className="text-red-500">*</span></label>
                                        <select
                                            className={`w-full border rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 ${formErrors.facultyId ? 'border-red-300' : 'border-gray-300'}`}
                                            value={formData.facultyId}
                                            onChange={(e) => handleFormChange('facultyId', e.target.value)}
                                        >
                                            <option value="">Select Faculty...</option>
                                            {facultyOptions.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
                                        </select>
                                        {formErrors.facultyId && <p className="text-xs text-red-500 mt-1">{formErrors.facultyId}</p>}
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                                        <select
                                            className={`w-full border rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 ${formErrors.subjectCode ? 'border-red-300' : 'border-gray-300'}`}
                                            value={formData.subjectCode}
                                            onChange={(e) => handleFormChange('subjectCode', e.target.value)}
                                        >
                                            <option value="">Select Subject...</option>
                                            {subjectOptions.length === 0 ? (
                                                <option value="" disabled>No subjects — add them in Subject Management</option>
                                            ) : (
                                                subjectOptions.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)
                                            )}
                                        </select>
                                        {formErrors.subjectCode && <p className="text-xs text-red-500 mt-1">{formErrors.subjectCode}</p>}
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Type</label>
                                        <select
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                            value={formData.subjectType}
                                            onChange={(e) => {
                                                const type = e.target.value
                                                setFormData(prev => ({
                                                    ...prev,
                                                    subjectType: type,
                                                    // Theory → clear batch & practical load
                                                    batch: type === 'Theory' ? 'NA' : (prev.batch === 'NA' ? 'B1' : prev.batch),
                                                    loadTheory: type === 'Practical' ? 0 : prev.loadTheory,
                                                    loadPractical: type === 'Theory' ? 0 : prev.loadPractical,
                                                }))
                                                if (formErrors.subjectType) setFormErrors(p => ({ ...p, subjectType: null }))
                                            }}
                                        >
                                            <option value="Theory">Theory</option>
                                            <option value="Practical">Practical</option>
                                            <option value="Tutorial">Tutorial</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Academic Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-2">2. Academic Grouping</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:border-blue-500" value={formData.semester} onChange={e => handleFormChange('semester', e.target.value)}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:border-blue-500" value={formData.branch} onChange={e => handleFormChange('branch', e.target.value)}>
                                            {['CSE', 'IT', 'ECE', 'ME', 'CE'].map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:border-blue-500" value={formData.section} onChange={e => handleFormChange('section', e.target.value)}>
                                            {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Batch — only shown for Practical / Tutorial */}
                                    {(formData.subjectType === 'Practical' || formData.subjectType === 'Tutorial') ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                                            <div className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-500 select-none">
                                                Auto-assigned by scheduler for practical sessions
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Batch</label>
                                            <div className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-400 select-none">
                                                N/A — Theory class
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Load Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-2">3. Load Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Load Theory
                                            <span className="ml-1 text-xs text-indigo-500 font-normal">(classes/week)</span>
                                        </label>
                                        <input
                                            type="number" min="0"
                                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-blue-500 ${formErrors.loadTheory ? 'border-red-300' : 'border-gray-300'}`}
                                            value={formData.loadTheory}
                                            onChange={e => handleFormChange('loadTheory', parseInt(e.target.value) || 0)}
                                        />
                                        {formErrors.loadTheory && <p className="text-xs text-red-500 mt-1">{formErrors.loadTheory}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Load Practical
                                            <span className="ml-1 text-xs text-emerald-500 font-normal">(sessions/week)</span>
                                        </label>
                                        <input
                                            type="number" min="0"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-blue-500"
                                            value={formData.loadPractical}
                                            onChange={e => handleFormChange('loadPractical', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Additional Info */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-2">4. Additional Info</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Room</label>
                                        <input type="text" placeholder="e.g. C-101" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-blue-500" value={formData.preferredRoom} onChange={e => handleFormChange('preferredRoom', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            {/* Bottom spacing to ensure scrolling doesn't hide content behind buttons */}
                            <div className="pb-10"></div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button
                                onClick={closeDrawer}
                                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveMapping}
                                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center space-x-2 text-sm"
                            >
                                <Save className="w-4 h-4" />
                                <span>Save Mapping</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step4TeacherMapping;