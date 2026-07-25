import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { collegeTimingApi, subjectApi, facultyApi, teacherMappingApi, timetableApi, initializeApp } from '../services/api';

const TimetableContext = createContext();

export const useTimetable = () => {
      const context = useContext(TimetableContext);
      if (!context) {
            throw new Error('useTimetable must be used within a TimetableProvider');
      }
      return context;
};

export const TimetableProvider = ({ children }) => {
      // Application state
      const [isLoading, setIsLoading] = useState(true);
      const [isSaving, setIsSaving] = useState(false);
      const [apiStatus, setApiStatus] = useState({ connected: false, message: '' });

      // Master data from database
      const [collegeTiming, setCollegeTiming] = useState(null);
      const [subjects, setSubjects] = useState([]);
      const [faculty, setFaculty] = useState([]);
      const [teacherMappings, setTeacherMappings] = useState([]);
      const [generatedTimetables, setGeneratedTimetables] = useState([]);
      const [branches, setBranches] = useState([]);
      const [semesters, setSemesters] = useState([]);
      const [sections, setSections] = useState([]);
      const [rooms, setRooms] = useState([]);

      // Current wizard session (temporary state)
      const [currentWizardData, setCurrentWizardData] = useState({
            collegeTiming: null,
            selectedSubjects: [],
            selectedFaculty: [],
            selectedMappings: [],
      });

      // Initialize application — always succeeds with localStorage
      useEffect(() => {
            const initApp = async () => {
                  try {
                        setApiStatus({ connected: true, message: 'Offline mode — data saved locally' });
                        await loadAllData();
                  } catch (error) {
                        console.error('Failed to initialize app:', error);
                  } finally {
                        setIsLoading(false);
                  }
            };

            initApp();
      }, []);

      // Load all master data from database
      const loadAllData = async () => {
            try {
                  setIsLoading(true);

                  // Load college timing
                  const timingResponse = await collegeTimingApi.getCurrent();
                  if (timingResponse.success && timingResponse.data) {
                        setCollegeTiming(timingResponse.data);
                  }

                  // Load subjects
                  const subjectsResponse = await subjectApi.getAll();
                  if (subjectsResponse.success) {
                        setSubjects(subjectsResponse.data || []);
                  }

                  // Load faculty
                  const facultyResponse = await facultyApi.getAll();
                  if (facultyResponse.success) {
                        setFaculty(facultyResponse.data || []);
                  }

                  // Load teacher mappings
                  const mappingsResponse = await teacherMappingApi.getAll();
                  if (mappingsResponse.success) {
                        setTeacherMappings(mappingsResponse.data || []);
                  }

                  // Load generated timetables
                  const timetablesResponse = await timetableApi.getAll();
                  if (timetablesResponse.success) {
                        setGeneratedTimetables(timetablesResponse.data || []);
                  }

            } catch (error) {
                  console.error('Failed to load data:', error);
            } finally {
                  setIsLoading(false);
            }
      };

      // CRUD Operations for College Timing
      const saveCollegeTiming = async (timingData) => {
            try {
                  setIsSaving(true);
                  const response = await collegeTimingApi.save(timingData);
                  if (response.success) {
                        setCollegeTiming(response.data);
                        return { success: true, data: response.data };
                  }
                  return { success: false, message: response.message };
            } catch (error) {
                  console.error('Failed to save college timing:', error);
                  return { success: false, message: error.message };
            } finally {
                  setIsSaving(false);
            }
      };

      // CRUD Operations for Subjects (optimistic UI → API → rollback on failure)
      const createSubject = async (subjectData) => {
            let tempId = null;
            try {
                  setIsSaving(true);

                  // Validate subject data before sending
                  if (!subjectData.subjectCode || !subjectData.subjectName) {
                        return {
                              success: false,
                              message: 'Subject code and name are required'
                        };
                  }

                  console.log('Creating subject with data:', subjectData);

                  tempId = `temp-${Date.now()}`;
                  // Ensure all required properties are included
                  const completeSubjectData = {
                        subjectCode: (subjectData.subjectCode || '').toUpperCase(),
                        subjectName: subjectData.subjectName || '',
                        semester: Number(subjectData.semester) || 3,
                        branch: (subjectData.branch || 'CSE').toUpperCase(),
                        section: (subjectData.section || 'A').toUpperCase(),
                        theoryOrLab: subjectData.theoryOrLab || 'Theory',
                        hoursPerWeek: subjectData.hoursPerWeek || 3,
                        credits: subjectData.credits || 3,
                        lecturesRequired: subjectData.lecturesRequired || 0,
                        practicalRequired: subjectData.practicalRequired || 0
                  };

                  const optimistic = {
                        ...completeSubjectData,
                        _id: tempId,
                        isActive: true
                  };

                  // Optimistic: update UI immediately
                  setSubjects(prev => [optimistic, ...prev]);
                  setCurrentWizardData(prev => ({
                        ...prev,
                        selectedSubjects: [optimistic, ...prev.selectedSubjects]
                  }));

                  const response = await subjectApi.create(completeSubjectData);
                  console.log('Subject API response:', response);

                  if (response && response.success) {
                        setSubjects(prev => prev.map(s => s._id === tempId ? response.data : s));
                        setCurrentWizardData(prev => ({
                              ...prev,
                              selectedSubjects: prev.selectedSubjects.map(s =>
                                    s._id === tempId ? response.data : s
                              )
                        }));
                        return { success: true, data: response.data };
                  }

                  // Rollback on API failure
                  setSubjects(prev => prev.filter(s => s._id !== tempId));
                  setCurrentWizardData(prev => ({
                        ...prev,
                        selectedSubjects: prev.selectedSubjects.filter(s => s._id !== tempId)
                  }));
                  return { success: false, message: response.message || 'Failed to create subject' };
            } catch (error) {
                  console.error('Failed to create subject:', error);
                  setSubjects(prev => prev.filter(s => s._id !== tempId));
                  setCurrentWizardData(prev => ({
                        ...prev,
                        selectedSubjects: prev.selectedSubjects.filter(s => s._id !== tempId)
                  }));
                  return { success: false, message: error.message };
            } finally {
                  setIsSaving(false);
            }
      };

      const updateSubject = async (id, subjectData) => {
            const previousSubjects = subjects
            const previousWizardSubjects = currentWizardData.selectedSubjects

            const optimisticSubjects = subjects.map(subject =>
                  subject._id === id ? { ...subject, ...subjectData } : subject
            )
            setSubjects(optimisticSubjects)
            setCurrentWizardData(prev => ({
                  ...prev,
                  selectedSubjects: prev.selectedSubjects.map(subject =>
                        subject._id === id ? { ...subject, ...subjectData } : subject
                  )
            }))

            try {
                  setIsSaving(true)
                  const response = await subjectApi.update(id, subjectData)
                  if (response.success) {
                        setSubjects(prev => prev.map(subject =>
                              subject._id === id ? response.data : subject
                        ))
                        setCurrentWizardData(prev => ({
                              ...prev,
                              selectedSubjects: prev.selectedSubjects.map(subject =>
                                    subject._id === id ? response.data : subject
                              )
                        }))
                        return { success: true, data: response.data }
                  }

                  setSubjects(previousSubjects)
                  setCurrentWizardData(prev => ({ ...prev, selectedSubjects: previousWizardSubjects }))
                  return { success: false, message: response.message || 'Failed to update subject' }
            } catch (error) {
                  console.error('Failed to update subject:', error)
                  setSubjects(previousSubjects)
                  setCurrentWizardData(prev => ({ ...prev, selectedSubjects: previousWizardSubjects }))
                  return { success: false, message: error.message }
            } finally {
                  setIsSaving(false)
            }
      }

      const deleteSubject = async (id) => {
            const previousSubjects = subjects
            const previousWizardSubjects = currentWizardData.selectedSubjects
            const previousMappings = teacherMappings
            const previousWizardMappings = currentWizardData.selectedMappings

            setSubjects(prev => prev.filter(subject => subject._id !== id))
            setCurrentWizardData(prev => ({
                  ...prev,
                  selectedSubjects: prev.selectedSubjects.filter(subject => subject._id !== id),
                  selectedMappings: prev.selectedMappings.filter(mapping =>
                        mapping.subjectId !== id && mapping.subjectId?._id !== id && mapping.subjectCode !== undefined ? mapping.subjectCode !== previousSubjects.find(s => s._id === id)?.subjectCode : true
                  )
            }))
            setTeacherMappings(prev =>
                  prev.filter(mapping =>
                        mapping.subjectId !== id && mapping.subjectId?._id !== id
                  )
            )

            try {
                  setIsSaving(true)
                  const response = await subjectApi.delete(id)
                  if (response.success) {
                        return { success: true }
                  }

                  setSubjects(previousSubjects)
                  setCurrentWizardData(prev => ({ ...prev, selectedSubjects: previousWizardSubjects, selectedMappings: previousWizardMappings }))
                  setTeacherMappings(previousMappings)
                  return { success: false, message: response.message || 'Failed to delete subject' }
            } catch (error) {
                  console.error('Failed to delete subject:', error)
                  setSubjects(previousSubjects)
                  setCurrentWizardData(prev => ({ ...prev, selectedSubjects: previousWizardSubjects, selectedMappings: previousWizardMappings }))
                  setTeacherMappings(previousMappings)
                  return { success: false, message: error.message }
            } finally {
                  setIsSaving(false)
            }
      }

      // CRUD Operations for Faculty (optimistic UI → API → rollback)
      const createFaculty = async (facultyData) => {
            const tempId = `temp-fac-${Date.now()}`
            const optimistic = {
                  ...facultyData,
                  _id: tempId,
                  facultyId: facultyData.facultyId || `FAC${Date.now().toString(36).toUpperCase()}`,
                  isActive: true
            }

            setFaculty(prev => [optimistic, ...prev])
            setCurrentWizardData(prev => ({
                  ...prev,
                  selectedFaculty: [optimistic, ...prev.selectedFaculty]
            }))

            try {
                  setIsSaving(true)
                  const response = await facultyApi.create(facultyData)
                  if (response.success) {
                        setFaculty(prev => prev.map(f => f._id === tempId ? response.data : f))
                        setCurrentWizardData(prev => ({
                              ...prev,
                              selectedFaculty: prev.selectedFaculty.map(f =>
                                    f._id === tempId ? response.data : f
                              )
                        }))
                        return { success: true, data: response.data }
                  }

                  setFaculty(prev => prev.filter(f => f._id !== tempId))
                  setCurrentWizardData(prev => ({
                        ...prev,
                        selectedFaculty: prev.selectedFaculty.filter(f => f._id !== tempId)
                  }))
                  return { success: false, message: response.message || 'Failed to create faculty' }
            } catch (error) {
                  console.error('Failed to create faculty:', error)
                  setFaculty(prev => prev.filter(f => f._id !== tempId))
                  setCurrentWizardData(prev => ({
                        ...prev,
                        selectedFaculty: prev.selectedFaculty.filter(f => f._id !== tempId)
                  }))
                  return { success: false, message: error.message }
            } finally {
                  setIsSaving(false)
            }
      }

      const updateFaculty = async (id, facultyData) => {
            const previousFaculty = faculty
            const previousWizardFaculty = currentWizardData.selectedFaculty

            setFaculty(prev => prev.map(f => f._id === id ? { ...f, ...facultyData } : f))
            setCurrentWizardData(prev => ({
                  ...prev,
                  selectedFaculty: prev.selectedFaculty.map(f =>
                        f._id === id ? { ...f, ...facultyData } : f
                  )
            }))

            try {
                  setIsSaving(true)
                  const response = await facultyApi.update(id, facultyData)
                  if (response.success) {
                        setFaculty(prev => prev.map(f => f._id === id ? response.data : f))
                        setCurrentWizardData(prev => ({
                              ...prev,
                              selectedFaculty: prev.selectedFaculty.map(f =>
                                    f._id === id ? response.data : f
                              )
                        }))
                        return { success: true, data: response.data }
                  }

                  setFaculty(previousFaculty)
                  setCurrentWizardData(prev => ({ ...prev, selectedFaculty: previousWizardFaculty }))
                  return { success: false, message: response.message || 'Failed to update faculty' }
            } catch (error) {
                  console.error('Failed to update faculty:', error)
                  setFaculty(previousFaculty)
                  setCurrentWizardData(prev => ({ ...prev, selectedFaculty: previousWizardFaculty }))
                  return { success: false, message: error.message }
            } finally {
                  setIsSaving(false)
            }
      }

      const deleteFaculty = async (id) => {
            const previousFaculty = faculty
            const previousWizardFaculty = currentWizardData.selectedFaculty
            const previousMappings = teacherMappings

            setFaculty(prev => prev.filter(f => f._id !== id))
            setCurrentWizardData(prev => ({
                  ...prev,
                  selectedFaculty: prev.selectedFaculty.filter(f => f._id !== id)
            }))
            setTeacherMappings(prev =>
                  prev.filter(m => m.facultyId !== id && m.facultyId?._id !== id)
            )

            try {
                  setIsSaving(true)
                  const response = await facultyApi.delete(id)
                  if (response.success) {
                        return { success: true }
                  }

                  setFaculty(previousFaculty)
                  setCurrentWizardData(prev => ({ ...prev, selectedFaculty: previousWizardFaculty }))
                  setTeacherMappings(previousMappings)
                  return { success: false, message: response.message || 'Failed to delete faculty' }
            } catch (error) {
                  console.error('Failed to delete faculty:', error)
                  setFaculty(previousFaculty)
                  setCurrentWizardData(prev => ({ ...prev, selectedFaculty: previousWizardFaculty }))
                  setTeacherMappings(previousMappings)
                  return { success: false, message: error.message }
            } finally {
                  setIsSaving(false)
            }
      }

      // CRUD Operations for Teacher Mappings
      const createTeacherMapping = async (mappingData) => {
            try {
                  setIsSaving(true);
                  const response = await teacherMappingApi.create(mappingData);
                  if (response.success) {
                        setTeacherMappings(prev => [...prev, response.data]);
                        return { success: true, data: response.data };
                  }
                  return { success: false, message: response.message };
            } catch (error) {
                  console.error('Failed to create teacher mapping:', error);
                  return { success: false, message: error.message };
            } finally {
                  setIsSaving(false);
            }
      };

      const updateTeacherMapping = async (id, mappingData) => {
            try {
                  setIsSaving(true);
                  const response = await teacherMappingApi.update(id, mappingData);
                  if (response.success) {
                        setTeacherMappings(prev => prev.map(mapping =>
                              mapping._id === id ? response.data : mapping
                        ));
                        return { success: true, data: response.data };
                  }
                  return { success: false, message: response.message };
            } catch (error) {
                  console.error('Failed to update teacher mapping:', error);
                  return { success: false, message: error.message };
            } finally {
                  setIsSaving(false);
            }
      };

      const deleteTeacherMapping = async (id) => {
            try {
                  setIsSaving(true);
                  const response = await teacherMappingApi.delete(id);
                  if (response.success) {
                        setTeacherMappings(prev => prev.filter(mapping => mapping._id !== id));
                        setCurrentWizardData(prev => ({
                              ...prev,
                              selectedMappings: prev.selectedMappings.filter(mapping => mapping._id !== id)
                        }));
                        return { success: true };
                  }
                  return { success: false, message: response.message };
            } catch (error) {
                  console.error('Failed to delete teacher mapping:', error);
                  return { success: false, message: error.message };
            } finally {
                  setIsSaving(false);
            }
      };

      const generateTimetable = async (timetableData) => {
            try {
                  setIsSaving(true);
                  const response = await timetableApi.generate(timetableData);
                  if (response.success) {
                        // Replace if same _id, else prepend
                        setGeneratedTimetables(prev => {
                              const idx = prev.findIndex(t => t._id === response.data._id);
                              if (idx >= 0) {
                                    const updated = [...prev];
                                    updated[idx] = response.data;
                                    return updated;
                              }
                              return [response.data, ...prev];
                        });
                        return { success: true, data: response.data };
                  }
                  return { success: false, message: response.message };
            } catch (error) {
                  console.error('Failed to generate timetable:', error);
                  return { success: false, message: error.message };
            } finally {
                  setIsSaving(false);
            }
      };

      // Update timetable (slot edits from viewer)
      const updateTimetable = async (id, updates) => {
            try {
                  setIsSaving(true);
                  const response = await timetableApi.update(id, updates);
                  if (response.success) {
                        setGeneratedTimetables(prev =>
                              prev.map(t => t._id === id ? response.data : t)
                        );
                        return { success: true, data: response.data };
                  }
                  return { success: false, message: response.message };
            } catch (error) {
                  console.error('Failed to update timetable:', error);
                  return { success: false, message: error.message };
            } finally {
                  setIsSaving(false);
            }
      };

      // Delete timetable
      const deleteTimetable = async (id) => {
            try {
                  setIsSaving(true);
                  const response = await timetableApi.delete(id);
                  if (response.success) {
                        setGeneratedTimetables(prev => prev.filter(t => t._id !== id));
                        return { success: true };
                  }
                  return { success: false, message: response.message };
            } catch (error) {
                  console.error('Failed to delete timetable:', error);
                  return { success: false, message: error.message };
            } finally {
                  setIsSaving(false);
            }
      };

      // Wizard session management
      const startNewWizard = () => {
            setCurrentWizardData({
                  collegeTiming: collegeTiming || null,
                  selectedSubjects: [],
                  selectedFaculty: [],
                  selectedMappings: [],
                  selectedSection: null,
            });
      };

      const updateWizardData = (updates) => {
            setCurrentWizardData(prev => ({
                  ...prev,
                  ...updates
            }));
      };

      const resetWizard = () => {
            if (window.confirm('Are you sure you want to reset the wizard? All unsaved changes will be lost.')) {
                  startNewWizard();
                  return true;
            }
            return false;
      };

      // Validation helpers
      const validateWizardStep = (step) => {
            switch (step) {
                  case 1: // College Timing
                        if (!currentWizardData.collegeTiming) {
                              return { valid: false, message: 'Please configure college timing first' };
                        }
                        return { valid: true };

                  case 2: // Subjects
                        if (currentWizardData.selectedSubjects.length === 0) {
                              return { valid: false, message: 'Please add at least one subject' };
                        }
                        return { valid: true };

                  case 3: // Faculty
                        if (currentWizardData.selectedFaculty.length === 0) {
                              return { valid: false, message: 'Please add at least one faculty member' };
                        }
                        return { valid: true };

                  case 4: // Teacher Mapping
                        if ((currentWizardData.selectedMappings?.length || 0) === 0 && teacherMappings.length === 0) {
                              return { valid: false, message: 'Please add at least one teacher mapping' };
                        }
                        return { valid: true };

                  case 5: // Generate Timetable
                        return { valid: true };

                  default:
                        return { valid: true };
            }
      };

      // Statistics
      const getStatistics = useCallback(() => {
            return {
                  totalSubjects: subjects.length,
                  totalFaculty: faculty.length,
                  totalMappings: teacherMappings.length,
                  totalTimetables: generatedTimetables.length,
                  totalBranches: branches.length,
                  totalSections: sections.length,
                  totalRooms: rooms.length,
                  collegeTimingConfigured: !!collegeTiming,
                  canGenerateTimetable: subjects.length > 0 && faculty.length > 0 && teacherMappings.length > 0 && !!collegeTiming
            };
      }, [subjects, faculty, teacherMappings, generatedTimetables, branches, sections, rooms, collegeTiming]);

      const value = {
            // State
            isLoading,
            isSaving,
            apiStatus,

            // Master Data
            collegeTiming,
            subjects,
            faculty,
            teacherMappings,
            generatedTimetables,
            branches,
            semesters,
            sections,
            rooms,

            // Wizard Data
            currentWizardData,

            // Actions
            loadAllData,
            saveCollegeTiming,
            createSubject,
            updateSubject,
            deleteSubject,
            createFaculty,
            updateFaculty,
            deleteFaculty,
            createTeacherMapping,
            updateTeacherMapping,
            deleteTeacherMapping,
            generateTimetable,
            updateTimetable,
            deleteTimetable,

            // Wizard Management
            startNewWizard,
            updateWizardData,
            resetWizard,
            validateWizardStep,

            // Statistics
            getStatistics
      };

      return (
            <TimetableContext.Provider value={value}>
                  {children}
            </TimetableContext.Provider>
      );
};