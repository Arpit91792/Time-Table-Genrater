import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Menu, X, Home, Calendar, Users, BookOpen, Settings, Upload, Download, FileText, Clock } from 'lucide-react'

const Layout = () => {
      // Closed by default — open overlay only when user opens the menu on small screens.
      // Desktop always shows the sidebar via lg:translate-x-0.
      const [sidebarOpen, setSidebarOpen] = useState(false)

      const navigation = [
            { name: 'Dashboard', href: '/dashboard', icon: Home },
            { name: 'Create Timetable', href: '/create', icon: Calendar },
            { name: 'View Timetables', href: '/timetables', icon: FileText },
            { name: 'Import Data', href: '/import', icon: Upload },
            { name: 'Export Data', href: '/export', icon: Download },
            { name: 'Subjects', href: '/subjects', icon: BookOpen },
            { name: 'Faculty', href: '/faculty', icon: Users },
            { name: 'Teacher Mapping', href: '/mapping', icon: Settings },
            { name: 'Settings', href: '/settings', icon: Clock }
      ]

      return (
            <div className="min-h-screen bg-gray-50">
                  {/* Sidebar */}
                  <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        } lg:translate-x-0`}>
                        <div className="flex flex-col h-full">
                              {/* Logo */}
                              <div className="flex items-center h-16 px-4 border-b">
                                    <div className="flex items-center space-x-2">
                                          <Calendar className="h-8 w-8 text-primary-600" />
                                          <span className="text-xl font-bold text-gray-900">TimetableGen</span>
                                    </div>
                              </div>

                              {/* Navigation */}
                              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                                    {navigation.map((item) => {
                                          const Icon = item.icon
                                          return (
                                                <NavLink
                                                      key={item.name}
                                                      to={item.href}
                                                      className={({ isActive }) =>
                                                            `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
                                                                  ? 'bg-primary-50 text-primary-700'
                                                                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                                            }`
                                                      }
                                                >
                                                      <Icon className="mr-3 h-5 w-5" />
                                                      {item.name}
                                                </NavLink>
                                          )
                                    })}
                              </nav>

                              {/* User info (public mode) */}
                              <div className="border-t px-4 py-4">
                                    <div className="flex items-center">
                                          <div className="flex-shrink-0">
                                                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                                      <Users className="h-6 w-6 text-primary-600" />
                                                </div>
                                          </div>
                                          <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">Public Access</p>
                                                <p className="text-xs text-gray-500">Timetable Generator</p>
                                          </div>
                                    </div>
                              </div>
                        </div>
                  </div>

                  {/* Main content */}
                  <div className="transition-all duration-300 lg:ml-64">
                        {/* Overlay for mobile sidebar */}
                        {sidebarOpen && (
                              <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                                    onClick={() => setSidebarOpen(false)}
                              />
                        )}
                        {/* Top bar */}
                        <header className="sticky top-0 z-40 bg-white shadow-sm">
                              <div className="flex items-center justify-between h-16 px-4">
                                    <button
                                          onClick={() => setSidebarOpen(!sidebarOpen)}
                                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg lg:hidden"
                                    >
                                          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                                    </button>

                                    <div className="flex-1 flex justify-between items-center">
                                          <div className="ml-4">
                                                <h1 className="text-xl font-semibold text-gray-900">Smart College Timetable Generator</h1>
                                          </div>

                                          <div className="flex items-center space-x-4">
                                                <button className="btn btn-primary">
                                                      Generate Timetable
                                                </button>
                                          </div>
                                    </div>
                              </div>
                        </header>

                        {/* Page content */}
                        <main className="p-6">
                              <Outlet />
                        </main>
                  </div>


            </div>
      )
}

export default Layout