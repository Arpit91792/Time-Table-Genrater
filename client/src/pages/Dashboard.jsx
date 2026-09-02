import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Plus, Calendar, FileText, Download, Upload, Users, BookOpen, Settings, Clock, Database, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import Wizard from '../components/wizard/Wizard'
import TimetableViewer from '../components/TimetableViewer'
import { useTimetable } from '../context/TimetableContext'

const Dashboard = () => {
      const navigate = useNavigate()
      const [showCreateModal, setShowCreateModal] = useState(false)
      const [showWizard, setShowWizard] = useState(false)
      const [viewingTimetable, setViewingTimetable] = useState(null)

      const {
            isLoading,
            apiStatus,
            collegeTiming,
            subjects,
            faculty,
            teacherMappings,
            generatedTimetables,
            getStatistics,
            startNewWizard,
            updateTimetable,
      } = useTimetable()

      const statistics = getStatistics()

      const handleStartWizard = () => {
            startNewWizard()
            setShowCreateModal(false)
            setShowWizard(true)
      }

      const features = [
            {
                  title: 'Create New Timetable',
                  description: 'Start the multi-step wizard to generate a new timetable',
                  icon: Plus,
                  color: 'bg-blue-500',
                  onClick: () => setShowCreateModal(true)
            },
            {
                  title: 'View Generated Timetables',
                  description: 'Browse and manage all generated timetables',
                  icon: Calendar,
                  color: 'bg-green-500',
                  count: statistics.totalTimetables,
                  href: '/timetables'
            },
            {
                  title: 'Import Excel Data',
                  description: 'Import subjects, faculty, and mappings from Excel',
                  icon: Upload,
                  color: 'bg-purple-500',
                  href: '/import'
            },
            {
                  title: 'Export Timetable',
                  description: 'Export timetables to PDF, Excel, or CSV',
                  icon: Download,
                  color: 'bg-orange-500',
                  href: '/export'
            },
            {
                  title: 'Manage Subjects',
                  description: 'Add, edit, and manage subject details',
                  icon: BookOpen,
                  color: 'bg-indigo-500',
                  count: statistics.totalSubjects,
                  href: '/subjects'
            },
            {
                  title: 'Manage Faculty',
                  description: 'Manage faculty information and availability',
                  icon: Users,
                  color: 'bg-pink-500',
                  count: statistics.totalFaculty,
                  href: '/faculty'
            },
            {
                  title: 'Manage Teacher Mapping',
                  description: 'Map faculty to subjects and set teaching loads',
                  icon: Settings,
                  color: 'bg-teal-500',
                  count: statistics.totalMappings,
                  href: '/mapping'
            }
      ]

      return (
            <>
                  <Helmet>
                        <title>Dashboard - Timetable Generator</title>
                  </Helmet>

                  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-6">
                        {/* Header */}
                        <div className="mb-8">
                              <div className="flex items-center justify-between">
                                    <div>
                                          <h1 className="text-3xl font-bold text-gray-900">Smart College Timetable Generator</h1>
                                          <p className="text-gray-600 mt-2">Professional ERP system for automated timetable generation</p>
                                    </div>

                                    {/* API Status */}
                                    <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${apiStatus.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {apiStatus.connected ? (
                                                <>
                                                      <Database className="h-4 w-4" />
                                                      <span className="text-sm font-medium">Database Connected</span>
                                                </>
                                          ) : (
                                                <>
                                                      <AlertCircle className="h-4 w-4" />
                                                      <span className="text-sm font-medium">Database Offline</span>
                                                </>
                                          )}
                                    </div>
                              </div>
                        </div>

                        {/* Live statistics from global store */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto mb-10">
                              {[
                                    { label: 'Subjects', value: statistics.totalSubjects, color: 'text-indigo-600' },
                                    { label: 'Faculty', value: statistics.totalFaculty, color: 'text-pink-600' },
                                    { label: 'Mappings', value: statistics.totalMappings, color: 'text-teal-600' },
                                    { label: 'Timetables', value: statistics.totalTimetables, color: 'text-green-600' }
                              ].map((stat) => (
                                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
                                          <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                                          <p className={`text-3xl font-bold mt-1 ${stat.color}`}>
                                                {isLoading ? '…' : stat.value}
                                          </p>
                                    </div>
                              ))}
                        </div>

                        {/* Main Create Button */}
                        <div className="max-w-4xl mx-auto mb-12">
                              <div
                                    onClick={() => setShowCreateModal(true)}
                                    className="relative group cursor-pointer"
                              >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                                    <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow duration-300">
                                          <div className="flex flex-col items-center text-center">
                                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-6">
                                                      <Plus className="h-12 w-12 text-white" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-gray-900 mb-3">Create New Timetable</h2>
                                                <p className="text-gray-600 mb-6 max-w-md">
                                                      Start the multi-step wizard to generate a conflict-free timetable with intelligent scheduling
                                                </p>
                                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                      <div className="flex items-center">
                                                            <Clock className="h-4 w-4 mr-1" />
                                                            <span>5 Steps</span>
                                                      </div>
                                                      <div className="flex items-center">
                                                            <Calendar className="h-4 w-4 mr-1" />
                                                            <span>Intelligent Scheduling</span>
                                                      </div>
                                                </div>

                                                {/* Prerequisites Status */}
                                                {!statistics.canGenerateTimetable && (
                                                      <div className="mt-4 pt-4 border-t border-gray-200 w-full">
                                                            <p className="text-sm text-orange-600 mb-2">Prerequisites needed:</p>
                                                            <div className="flex flex-wrap justify-center gap-2">
                                                                  {!collegeTiming && (
                                                                        <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">College Timing</span>
                                                                  )}
                                                                  {subjects.length === 0 && (
                                                                        <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">Subjects</span>
                                                                  )}
                                                                  {faculty.length === 0 && (
                                                                        <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">Faculty</span>
                                                                  )}
                                                                  {teacherMappings.length === 0 && (
                                                                        <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">Mappings</span>
                                                                  )}
                                                            </div>
                                                      </div>
                                                )}
                                          </div>
                                    </div>
                              </div>
                        </div>

                        {/* Other Features Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                              {features.slice(1).map((feature, index) => {
                                    const Icon = feature.icon
                                    return (
                                          <div
                                                key={index}
                                                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all duration-300 cursor-pointer relative"
                                                onClick={() => {
                                                      if (feature.onClick) feature.onClick()
                                                      else if (feature.href) navigate(feature.href)
                                                }}
                                          >
                                                <div className="flex items-start space-x-4">
                                                      <div className={`${feature.color} p-3 rounded-lg`}>
                                                            <Icon className="h-6 w-6 text-white" />
                                                      </div>
                                                      <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                                                  {feature.count !== undefined && (
                                                                        <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                                                              {feature.count}
                                                                        </span>
                                                                  )}
                                                            </div>
                                                            <p className="text-sm text-gray-600">{feature.description}</p>
                                                      </div>
                                                </div>


                                          </div>
                                    )
                              })}
                        </div>

                        {/* Create Timetable Modal */}
                        {showCreateModal && (
                              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col mx-auto">
                                          <div className="p-8 overflow-y-auto flex-1">
                                                <div className="flex justify-between items-center mb-8">
                                                      <div>
                                                            <h2 className="text-2xl font-bold text-gray-900">Create New Timetable</h2>
                                                            <p className="text-gray-600">Follow these steps to generate a conflict-free timetable</p>
                                                      </div>
                                                      <button
                                                            onClick={() => setShowCreateModal(false)}
                                                            className="text-gray-400 hover:text-gray-600"
                                                      >
                                                            ×
                                                      </button>
                                                </div>

                                                {/* Steps */}
                                                <div className="space-y-8">
                                                      {/* Step 1 */}
                                                      <div className="border border-gray-200 rounded-xl p-6">
                                                            <div className="flex items-center space-x-4 mb-4">
                                                                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
                                                                  <h3 className="text-xl font-semibold text-gray-900">College Timing</h3>
                                                            </div>
                                                            <p className="text-gray-600 mb-6">Set up college working hours, lecture durations, and breaks</p>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                  <div className="bg-blue-50 p-4 rounded-lg">
                                                                        <h4 className="font-medium text-blue-800 mb-2">College Details</h4>
                                                                        <ul className="text-sm text-blue-700 space-y-1">
                                                                              <li>• College Name & Academic Year</li>
                                                                              <li>• Working Days Selection</li>
                                                                              <li>• Start & End Dates</li>
                                                                        </ul>
                                                                  </div>
                                                                  <div className="bg-green-50 p-4 rounded-lg">
                                                                        <h4 className="font-medium text-green-800 mb-2">Timing Settings</h4>
                                                                        <ul className="text-sm text-green-700 space-y-1">
                                                                              <li>• Lecture Duration (40-60 min)</li>
                                                                              <li>• Practical Duration (80-120 min)</li>
                                                                              <li>• Lunch Break Configuration</li>
                                                                        </ul>
                                                                  </div>
                                                            </div>
                                                      </div>

                                                      {/* Step 2 */}
                                                      <div className="border border-gray-200 rounded-xl p-6">
                                                            <div className="flex items-center space-x-4 mb-4">
                                                                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">2</div>
                                                                  <h3 className="text-xl font-semibold text-gray-900">Subject Details</h3>
                                                            </div>
                                                            <p className="text-gray-600 mb-6">Excel-like spreadsheet for subject management</p>
                                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                                  <h4 className="font-medium text-gray-800 mb-3">Columns Include:</h4>
                                                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                        {['Subject Code', 'Subject Name', 'Semester', 'Branch', 'Section', 'Subject Type', 'Credits', 'Lectures Required', 'Practical Required'].map((col, idx) => (
                                                                              <span key={idx} className="text-sm bg-white px-3 py-1 rounded border border-gray-200">
                                                                                    {col}
                                                                              </span>
                                                                        ))}
                                                                  </div>
                                                            </div>
                                                      </div>

                                                      {/* Step 3 */}
                                                      <div className="border border-gray-200 rounded-xl p-6">
                                                            <div className="flex items-center space-x-4 mb-4">
                                                                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">3</div>
                                                                  <h3 className="text-xl font-semibold text-gray-900">Faculty Details</h3>
                                                            </div>
                                                            <p className="text-gray-600 mb-6">Manage faculty information and availability</p>
                                                            <div className="bg-purple-50 p-4 rounded-lg">
                                                                  <h4 className="font-medium text-purple-800 mb-3">Faculty Information:</h4>
                                                                  <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                              <p className="text-sm text-purple-700 mb-2">• Faculty ID & Name</p>
                                                                              <p className="text-sm text-purple-700 mb-2">• Designation & Department</p>
                                                                              <p className="text-sm text-purple-700">• Email & Phone</p>
                                                                        </div>
                                                                        <div>
                                                                              <p className="text-sm text-purple-700 mb-2">• In/Out Time</p>
                                                                              <p className="text-sm text-purple-700 mb-2">• Maximum Daily/Weekly Load</p>
                                                                              <p className="text-sm text-purple-700">• Available Days</p>
                                                                        </div>
                                                                  </div>
                                                            </div>
                                                      </div>

                                                      {/* Step 4 */}
                                                      <div className="border border-gray-200 rounded-xl p-6">
                                                            <div className="flex items-center space-x-4 mb-4">
                                                                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">4</div>
                                                                  <h3 className="text-xl font-semibold text-gray-900">Teacher Mapping</h3>
                                                            </div>
                                                            <p className="text-gray-600 mb-6">Map faculty to subjects with teaching loads</p>
                                                            <div className="bg-orange-50 p-4 rounded-lg">
                                                                  <h4 className="font-medium text-orange-800 mb-3">Mapping Rules:</h4>
                                                                  <ul className="text-sm text-orange-700 space-y-2">
                                                                        <li>• Faculty dropdown shows only available faculty</li>
                                                                        <li>• Subject selection auto-fills details</li>
                                                                        <li>• Load types: Daily/Weekly</li>
                                                                        <li>• Practical batches: Batch 1, Batch 2, Both</li>
                                                                        <li>• One subject can map to multiple faculty</li>
                                                                  </ul>
                                                            </div>
                                                      </div>

                                                      {/* Step 5 */}
                                                      <div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                                                            <div className="flex items-center space-x-4 mb-4">
                                                                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">5</div>
                                                                  <h3 className="text-xl font-semibold text-gray-900">Generate Timetable</h3>
                                                            </div>
                                                            <p className="text-gray-600 mb-6">Intelligent scheduling with conflict resolution</p>
                                                            <div className="space-y-4">
                                                                  <div className="bg-white p-4 rounded-lg border border-indigo-200">
                                                                        <h4 className="font-medium text-indigo-800 mb-3">Validation Rules:</h4>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                              {['No faculty clash', 'No classroom clash', 'No duplicate lecture', 'Faculty load limits', 'In/Out time respect', 'Lunch break empty', 'Theory=50 min', 'Practical=100 min'].map((rule, idx) => (
                                                                                    <span key={idx} className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded">
                                                                                          ✓ {rule}
                                                                                    </span>
                                                                              ))}
                                                                        </div>
                                                                  </div>
                                                            </div>
                                                      </div>
                                                </div>

                                          </div>

                                          {/* Action Buttons */}
                                          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                                                <div className="flex justify-between items-center">
                                                      <button
                                                            onClick={() => setShowCreateModal(false)}
                                                            className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium"
                                                      >
                                                            Cancel
                                                      </button>
                                                      <button
                                                            onClick={handleStartWizard}
                                                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                                                      >
                                                            Start Wizard
                                                      </button>
                                                </div>
                                          </div>
                                    </div>
                              </div>
                        )}

                        {/* Generated Timetables Section */}
                        {generatedTimetables.length > 0 && (
                              <div className="mt-12 max-w-6xl mx-auto">
                                    <div className="flex items-center justify-between mb-4">
                                          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                                <Calendar className="h-5 w-5 text-blue-600" />
                                                Generated Timetables
                                          </h2>
                                          <span className="text-sm text-gray-500">{generatedTimetables.length} timetable{generatedTimetables.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {generatedTimetables.map((tt, i) => {
                                                const ct = tt.collegeTiming || {}
                                                const semType = ct.semesterType || tt.semType || 'odd'
                                                return (
                                                      <div
                                                            key={tt._id || i}
                                                            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 overflow-hidden"
                                                      >
                                                            <div className={`h-1.5 ${semType === 'odd' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`} />
                                                            <div className="p-5">
                                                                  <div className="flex items-start justify-between mb-3">
                                                                        <div>
                                                                              <h3 className="font-bold text-gray-900 text-sm leading-tight">{ct.collegeName || tt.name || 'Timetable'}</h3>
                                                                              <p className="text-xs text-gray-500 mt-0.5">{ct.academicYear || ''}</p>
                                                                        </div>
                                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${semType === 'odd' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                                              }`}>
                                                                              {semType === 'odd' ? '🔵 Odd Sem' : '🟣 Even Sem'}
                                                                        </span>
                                                                  </div>
                                                                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                                                                        <span>📅 {tt.generatedAt ? new Date(tt.generatedAt).toLocaleDateString('en-IN') : '—'}</span>
                                                                        <span>📋 {tt.slots?.filter(s => s.type !== 'lunch')?.length || 0} slots</span>
                                                                  </div>
                                                                  <div className="flex gap-2">
                                                                        <button
                                                                              onClick={() => setViewingTimetable(tt)}
                                                                              className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                              <Eye className="h-4 w-4" />
                                                                              View
                                                                        </button>
                                                                  </div>
                                                            </div>
                                                      </div>
                                                )
                                          })}
                                    </div>
                              </div>
                        )}

                        {/* Wizard */}
                        {showWizard && <Wizard onClose={() => setShowWizard(false)} />}

                        {/* Timetable Viewer */}
                        {viewingTimetable && (
                              <TimetableViewer
                                    timetable={viewingTimetable}
                                    allSubjects={subjects}
                                    allFaculty={faculty}
                                    onClose={() => setViewingTimetable(null)}
                                    onUpdate={async (updated) => {
                                          setViewingTimetable(updated)
                                          if (updated._id) await updateTimetable(updated._id, updated)
                                    }}
                              />
                        )}
                  </div>
            </>
      )
}

export default Dashboard