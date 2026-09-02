import { useState, useEffect } from 'react'
import { Info, Clock, Calendar, Building, Save, CheckCircle } from 'lucide-react'
import { EmptyCollegeTiming } from '../../common/EmptyState'
import FixedActivitySlots from './FixedActivitySlots'

const Step1CollegeTiming = ({ data, onChange, onSave, isSaving, savedData }) => {
      const [isModified, setIsModified] = useState(false)
      const [saveStatus, setSaveStatus] = useState(null)

      // Initialize with default values if no data exists
      const defaultData = {
            collegeName: '',
            semesterType: 'all',
            session: 'Regular',
            workingDays: {
                  monday: true, tuesday: true, wednesday: true,
                  thursday: true, friday: true, saturday: false, sunday: false
            },
            startTime: '08:00',
            endTime: '16:00',
            lectureDuration: 50,
            practicalDuration: 100,
            lunchBreak: {
                  enabled: true,
                  startTime: '13:00',
                  endTime: '13:30'
            },
            teaBreak: { enabled: false, startTime: '', endTime: '' },
            shortBreak: { enabled: false, startTime: '', endTime: '' },
            assembly: { enabled: false, startTime: '', endTime: '' },
            prayer: { enabled: false, startTime: '', endTime: '' }
      }

      const currentData = data || defaultData

      useEffect(() => {
            // Check if data has been modified
            if (savedData) {
                  const isSame = JSON.stringify(currentData) === JSON.stringify(savedData)
                  setIsModified(!isSame)
            } else {
                  setIsModified(JSON.stringify(currentData) !== JSON.stringify(defaultData))
            }
      }, [currentData, savedData, defaultData])

      const handleChange = (field, value) => {
            const newData = { ...currentData, [field]: value }
            onChange(newData)
      }

      const handleWorkingDayChange = (day) => {
            const newWorkingDays = {
                  ...currentData.workingDays,
                  [day]: !currentData.workingDays[day]
            }
            handleChange('workingDays', newWorkingDays)
      }

      const handleBreakToggle = (breakType) => {
            const newBreak = { ...currentData[breakType], enabled: !currentData[breakType].enabled }
            handleChange(breakType, newBreak)
      }

      const handleBreakTimeChange = (breakType, field, value) => {
            const newBreak = { ...currentData[breakType], [field]: value }
            handleChange(breakType, newBreak)
      }

      const handleLunchBreakChange = (field, value) => {
            const newLunchBreak = { ...currentData.lunchBreak, [field]: value }
            handleChange('lunchBreak', newLunchBreak)
      }

      const handleSave = async () => {
            if (!onSave) return

            try {
                  setSaveStatus('saving')
                  const result = await onSave(currentData)
                  if (result.success) {
                        setSaveStatus('success')
                        setTimeout(() => setSaveStatus(null), 3000)
                  } else {
                        setSaveStatus('error')
                  }
            } catch (error) {
                  setSaveStatus('error')
            }
      }

      const lectureDurations = [
            { value: 40, label: '40 Minutes' },
            { value: 45, label: '45 Minutes' },
            { value: 50, label: '50 Minutes (Default)' },
            { value: 55, label: '55 Minutes' },
            { value: 60, label: '60 Minutes' }
      ]

      const practicalDurations = [
            { value: 80, label: '80 Minutes' },
            { value: 90, label: '90 Minutes' },
            { value: 100, label: '100 Minutes (Default)' },
            { value: 110, label: '110 Minutes' },
            { value: 120, label: '120 Minutes' }
      ]

      const breakOptions = [
            { id: 'teaBreak', label: 'Tea Break', description: '15-20 minute break' },
            { id: 'shortBreak', label: 'Short Break', description: '5-10 minute break' },
            { id: 'assembly', label: 'Assembly', description: 'Morning assembly' },
            { id: 'prayer', label: 'Prayer', description: 'Prayer time' }
      ]

      // If no data exists and we have an empty state handler
      if (!data && !savedData) {
            return (
                  <EmptyCollegeTiming
                        onConfigure={() => onChange(defaultData)}
                  />
            )
      }

      return (
            <div className="max-w-6xl mx-auto">
                  {/* Header */}
                  <div className="mb-8">
                        <div className="flex items-start space-x-4 mb-6">
                              <div className="bg-blue-100 p-3 rounded-lg">
                                    <Building className="h-8 w-8 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                          <div>
                                                <h2 className="text-2xl font-bold text-gray-900">College Timing & Academic Details</h2>
                                                <p className="text-gray-600 mt-2">Configure your institution before generating the timetable</p>
                                          </div>

                                          {isModified && onSave && (
                                                <button
                                                      onClick={handleSave}
                                                      disabled={isSaving || saveStatus === 'saving'}
                                                      className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                                                >
                                                      {saveStatus === 'saving' ? (
                                                            <>
                                                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                  <span>Saving...</span>
                                                            </>
                                                      ) : (
                                                            <>
                                                                  <Save className="h-4 w-4" />
                                                                  <span>Save Changes</span>
                                                            </>
                                                      )}
                                                </button>
                                          )}

                                          {saveStatus === 'success' && (
                                                <div className="flex items-center space-x-2 text-green-600">
                                                      <CheckCircle className="h-5 w-5" />
                                                      <span className="font-medium">Saved Successfully!</span>
                                                </div>
                                          )}
                                    </div>
                              </div>
                        </div>

                        {saveStatus === 'error' && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                                    <div className="flex items-start space-x-3">
                                          <Info className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                          <div>
                                                <h3 className="font-medium text-red-800 mb-1">Save Failed</h3>
                                                <p className="text-sm text-red-700">Failed to save college timing. Please try again.</p>
                                          </div>
                                    </div>
                              </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
                              <div className="flex items-start space-x-3">
                                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                          <h3 className="font-medium text-blue-800 mb-1">Important Notes</h3>
                                          <ul className="text-sm text-blue-700 space-y-1">
                                                <li>• College timing settings will affect all timetable generation</li>
                                                <li>• Lecture duration determines the length of each theory class</li>
                                                <li>• Practical duration determines the length of each lab session (usually 2× lecture duration)</li>
                                                <li>• Lunch break time slots will remain empty in the timetable</li>
                                                <li>• Changes are saved automatically to the database</li>
                                          </ul>
                                    </div>
                              </div>
                        </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Section 1: College Details */}
                        <div className="space-y-6">
                              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">College Details</h3>

                                    <div className="space-y-4">
                                          <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">College Name *</label>
                                                <input
                                                      type="text"
                                                      value={currentData.collegeName || ''}
                                                      onChange={(e) => handleChange('collegeName', e.target.value)}
                                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      placeholder="Enter college name"
                                                />
                                          </div>

                                          <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">Semester *</label>
                                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                                      <p className="font-semibold text-emerald-900">All Semesters will be generated automatically</p>
                                                      <p className="text-sm text-emerald-700 mt-1">No semester or section selection is required. The scheduler will analyze all imported data and create every timetable in one click.</p>
                                                </div>
                                          </div>
                                    </div>
                              </div>

                              {/* Working Days */}
                              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Working Days</h3>
                                    <p className="text-sm text-gray-600 mb-4">Select the days when classes will be held</p>

                                    <div className="grid grid-cols-4 gap-3">
                                          {Object.entries(currentData.workingDays || defaultData.workingDays).map(([day, isSelected]) => (
                                                <button
                                                      key={day}
                                                      type="button"
                                                      onClick={() => handleWorkingDayChange(day)}
                                                      className={`
                    py-3 px-4 rounded-lg border transition-all duration-200 flex flex-col items-center
                    ${isSelected
                                                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                            }
                  `}
                                                >
                                                      <span className="font-medium capitalize">{day.slice(0, 3)}</span>
                                                      <span className="text-xs mt-1 capitalize">{day}</span>
                                                      <div className={`w-5 h-5 mt-2 rounded-full border flex items-center justify-center
                    ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}
                  `}>
                                                            {isSelected && (
                                                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                  </svg>
                                                            )}
                                                      </div>
                                                </button>
                                          ))}
                                    </div>
                              </div>
                        </div>

                        {/* Section 2: Timing & Breaks */}
                        <div className="space-y-6">
                              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <div className="flex items-center space-x-3 mb-6">
                                          <div className="bg-orange-100 p-2 rounded-lg">
                                                <Clock className="h-5 w-5 text-orange-600" />
                                          </div>
                                          <h3 className="text-lg font-semibold text-gray-900">Working Hours</h3>
                                    </div>

                                    <div className="space-y-6">
                                          <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-2">College Start Time *</label>
                                                      <input
                                                            type="time"
                                                            value={currentData.startTime || '08:00'}
                                                            onChange={(e) => handleChange('startTime', e.target.value)}
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      />
                                                </div>
                                                <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-2">College End Time *</label>
                                                      <input
                                                            type="time"
                                                            value={currentData.endTime || '16:00'}
                                                            onChange={(e) => handleChange('endTime', e.target.value)}
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      />
                                                </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-2">Lecture Duration *</label>
                                                      <select
                                                            value={currentData.lectureDuration || 50}
                                                            onChange={(e) => handleChange('lectureDuration', parseInt(e.target.value))}
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      >
                                                            {lectureDurations.map((d) => (
                                                                  <option key={d.value} value={d.value}>{d.label}</option>
                                                            ))}
                                                      </select>
                                                </div>
                                                <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-2">Practical Duration *</label>
                                                      <select
                                                            value={currentData.practicalDuration || 100}
                                                            onChange={(e) => handleChange('practicalDuration', parseInt(e.target.value))}
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      >
                                                            {practicalDurations.map((d) => (
                                                                  <option key={d.value} value={d.value}>{d.label}</option>
                                                            ))}
                                                      </select>
                                                </div>
                                          </div>

                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                      <div>
                                                            <h4 className="font-medium text-blue-800">Lunch Break</h4>
                                                            <p className="text-sm text-blue-600">Time slot will remain empty in timetable</p>
                                                      </div>
                                                      <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                  type="checkbox"
                                                                  checked={currentData.lunchBreak?.enabled || true}
                                                                  onChange={() => {
                                                                        const newLunchBreak = {
                                                                              ...currentData.lunchBreak,
                                                                              enabled: !currentData.lunchBreak?.enabled
                                                                        }
                                                                        handleChange('lunchBreak', newLunchBreak)
                                                                  }}
                                                                  className="sr-only peer"
                                                            />
                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                      </label>
                                                </div>

                                                {(currentData.lunchBreak?.enabled || true) && (
                                                      <div className="grid grid-cols-2 gap-4 mt-4">
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-2">Lunch Start</label>
                                                                  <input
                                                                        type="time"
                                                                        value={currentData.lunchBreak?.startTime || '13:00'}
                                                                        onChange={(e) => handleLunchBreakChange('startTime', e.target.value)}
                                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                  />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-2">Lunch End</label>
                                                                  <input
                                                                        type="time"
                                                                        value={currentData.lunchBreak?.endTime || '13:30'}
                                                                        onChange={(e) => handleLunchBreakChange('endTime', e.target.value)}
                                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                  />
                                                            </div>
                                                      </div>
                                                )}
                                          </div>
                                    </div>
                              </div>

                              {/* Optional Breaks */}
                              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Optional Breaks</h3>
                                    <p className="text-sm text-gray-600 mb-4">Select additional break periods</p>

                                    <div className="grid grid-cols-2 gap-4">
                                          {breakOptions.map((breakOption) => {
                                                const breakData = currentData[breakOption.id] || { enabled: false, startTime: '', endTime: '' }
                                                return (
                                                      <div
                                                            key={breakOption.id}
                                                            className={`flex flex-col items-start p-4 border rounded-lg transition-all duration-200
                      ${breakData.enabled
                                                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                                        : 'bg-gray-50 border-gray-200 text-gray-600'
                                                                  }
                    `}
                                                      >
                                                            <div className="flex items-center justify-between w-full mb-2">
                                                                  <span className="font-medium">{breakOption.label}</span>
                                                                  <label className="relative inline-flex items-center cursor-pointer">
                                                                        <input
                                                                              type="checkbox"
                                                                              checked={breakData.enabled}
                                                                              onChange={() => handleBreakToggle(breakOption.id)}
                                                                              className="sr-only peer"
                                                                        />
                                                                        <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                                                                  </label>
                                                            </div>
                                                            <p className="text-sm text-gray-500 text-left mb-3">{breakOption.description}</p>

                                                            {breakData.enabled && (
                                                                  <div className="grid grid-cols-2 gap-2 w-full">
                                                                        <div>
                                                                              <label className="block text-xs font-medium text-gray-700 mb-1">Start</label>
                                                                              <input
                                                                                    type="time"
                                                                                    value={breakData.startTime || ''}
                                                                                    onChange={(e) => handleBreakTimeChange(breakOption.id, 'startTime', e.target.value)}
                                                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                                              />
                                                                        </div>
                                                                        <div>
                                                                              <label className="block text-xs font-medium text-gray-700 mb-1">End</label>
                                                                              <input
                                                                                    type="time"
                                                                                    value={breakData.endTime || ''}
                                                                                    onChange={(e) => handleBreakTimeChange(breakOption.id, 'endTime', e.target.value)}
                                                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                                              />
                                                                        </div>
                                                                  </div>
                                                            )}
                                                      </div>
                                                )
                                          })}
                                    </div>
                              </div>
                        </div>
                  </div>

                  {/* Fixed Activity Slots */}
                  <div className="mt-8">
                        <FixedActivitySlots onSlotsChange={(slots) => {
                              if (onChange) onChange({ ...currentData, fixedSlots: slots })
                        }} />
                  </div>

                  {/* Summary Card */}
                  <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                        <h3 className="font-semibold text-blue-800 mb-4">Configuration Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-white p-4 rounded-lg border border-blue-100">
                                    <p className="text-sm text-gray-600">Semester</p>
                                    <p className="font-semibold text-gray-900 capitalize">
                                          {(currentData.semesterType || 'odd') === 'odd' ? '🔵 Odd (1,3,5,7)' : '🟣 Even (2,4,6,8)'}
                                    </p>
                              </div>
                              <div className="bg-white p-4 rounded-lg border border-blue-100">
                                    <p className="text-sm text-gray-600">Working Days</p>
                                    <p className="font-medium text-gray-900">
                                          {Object.values(currentData.workingDays || defaultData.workingDays).filter(Boolean).length} days
                                    </p>
                              </div>
                              <div className="bg-white p-4 rounded-lg border border-blue-100">
                                    <p className="text-sm text-gray-600">Lecture Duration</p>
                                    <p className="font-medium text-gray-900">{currentData.lectureDuration || 50} min</p>
                              </div>
                              <div className="bg-white p-4 rounded-lg border border-blue-100">
                                    <p className="text-sm text-gray-600">Lunch Break</p>
                                    <p className="font-medium text-gray-900">
                                          {(currentData.lunchBreak?.enabled || true) ?
                                                `${currentData.lunchBreak?.startTime || '13:00'} – ${currentData.lunchBreak?.endTime || '13:30'}` :
                                                'Disabled'
                                          }
                                    </p>
                              </div>
                        </div>


                        {/* Auto-save status */}
                        <div className="mt-4 pt-4 border-t border-blue-200">
                              <div className="text-sm text-gray-600 flex items-center space-x-2">
                                    {isModified ? (
                                          <>
                                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                                <span>Unsaved changes</span>
                                          </>
                                    ) : (
                                          <>
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span>All changes saved to database</span>
                                          </>
                                    )}
                              </div>
                        </div>
                  </div>
            </div>
      )
}

export default Step1CollegeTiming