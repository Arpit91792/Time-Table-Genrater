import { Calendar, Clock, Construction } from 'lucide-react'

const ComingSoon = ({ title = "Coming Soon" }) => {
      return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                  <div className="text-center max-w-md mx-auto">
                        <div className="mb-8">
                              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-6">
                                    <Construction className="h-12 w-12 text-blue-600" />
                              </div>
                              <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
                              <p className="text-gray-600 mb-8">
                                    This feature is currently under development. It will be available soon with all the functionality you need.
                              </p>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-8">
                              <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                                    <Clock className="h-5 w-5 mr-2" />
                                    Planned Features
                              </h3>
                              <ul className="space-y-3 text-left">
                                    {title === "Create Timetable" && (
                                          <>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Multi-step wizard interface
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Excel-like editable tables
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Intelligent scheduling algorithm
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Conflict-free timetable generation
                                                </li>
                                          </>
                                    )}
                                    {title === "View Timetables" && (
                                          <>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Section-wise timetable view
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Faculty-wise timetable view
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Classroom-wise usage view
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Lab-wise practical schedule
                                                </li>
                                          </>
                                    )}
                                    {title === "Manage Subjects" && (
                                          <>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Excel-like spreadsheet interface
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Copy-paste from Excel
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Import/Export Excel files
                                                </li>
                                                <li className="flex items-center text-blue-700">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                                      Search, filter, and sort
                                                </li>
                                          </>
                                    )}
                                    <li className="flex items-center text-blue-700">
                                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                          Export to PDF, Excel, CSV
                                    </li>
                                    <li className="flex items-center text-blue-700">
                                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                          Print and download options
                                    </li>
                              </ul>
                        </div>

                        <div className="flex items-center justify-center space-x-4">
                              <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    <span>Expected: Q2 2024</span>
                              </div>
                        </div>
                  </div>
            </div>
      )
}

export default ComingSoon