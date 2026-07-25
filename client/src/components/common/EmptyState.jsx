import React from 'react';
import { BookOpen, Users, Calendar, Building, Settings, Clock, Plus } from 'lucide-react';

const EmptyState = ({
      type,
      title,
      description,
      actionText,
      onAction,
      icon: Icon,
      children
}) => {
      // Default configurations for different types
      const typeConfigs = {
            collegeTiming: {
                  icon: Clock,
                  defaultTitle: 'No College Timing Configured',
                  defaultDescription: 'Configure college working hours, lecture durations, and breaks to get started.',
                  defaultActionText: 'Configure College Timing'
            },
            subjects: {
                  icon: BookOpen,
                  defaultTitle: 'No Subjects Added',
                  defaultDescription: 'Add subjects to create your timetable. Subjects are the foundation of your schedule.',
                  defaultActionText: 'Add Your First Subject'
            },
            faculty: {
                  icon: Users,
                  defaultTitle: 'No Faculty Members',
                  defaultDescription: 'Add faculty members who will teach the subjects in your timetable.',
                  defaultActionText: 'Add Your First Faculty'
            },
            teacherMapping: {
                  icon: Settings,
                  defaultTitle: 'No Teacher Mappings',
                  defaultDescription: 'Map faculty to subjects to create teaching assignments.',
                  defaultActionText: 'Create Your First Mapping'
            },
            timetable: {
                  icon: Calendar,
                  defaultTitle: 'No Timetables Generated',
                  defaultDescription: 'Generate your first timetable to start scheduling classes.',
                  defaultActionText: 'Generate Timetable'
            },
            branches: {
                  icon: Building,
                  defaultTitle: 'No Branches Added',
                  defaultDescription: 'Add academic branches to organize your subjects and faculty.',
                  defaultActionText: 'Add Your First Branch'
            },
            default: {
                  icon: Plus,
                  defaultTitle: 'No Data Available',
                  defaultDescription: 'Get started by adding your first record.',
                  defaultActionText: 'Add Your First Record'
            }
      };

      const config = typeConfigs[type] || typeConfigs.default;
      const IconComponent = Icon || config.icon;

      return (
            <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200 text-center">
                  {/* Icon */}
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                        <IconComponent className="h-12 w-12 text-blue-600" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        {title || config.defaultTitle}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 mb-8 max-w-md">
                        {description || config.defaultDescription}
                  </p>

                  {/* Action Button */}
                  {onAction && (
                        <button
                              onClick={onAction}
                              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                        >
                              <Plus className="h-5 w-5" />
                              <span>{actionText || config.defaultActionText}</span>
                        </button>
                  )}

                  {/* Optional Children */}
                  {children && (
                        <div className="mt-8 pt-8 border-t border-gray-200 w-full">
                              {children}
                        </div>
                  )}

                  {/* Help Text */}
                  <div className="mt-6 text-sm text-gray-500">
                        <p>All data is saved automatically and persists across sessions</p>
                  </div>
            </div>
      );
};

export const EmptyCollegeTiming = ({ onConfigure }) => (
      <EmptyState
            type="collegeTiming"
            onAction={onConfigure}
      >
            <div className="grid grid-cols-2 gap-4 mt-6 w-full max-w-md">
                  <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <h4 className="font-medium text-blue-800 mb-2">Required Settings</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                              <li>• Working Days</li>
                              <li>• Start & End Time</li>
                              <li>• Lecture Duration</li>
                              <li>• Lunch Break</li>
                        </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-100">
                        <h4 className="font-medium text-green-800 mb-2">Optional Settings</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                              <li>• Tea/Snack Breaks</li>
                              <li>• Assembly Time</li>
                              <li>• Prayer Time</li>
                              <li>• Special Events</li>
                        </ul>
                  </div>
            </div>
      </EmptyState>
);

export const EmptySubjects = ({ onAddSubject }) => (
      <EmptyState
            type="subjects"
            onAction={onAddSubject}
      >
            <div className="mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Quick Start Options:</h4>
                  <div className="flex flex-wrap justify-center gap-3">
                        <button
                              onClick={() => onAddSubject && onAddSubject('single')}
                              className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                              Add Single Subject
                        </button>
                        <button
                              onClick={() => onAddSubject && onAddSubject('bulk')}
                              className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        >
                              Import from Excel
                        </button>
                        <button
                              onClick={() => onAddSubject && onAddSubject('template')}
                              className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                              Use Template
                        </button>
                  </div>
            </div>
      </EmptyState>
);

export const EmptyFaculty = ({ onAddFaculty }) => (
      <EmptyState
            type="faculty"
            onAction={onAddFaculty}
      >
            <div className="mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Faculty Information Required:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                              <p className="font-medium">Basic Details</p>
                              <ul className="mt-1 space-y-1">
                                    <li>• Faculty ID</li>
                                    <li>• Name & Designation</li>
                                    <li>• Department</li>
                                    <li>• Contact Information</li>
                              </ul>
                        </div>
                        <div>
                              <p className="font-medium">Availability</p>
                              <ul className="mt-1 space-y-1">
                                    <li>• In/Out Time</li>
                                    <li>• Working Days</li>
                                    <li>• Maximum Load</li>
                                    <li>• Preferred Subjects</li>
                              </ul>
                        </div>
                  </div>
            </div>
      </EmptyState>
);

export const EmptyTeacherMapping = ({ onAddMapping }) => (
      <EmptyState
            type="teacherMapping"
            onAction={onAddMapping}
      >
            <div className="mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Before Mapping:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="font-medium text-blue-800 mb-1">Required</p>
                              <p className="text-blue-700">Add Subjects and Faculty first</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                              <p className="font-medium text-green-800 mb-1">Auto-mapping</p>
                              <p className="text-green-700">System will suggest optimal assignments</p>
                        </div>
                  </div>
            </div>
      </EmptyState>
);

export const EmptyTimetable = ({ onGenerate }) => (
      <EmptyState
            type="timetable"
            onAction={onGenerate}
      >
            <div className="mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Prerequisites:</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-xs font-bold text-blue-600">1</span>
                              </div>
                              <span>Configure College Timing</span>
                        </div>
                        <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                    <span className="text-xs font-bold text-green-600">2</span>
                              </div>
                              <span>Add Subjects and Faculty</span>
                        </div>
                        <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                                    <span className="text-xs font-bold text-purple-600">3</span>
                              </div>
                              <span>Create Teacher Mappings</span>
                        </div>
                  </div>
            </div>
      </EmptyState>
);

export default EmptyState;