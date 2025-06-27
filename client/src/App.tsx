import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { TransformationRuleForm } from './components/TransformationRuleForm'
import { PreviewPanel } from './components/PreviewPanel'
import { PDFPreview } from './components/PDFPreview'
import { transformPDF } from './services/api'
import type { TransformationRule, UploadedFile } from './types'
import './App.css'

type Step = 'upload' | 'configure' | 'preview' | 'download'

interface TransformResult {
  success: boolean
  downloadId?: string
  previewId?: string
  fileName?: string
  message?: string
  error?: string
}

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [transformationRules, setTransformationRules] = useState<TransformationRule[]>([])
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null)
  const [isTransforming, setIsTransforming] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file)
    setCurrentStep('configure')
  }

  const handleFileRemove = () => {
    setUploadedFile(null)
    setTransformationRules([])
    setTransformResult(null)
    setCurrentStep('upload')
  }

  const handleTransform = async () => {
    if (!uploadedFile || transformationRules.length === 0) return

    setIsTransforming(true)
    try {
      const result = await transformPDF(uploadedFile.fileId, transformationRules)
      setTransformResult(result)
      setCurrentStep('preview')
    } catch (error) {
      console.error('Transformation failed:', error)
      setTransformResult({
        success: false,
        error: 'Transformation failed. Please try again.'
      })
    } finally {
      setIsTransforming(false)
    }
  }

  const handlePreview = () => {
    setShowPreview(true)
  }

  const handleClosePreview = () => {
    setShowPreview(false)
  }

  const handleDownload = () => {
    if (transformResult?.downloadId) {
      const downloadUrl = `http://localhost:3001/api/download/${transformResult.downloadId}`
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = transformResult.fileName || 'transformed.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleReset = () => {
    setCurrentStep('upload')
    setUploadedFile(null)
    setTransformationRules([])
    setTransformResult(null)
    setShowPreview(false)
  }

  const getStepStatus = (step: Step) => {
    const stepOrder: Step[] = ['upload', 'configure', 'preview', 'download']
    const currentIndex = stepOrder.indexOf(currentStep)
    const stepIndex = stepOrder.indexOf(step)
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PDF</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">PDFFlow</h1>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center space-x-8">
              {(['upload', 'configure', 'preview', 'download'] as Step[]).map((step, index) => {
                const status = getStepStatus(step)
                return (
                  <div key={step} className="flex items-center">
                    <div className={`flex items-center space-x-2 ${
                      status === 'current' ? 'text-primary-600' :
                      status === 'completed' ? 'text-success-600' :
                      'text-gray-400'
                    }`}>
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                        status === 'current' ? 'border-primary-600 bg-primary-50' :
                        status === 'completed' ? 'border-success-600 bg-success-50' :
                        'border-gray-300 bg-white'
                      }`}>
                        {status === 'completed' ? '✓' : index + 1}
                      </div>
                      <span className="text-sm font-medium capitalize">{step}</span>
                    </div>
                    {index < 3 && (
                      <div className={`w-12 h-0.5 ml-4 ${
                        status === 'completed' ? 'bg-success-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Configure */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Step */}
            <div className={`transition-all duration-300 ${
              currentStep === 'upload' ? 'opacity-100' : 'opacity-60'
            }`}>
              <FileUpload 
                onFileUpload={handleFileUpload} 
                uploadedFile={uploadedFile}
                onFileRemove={handleFileRemove}
                isUploading={false}
                uploadError={null}
                setIsUploading={() => {}}
                setUploadError={() => {}}
              />
            </div>

            {/* Configuration Step */}
            {uploadedFile && (
              <div className={`transition-all duration-300 ${
                currentStep === 'configure' ? 'opacity-100' : 'opacity-60'
              }`}>
                <TransformationRuleForm
                  rules={transformationRules}
                  onRulesChange={setTransformationRules}
                />
              </div>
            )}

            {/* Transform Button */}
            {uploadedFile && transformationRules.length > 0 && currentStep === 'configure' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready to Transform
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {transformationRules.length} transformation{transformationRules.length !== 1 ? 's' : ''} will be applied to your PDF
                  </p>
                  
                  <button
                    onClick={handleTransform}
                    disabled={isTransforming}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isTransforming ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Transform PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Preview & Download Step */}
            {transformResult && (
              <div className={`transition-all duration-300 ${
                currentStep === 'preview' ? 'opacity-100' : 'opacity-60'
              }`}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      transformResult.success ? 'bg-success-100' : 'bg-error-100'
                    }`}>
                      {transformResult.success ? (
                        <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {transformResult.success ? 'Transformation Complete!' : 'Transformation Failed'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {transformResult.message || transformResult.error}
                    </p>
                    
                    {transformResult.success && (
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={handlePreview}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview PDF
                        </button>
                        <button
                          onClick={handleDownload}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download PDF
                        </button>
                      </div>
                    )}
                    
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 mt-4"
                    >
                      Start New Transformation
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Preview Panel */}
          <div className="space-y-6">
            <PreviewPanel
              rules={transformationRules}
              fileName={uploadedFile?.originalName}
            />
          </div>
        </div>
      </main>

      {/* PDF Preview Modal */}
      {showPreview && transformResult?.previewId && (
        <PDFPreview
          fileId={transformResult.previewId}
          fileName={transformResult.fileName}
          onClose={handleClosePreview}
          onDownload={handleDownload}
        />
      )}
    </div>
  )
}

export default App
