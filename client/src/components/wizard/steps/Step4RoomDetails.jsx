import { useState, useRef } from 'react'
import { Building, Plus, Trash2, Save, Edit2, Check, X, AlertCircle, Download, Upload, Copy } from 'lucide-react'

const emptyRoom = () => ({
      roomNumber: '',
      building: '',
      floor: 1,
      capacity: 30,
      roomType: 'Lecture',
      equipment: [],
      isAvailable: true
})

const Step4RoomDetails = ({
      selectedRooms = [],
      onSelectRooms,
      isSaving = false
}) => {
      const [rooms, setRooms] = useState(selectedRooms)
      const [editingRoom, setEditingRoom] = useState(null)
      const [editData, setEditData] = useState(emptyRoom())
      const [error, setError] = useState('')
      const [pendingRooms, setPendingRooms] = useState([])
      const fileInputRef = useRef(null)

      const roomTypes = ['Lecture', 'Lab', 'Seminar', 'Conference', 'Computer Lab', 'Practical Lab']
      const floors = [1, 2, 3, 4, 5, 6, 7, 8]
      const capacities = [20, 30, 40, 50, 60, 70, 80, 90, 100]

      // Update parent when rooms change
      const updateRooms = (newRooms) => {
            setRooms(newRooms)
            if (onSelectRooms) {
                  onSelectRooms(newRooms)
            }
      }

      const handleAddRoom = () => {
            const newRoom = { ...emptyRoom(), tempId: `room-${Date.now()}` }
            setPendingRooms(prev => [...prev, newRoom])
      }

      const handleSavePendingRoom = (tempId) => {
            const room = pendingRooms.find(r => r.tempId === tempId)
            if (!room) return

            if (!room.roomNumber.trim()) {
                  setError('Room number is required')
                  return
            }

            const roomWithId = { ...room, _id: `room-${Date.now()}-${room.roomNumber}` }
            delete roomWithId.tempId

            updateRooms([...rooms, roomWithId])
            setPendingRooms(prev => prev.filter(r => r.tempId !== tempId))
            setError('')
      }

      const handleEditRoom = (room) => {
            setEditingRoom(room._id)
            setEditData({ ...room })
      }

      const handleSaveEdit = () => {
            if (!editData.roomNumber.trim()) {
                  setError('Room number is required')
                  return
            }

            const updated = rooms.map(r =>
                  r._id === editingRoom ? { ...editData } : r
            )
            updateRooms(updated)
            setEditingRoom(null)
            setError('')
      }

      const handleCancelEdit = () => {
            setEditingRoom(null)
            setEditData(emptyRoom())
      }

      const handleDeleteRoom = (roomId) => {
            if (!window.confirm('Delete this room permanently?')) return
            updateRooms(rooms.filter(r => r._id !== roomId))
      }

      const handleImportCSV = () => {
            fileInputRef.current?.click()
      }

      const handleFileSelected = async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return

            try {
                  const text = await file.text()
                  const rows = text.split(/\r?\n/).filter(r => r.trim())
                  if (rows.length < 2) {
                        setError('Import file has no data rows')
                        return
                  }

                  const dataRows = rows.slice(1).map(row => {
                        const cols = row.includes('\t') ? row.split('\t') : row.split(',')
                        return {
                              roomNumber: (cols[0] || '').trim(),
                              building: (cols[1] || '').trim(),
                              floor: parseInt(cols[2]) || 1,
                              capacity: parseInt(cols[3]) || 30,
                              roomType: (cols[4] || 'Lecture').trim(),
                              equipment: cols[5] ? cols[5].split(';').map(e => e.trim()) : []
                        }
                  }).filter(r => r.roomNumber)

                  const newRooms = dataRows.map(row => ({
                        ...row,
                        _id: `room-${Date.now()}-${row.roomNumber}`,
                        isAvailable: true
                  }))

                  updateRooms([...rooms, ...newRooms])
                  setError(`Imported ${newRooms.length} rooms`)
            } catch (err) {
                  setError(err.message || 'Failed to import file')
            }
      }

      const handleExportCSV = () => {
            if (rooms.length === 0) {
                  setError('No rooms to export')
                  return
            }

            const csvContent = [
                  ['Room Number', 'Building', 'Floor', 'Capacity', 'Room Type', 'Equipment'],
                  ...rooms.map(room => [
                        room.roomNumber,
                        room.building,
                        room.floor,
                        room.capacity,
                        room.roomType,
                        room.equipment?.join(';') || ''
                  ])
            ].map(row => row.join(',')).join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'rooms_export.csv'
            a.click()
            window.URL.revokeObjectURL(url)
            setError('')
      }

      const renderRoomRow = (room, index) => {
            const isPending = room.tempId
            const isEditing = editingRoom === room._id

            if (isEditing) {
                  return (
                        <tr key={room._id} className="bg-blue-50">
                              <td className="px-4 py-3">
                                    <input
                                          type="text"
                                          value={editData.roomNumber}
                                          onChange={(e) => setEditData({ ...editData, roomNumber: e.target.value })}
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          placeholder="e.g., 101"
                                    />
                              </td>
                              <td className="px-4 py-3">
                                    <input
                                          type="text"
                                          value={editData.building}
                                          onChange={(e) => setEditData({ ...editData, building: e.target.value })}
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          placeholder="e.g., Main Building"
                                    />
                              </td>
                              <td className="px-4 py-3">
                                    <select
                                          value={editData.floor}
                                          onChange={(e) => setEditData({ ...editData, floor: parseInt(e.target.value) })}
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    >
                                          {floors.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                              </td>
                              <td className="px-4 py-3">
                                    <select
                                          value={editData.capacity}
                                          onChange={(e) => setEditData({ ...editData, capacity: parseInt(e.target.value) })}
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    >
                                          {capacities.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                              </td>
                              <td className="px-4 py-3">
                                    <select
                                          value={editData.roomType}
                                          onChange={(e) => setEditData({ ...editData, roomType: e.target.value })}
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    >
                                          {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                              </td>
                              <td className="px-4 py-3">
                                    <div className="flex items-center space-x-2">
                                          <button
                                                onClick={handleSaveEdit}
                                                className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                          >
                                                <Check className="h-3 w-3" />
                                          </button>
                                          <button
                                                onClick={handleCancelEdit}
                                                className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                                          >
                                                <X className="h-3 w-3" />
                                          </button>
                                    </div>
                              </td>
                        </tr>
                  )
            }

            return (
                  <tr key={room._id || room.tempId} className={isPending ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{room.roomNumber}</div>
                              {isPending && <div className="text-xs text-amber-600">Draft</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{room.building || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{room.floor}</td>
                        <td className="px-4 py-3 text-gray-700">{room.capacity}</td>
                        <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${room.roomType === 'Lab' ? 'bg-emerald-100 text-emerald-700' :
                                          room.roomType === 'Practical' ? 'bg-purple-100 text-purple-700' :
                                                'bg-blue-100 text-blue-700'
                                    }`}>
                                    {room.roomType}
                              </span>
                        </td>
                        <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                    {isPending ? (
                                          <button
                                                onClick={() => handleSavePendingRoom(room.tempId)}
                                                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                                                title="Save room"
                                          >
                                                <Save className="h-4 w-4" />
                                          </button>
                                    ) : (
                                          <button
                                                onClick={() => handleEditRoom(room)}
                                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                                title="Edit room"
                                          >
                                                <Edit2 className="h-4 w-4" />
                                          </button>
                                    )}
                                    <button
                                          onClick={() => handleDeleteRoom(room._id || room.tempId)}
                                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                          title="Delete room"
                                    >
                                          <Trash2 className="h-4 w-4" />
                                    </button>
                              </div>
                        </td>
                  </tr>
            )
      }

      const displayRooms = [...rooms, ...pendingRooms]

      return (
            <div className="max-w-6xl mx-auto">
                  {/* Header */}
                  <div className="mb-8">
                        <div className="flex items-start space-x-4 mb-6">
                              <div className="bg-orange-100 p-3 rounded-lg">
                                    <Building className="h-8 w-8 text-orange-600" />
                              </div>
                              <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Room Details</h2>
                                    <p className="text-gray-600 mt-2">Manage available rooms and facilities for timetable scheduling</p>
                              </div>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                              <div className="flex items-start space-x-3">
                                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                          <h3 className="font-medium text-orange-800 mb-1">Important Notes</h3>
                                          <ul className="text-sm text-orange-700 space-y-1">
                                                <li>• Room capacity and type affect timetable generation</li>
                                                <li>• Lab rooms are prioritized for practical subjects</li>
                                                <li>• Rooms with equipment are allocated to specific subjects</li>
                                                <li>• Multiple rooms of the same type help reduce conflicts</li>
                                          </ul>
                                    </div>
                              </div>
                        </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                              <p className="text-sm text-red-700">{error}</p>
                        </div>
                  )}

                  {/* File Input */}
                  <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.txt"
                        className="hidden"
                        onChange={handleFileSelected}
                  />

                  {/* Toolbar */}
                  <div className="bg-white border border-gray-300 rounded-lg p-4 mb-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                    <button
                                          type="button"
                                          onClick={handleImportCSV}
                                          className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center space-x-2 transition-colors"
                                    >
                                          <Upload className="h-4 w-4" />
                                          <span>Import CSV</span>
                                    </button>
                                    <button
                                          type="button"
                                          onClick={handleExportCSV}
                                          className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg flex items-center space-x-2 transition-colors"
                                    >
                                          <Download className="h-4 w-4" />
                                          <span>Export CSV</span>
                                    </button>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                    <button
                                          type="button"
                                          onClick={handleAddRoom}
                                          className="px-4 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg flex items-center space-x-2 transition-colors"
                                          disabled={isSaving}
                                    >
                                          <Plus className="h-4 w-4" />
                                          <span>Add Room</span>
                                    </button>
                              </div>
                        </div>
                  </div>

                  {/* Rooms Table */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                          <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Room Number</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Building</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Floor</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Capacity</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Room Type</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                                          </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                          {displayRooms.length === 0 ? (
                                                <tr>
                                                      <td colSpan="6" className="px-4 py-16 text-center text-gray-400">
                                                            <Building className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                            <p className="text-lg font-medium text-gray-700">No rooms added yet</p>
                                                            <p className="text-sm text-gray-500 mt-2">
                                                                  Click "Add Room" to create your first room, or import from CSV
                                                            </p>
                                                      </td>
                                                </tr>
                                          ) : (
                                                displayRooms.map(renderRoomRow)
                                          )}
                                    </tbody>
                              </table>
                        </div>
                  </div>

                  {/* Summary */}
                  <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                              <div>
                                    <h3 className="font-medium text-gray-900">Summary</h3>
                                    <p className="text-sm text-gray-600">
                                          {rooms.length} room{rooms.length === 1 ? '' : 's'} saved
                                          {pendingRooms.length > 0 && (
                                                <span className="text-amber-700"> · {pendingRooms.length} unsaved draft{pendingRooms.length === 1 ? '' : 's'}</span>
                                          )}
                                    </p>
                              </div>
                              <div className="text-sm text-gray-500">
                                    Rooms are saved automatically
                              </div>
                        </div>
                  </div>
            </div>
      )
}

export default Step4RoomDetails