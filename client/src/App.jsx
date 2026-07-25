import { Routes, Route, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { TimetableProvider } from './context/TimetableContext'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import ComingSoon from './components/common/ComingSoon'
import ErrorBoundary from './components/common/ErrorBoundary'

function App() {
      return (
            <ErrorBoundary>
                  <TimetableProvider>
                        <Helmet>
                              <title>Smart College Timetable Generator</title>
                              <meta name="description" content="Professional college ERP timetable system with intelligent scheduling" />
                        </Helmet>
                        <Routes>
                              {/* All routes are public */}
                              <Route path="/" element={<Layout />}>
                                    <Route index element={<Navigate to="/dashboard" />} />
                                    <Route path="dashboard" element={<Dashboard />} />
                                    <Route path="create" element={<ComingSoon title="Create Timetable" />} />
                                    <Route path="timetables" element={<ComingSoon title="View Timetables" />} />
                                    <Route path="import" element={<ComingSoon title="Import Data" />} />
                                    <Route path="export" element={<ComingSoon title="Export Data" />} />
                                    <Route path="subjects" element={<Subjects />} />
                                    <Route path="faculty" element={<ComingSoon title="Manage Faculty" />} />
                                    <Route path="mapping" element={<ComingSoon title="Teacher Mapping" />} />
                                    <Route path="settings" element={<ComingSoon title="Settings" />} />
                                    <Route path="*" element={<Navigate to="/dashboard" />} />
                              </Route>
                        </Routes>
                  </TimetableProvider>
            </ErrorBoundary>
      )
}

export default App