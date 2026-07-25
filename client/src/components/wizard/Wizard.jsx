import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Save, Clock, BookOpen, Users, Settings, Calendar, AlertCircle } from 'lucide-react'
import Step1CollegeTiming from './steps/Step1CollegeTiming'
import Step2SubjectDetails from './steps/Step2SubjectDetails'
import Step3FacultyDetails from './steps/Step3FacultyDetails'
import Step4TeacherMapping from './steps/Step5TeacherMapping'
import Step5GenerateTimetable from './steps/Step6GenerateTimetable'
import TimetableViewer from '../TimetableViewer'
import ErrorBoundary from '../common/ErrorBoundary'
import { useTimetable } from '../../context/TimetableContext'

const Wizard = ({ onClose }) => {
      const [currentStep, setCurrentStep] = useState(1)
      const [isFullScreen, setIsFullScreen] = useState(true)
      const [stepValidation, setStepValidation] = useState({})
      const [viewingTimetable, setViewingTimetable] = useState(null)
      const totalSteps = 5

      const {
            // State
            isLoading,
            isSaving,

            // Master Data
            collegeTiming: savedCollegeTiming,
            subjects: savedSubjects,
            faculty: savedFaculty,
            teacherMappings: savedMappings,

            // Wizard Data
            currentWizardData,

            // Actions
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

            // Wizard Management
            startNewWizard,
            updateWizardData,
            resetWizard,
            validateWizardStep
      } = useTimetable()

      // Keep wizard subjects permanently synced with the global store (MongoDB source of truth)
      useEffect(() => {
            updateWizardData({ selectedSubjects: savedSubjects })
      }, [savedSubjects])

      useEffect(() => {
            if (savedCollegeTiming) {
                  updateWizardData({ collegeTiming: savedCollegeTiming })
            }
      }, [savedCollegeTiming])

      // Always mirror faculty from DB — deletes/adds persist across step navigation
      useEffect(() => {
            updateWizardData({ selectedFaculty: savedFaculty })
      }, [savedFaculty])

      // Always mirror mappings from the saved store — keeps them visible
      // when navigating away from step 4 and coming back.
      // Guard: only update if the saved list actually differs to avoid render loops.
      useEffect(() => {
            const saved = JSON.stringify(savedMappings)
            const current = JSON.stringify(currentWizardData.selectedMappings)
            if (saved !== current) {
                  updateWizardData({ selectedMappings: savedMappings })
            }
      }, [savedMappings])


      const steps = [
            { number: 1, title: 'College Timing', icon: Clock },
            { number: 2, title: 'Subject Details', icon: BookOpen },
            { number: 3, title: 'Faculty Details', icon: Users },
            { number: 4, title: 'Teacher Mapping', icon: Settings },
            { number: 5, title: 'Generate Timetable', icon: Calendar }
      ]

      const progressPercentage = (currentStep / totalSteps) * 100

      const handleNext = async () => {
            // Validate current step
            const validation = validateWizardStep(currentStep)
            setStepValidation(prev => ({ ...prev, [currentStep]: validation }))

            if (!validation.valid) {
                  alert(validation.message)
                  return
            }

            // Auto-save data if moving forward
            if (currentStep < totalSteps) {
                  setCurrentStep(currentStep + 1)
            }
      }

      const handlePrevious = () => {
            if (currentStep > 1) {
                  setCurrentStep(currentStep - 1)
            }
      }

      const handleCancel = () => {
            if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
                  setIsFullScreen(false)
                  resetWizard()
                  if (onClose) onClose()
            }
      }

      const handleSaveDraft = async () => {
            // Save all wizard data to master database
            try {
                  // Save college timing if modified
                  if (currentWizardData.collegeTiming && !isSavedCollegeTiming(currentWizardData.collegeTiming)) {
                        await saveCollegeTiming(currentWizardData.collegeTiming)
                  }

                  alert('Draft saved successfully')
            } catch (error) {
                  alert('Failed to save draft: ' + error.message)
            }
      }

      const handleFinish = async (timetableData) => {
            const validation = validateWizardStep(currentStep)
            if (!validation.valid) {
                  alert(validation.message)
                  return
            }

            try {
                  // If timetableData is passed from Step5 (new flow), save & show viewer
                  if (timetableData && timetableData.slots) {
                        const result = await generateTimetable(timetableData)
                        if (result.success) {
                              // Viewer opens via onViewTimetable prop
                              return
                        } else {
                              alert('Failed to save timetable: ' + (result.message || 'Unknown error'))
                        }
                        return
                  }

                  // Legacy flow (button in footer)
                  const data = {
                        collegeTiming: currentWizardData.collegeTiming,
                        subjects: currentWizardData.selectedSubjects,
                        faculty: currentWizardData.selectedFaculty,
                        teacherMappings: currentWizardData.selectedMappings,
                        section: 'A',
                        type: 'Weekly',
                        name: `Timetable - ${new Date().toLocaleDateString()}`
                  }

                  const result = await generateTimetable(data)
                  if (result.success) {
                        alert('Timetable generated successfully!')
                        setIsFullScreen(false)
                        resetWizard()
                        if (onClose) onClose()
                  } else {
                        alert('Failed to generate timetable: ' + result.message)
                  }
            } catch (error) {
                  alert('Error: ' + error.message)
            }
      }

      const isSavedCollegeTiming = (timing) => {
            if (!savedCollegeTiming) return false
            return JSON.stringify(timing) === JSON.stringify(savedCollegeTiming)
      }

      const renderStep = () => {
            switch (currentStep) {
                  case 1:
                        return (
                              <ErrorBoundary>
                                    <Step1CollegeTiming
                                          data={currentWizardData.collegeTiming}
                                          onChange={(data) => updateWizardData({ collegeTiming: data })}
                                          onSave={saveCollegeTiming}
                                          isSaving={isSaving}
                                          savedData={savedCollegeTiming}
                                    />
                              </ErrorBoundary>
                        )
                  case 2:
                        return (
                              <ErrorBoundary>
                                    <Step2SubjectDetails
                                          selectedSubjects={currentWizardData.selectedSubjects}
                                          masterSubjects={savedSubjects}
                                          onSelectSubjects={(selected) => updateWizardData({ selectedSubjects: selected })}
                                          onCreateSubject={createSubject}
                                          onUpdateSubject={updateSubject}
                                          onDeleteSubject={deleteSubject}
                                          isSaving={isSaving}
                                    />
                              </ErrorBoundary>
                        )
                  case 3:
                        return (
                              <ErrorBoundary>
                                    <Step3FacultyDetails
                                          selectedFaculty={currentWizardData.selectedFaculty}
                                          masterFaculty={savedFaculty}
                                          onSelectFaculty={(selected) => updateWizardData({ selectedFaculty: selected })}
                                          onCreateFaculty={createFaculty}
                                          onUpdateFaculty={updateFaculty}
                                          onDeleteFaculty={deleteFaculty}
                                          isSaving={isSaving}
                                    />
                              </ErrorBoundary>
                        )
                  case 4:
                        return (
                              <ErrorBoundary>
                                    <Step4TeacherMapping
                                          selectedMappings={currentWizardData.selectedMappings}
                                          masterMappings={savedMappings}
                                          availableSubjects={currentWizardData.selectedSubjects}
                                          availableFaculty={currentWizardData.selectedFaculty}
                                          onSelectMappings={(selected) => updateWizardData({ selectedMappings: selected })}
                                          onCreateMapping={createTeacherMapping}
                                          onUpdateMapping={updateTeacherMapping}
                                          onDeleteMapping={deleteTeacherMapping}
                                          isSaving={isSaving}
                                    />
                              </ErrorBoundary>
                        )
                  case 5:
                        return (
                              <ErrorBoundary>
                                    <Step5GenerateTimetable
                                          collegeTiming={currentWizardData.collegeTiming}
                                          selectedSubjects={currentWizardData.selectedSubjects}
                                          selectedFaculty={currentWizardData.selectedFaculty}
                                          selectedMappings={currentWizardData.selectedMappings}
                                          isSaving={isSaving}
                                          onGenerate={handleFinish}
                                          onViewTimetable={(tt) => setViewingTimetable(tt)}
                                    />
                              </ErrorBoundary>
                        )
                  default:
                        return null
            }
      }

      return (
            <>
                  {/* Timetable Viewer overlay */}
                  {viewingTimetable && (
                        <TimetableViewer
                              timetable={viewingTimetable}
                              allSubjects={currentWizardData.selectedSubjects || savedSubjects}
                              allFaculty={currentWizardData.selectedFaculty || savedFaculty}
                              onClose={() => setViewingTimetable(null)}
                              onUpdate={async (updated) => {
                                    setViewingTimetable(updated)
                                    await generateTimetable(updated) // upserts by _id
                              }}
                        />
                  )}

                  {isFullScreen && (
                        <div className="fixed inset-0 bg-white z-50 overflow-hidden">
                              {/* Progress Bar */}
                              <div className="h-2 bg-gray-100 w-full">
                                    <div
                                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                          style={{ width: `${progressPercentage}%` }}
                                    ></div>
                              </div>

                              {/* Header */}
                              <div className="border-b border-gray-200">
                                    <div className="container mx-auto px-6 py-4">
                                          <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                      <button
                                                            onClick={handleCancel}
                                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                            title="Close"
                                                      >
                                                            <X className="h-5 w-5 text-gray-600" />
                                                      </button>
                                                      <div>
                                                            <h1 className="text-xl font-bold text-gray-900">Timetable Wizard</h1>
                                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                                  <span>Step {currentStep} of {totalSteps}</span>
                                                                  <span className="text-gray-400">•</span>
                                                                  <span>{steps[currentStep - 1]?.title}</span>
                                                            </div>
                                                      </div>
                                                </div>

                                                <div className="flex items-center space-x-3">
                                                      <div className="text-sm text-gray-600">
                                                            <span className="font-medium">{Math.round(progressPercentage)}%</span> Complete
                                                      </div>
                                                      <div className="w-32 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                                                  style={{ width: `${progressPercentage}%` }}
                                                            ></div>
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Step Indicators */}
                                          <div className="flex items-center justify-between mt-4">
                                                {steps.map((step) => {
                                                      const Icon = step.icon
                                                      const isActive = step.number === currentStep
                                                      const isCompleted = step.number < currentStep

                                                      return (
                                                            <div
                                                                  key={step.number}
                                                                  className={`flex flex-col items-center space-y-2 cursor-pointer ${isCompleted ? 'text-blue-600' : isActive ? 'text-gray-900' : 'text-gray-400'}`}
                                                                  onClick={() => setCurrentStep(step.number)}
                                                            >
                                                                  <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center border-2
                        ${isActive ? 'border-blue-500 bg-blue-50' :
                                                                              isCompleted ? 'border-blue-500 bg-blue-500 text-white' :
                                                                                    'border-gray-300 bg-gray-50'}
                      `}>
                                                                        <Icon className="h-5 w-5" />
                                                                  </div>
                                                                  <span className="text-xs font-medium">{step.title}</span>
                                                                  <div className={`h-1 w-full rounded-full ${isCompleted ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                                                            </div>
                                                      )
                                                })}
                                          </div>
                                    </div>
                              </div>

                              {/* Main Content */}
                              <div className="h-[calc(100vh-140px)] overflow-y-auto">
                                    <div className="container mx-auto px-6 py-8">
                                          {renderStep()}
                                    </div>
                              </div>

                              {/* Footer Actions */}
                              <div className="border-t border-gray-200 bg-white">
                                    <div className="container mx-auto px-6 py-4">
                                          <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                      <button
                                                            onClick={handleCancel}
                                                            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                                      >
                                                            Cancel
                                                      </button>
                                                      <button
                                                            onClick={handleSaveDraft}
                                                            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-2"
                                                            disabled={isSaving}
                                                      >
                                                            <Save className="h-4 w-4" />
                                                            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
                                                      </button>
                                                </div>

                                                <div className="flex items-center space-x-3">
                                                      {currentStep > 1 && (
                                                            <button
                                                                  onClick={handlePrevious}
                                                                  className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
                                                            >
                                                                  <ChevronLeft className="h-4 w-4" />
                                                                  <span>Previous</span>
                                                            </button>
                                                      )}

                                                      <button
                                                            onClick={currentStep === totalSteps ? handleFinish : handleNext}
                                                            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                                                            disabled={isSaving}
                                                      >
                                                            <span>{currentStep === totalSteps ? (isSaving ? 'Generating...' : 'Generate Timetable') : 'Next'}</span>
                                                            {currentStep < totalSteps && <ChevronRight className="h-4 w-4" />}
                                                      </button>
                                                </div>
                                          </div>

                                          {/* Validation Errors */}
                                          {stepValidation[currentStep] && !stepValidation[currentStep].valid && (
                                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                                                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                                      <div className="text-sm text-red-700">
                                                            {stepValidation[currentStep].message}
                                                      </div>
                                                </div>
                                          )}
                                    </div>
                              </div>
                        </div>
                  )}
            </>
      )
}

export default Wizard