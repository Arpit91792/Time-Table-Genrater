import { Helmet } from 'react-helmet-async'
import { BookOpen } from 'lucide-react'
import Step2SubjectDetails from '../components/wizard/steps/Step2SubjectDetails'
import { useTimetable } from '../context/TimetableContext'
import ErrorBoundary from '../components/common/ErrorBoundary'

/**
 * Subject Management page — same global store & MongoDB source as the Wizard.
 */
const Subjects = () => {
      const { subjects, getStatistics } = useTimetable()
      const stats = getStatistics()

      return (
            <>
                  <Helmet>
                        <title>Manage Subjects - Timetable Generator</title>
                  </Helmet>

                  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-6">
                        <div className="max-w-7xl mx-auto">
                              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                                    <div className="flex items-start space-x-4">
                                          <div className="bg-indigo-100 p-3 rounded-lg">
                                                <BookOpen className="h-8 w-8 text-indigo-600" />
                                          </div>
                                          <div>
                                                <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
                                                <p className="text-gray-600 mt-1">
                                                      Single source of truth shared with Wizard, Dashboard, Mapping & Timetable Generator
                                                </p>
                                          </div>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                                          <p className="text-xs uppercase tracking-wide text-gray-500">Total Subjects</p>
                                          <p className="text-2xl font-bold text-indigo-600">{stats.totalSubjects}</p>
                                    </div>
                              </div>

                              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                    <ErrorBoundary>
                                          <Step2SubjectDetails showHeader={false} />
                                    </ErrorBoundary>
                              </div>

                              {subjects.length > 0 && (
                                    <p className="mt-4 text-sm text-gray-500 text-center">
                                          Edits here appear immediately in Faculty Mapping, Wizard Step 2, Dashboard stats, and all subject dropdowns.
                                    </p>
                              )}
                        </div>
                  </div>
            </>
      )
}

export default Subjects
