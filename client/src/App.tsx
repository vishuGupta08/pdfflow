import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { TransformationRuleForm } from './components/TransformationRuleForm'
import { PreviewPanel } from './components/PreviewPanel'
import { PDFPreview } from './components/PDFPreview'
import { AuthModal } from './components/AuthModal'
import { transformPDF, ApiService, TransformResult } from './services/api'
import { useAuth } from './contexts/AuthContext'
import type { TransformationRule, UploadedFile } from './types'
import { LogIn, LogOut, User } from 'lucide-react'
import './App.css'

type Step = 'upload' | 'configure' | 'preview' | 'download' | 'complete'

function App() {
  const { user, signOut, loading } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [transformationRules, setTransformationRules] = useState<TransformationRule[]>([])
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null)
  const [isTransforming, setIsTransforming] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Debug logging
  console.log('🏠 App render - User:', user ? `${user.email} (${user.uid})` : 'Not authenticated');
  console.log('⏳ App render - Loading:', loading);
  
  // Debug transform result and buttons
  if (transformResult) {
    console.log('📊 Current transform result:', transformResult);
    console.log('✅ Transform success:', transformResult.success);
    console.log('🎯 Should show buttons:', transformResult.success);
  }

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
      
      if (result.success) {
        console.log('✅ Transformation successful!');
        console.log('📊 Transform result data:', result);
        console.log('🆔 Preview ID:', result.previewId);
        console.log('🆔 Download ID:', result.downloadId);
        console.log('📄 File name:', result.fileName);
        setTransformResult(result)
        setCurrentStep('preview')
      } else {
        // Handle specific error types for transformations
        let errorMessage = result.error || 'Transformation failed. Please try again.';
        
        if (result.errorType === 'USAGE_LIMIT') {
          if (result.limitInfo?.upgrade_required) {
            const currentUsage = result.limitInfo.usage?.transformations || 0;
            const maxTransformations = result.limitInfo.maxTransformations || 5;
            errorMessage = `Monthly transformation limit reached (${currentUsage}/${maxTransformations} used). Upgrade to ${result.limitInfo.current_plan === 'free' ? 'Pro' : 'a higher'} plan to continue transforming PDFs.`;
          } else {
            errorMessage = 'Transformation limit reached. Please try again later or upgrade your plan.';
          }
        } else if (result.errorType === 'FILE_SIZE_LIMIT') {
          errorMessage = 'The PDF file is too large for transformation. Please try with a smaller file or upgrade your plan.';
        } else if (result.errorType === 'AUTH_REQUIRED') {
          errorMessage = 'Please sign in to transform PDFs.';
        }
        
        setTransformResult({
          success: false,
          error: errorMessage,
          errorType: result.errorType,
          limitInfo: result.limitInfo
        });
        setCurrentStep('preview');
      }
    } catch (error) {
      console.error('Transformation failed:', error)
      setTransformResult({
        success: false,
        error: 'Network error occurred. Please check your connection and try again.'
      })
      setCurrentStep('preview');
    } finally {
      setIsTransforming(false)
    }
  }

  const handlePreview = () => {
    console.log('🔍 Preview button clicked - Preview ID:', transformResult?.previewId);
    setCurrentStep('preview');
    setShowPreview(true)
  }

  const handleClosePreview = () => {
    setShowPreview(false)
  }

  const handleDownload = () => {
    console.log('⬇️ Download button clicked - Download ID:', transformResult?.downloadId);
    
    if (transformResult?.downloadId) {
      console.log('✅ Starting download...');
      setCurrentStep('download');
      const downloadUrl = ApiService.getDownloadUrl(transformResult.downloadId)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = transformResult.fileName || 'transformed.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Mark download as completed after a brief delay
      setTimeout(() => {
        setCurrentStep('complete');
      }, 500);
    } else {
      console.log('❌ No download ID found');
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
    
    // If currentStep is 'complete', all visible steps should be completed
    if (currentStep === 'complete') {
      return 'completed'
    }
    
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
            
            {/* Right side - Auth/User info */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={signOut}
                    className="inline-flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              )}
              
              {/* Progress Steps - only show when authenticated */}
              {user && (
                <div className="hidden md:flex items-center space-x-8 ml-8">
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
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          /* Loading state while checking authentication */
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : user ? (
          /* Authenticated user - show main app */
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
                    uploadedFile={uploadedFile}
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
                        {transformResult.error}
                      </p>
                      
                      {/* Show upgrade prompt for usage limits */}
                      {!transformResult.success && transformResult.errorType === 'USAGE_LIMIT' && transformResult.limitInfo?.upgrade_required && (
                        <div className="bg-gradient-to-r from-primary-50 to-primary-25 border border-primary-200 rounded-lg p-4 mb-6">
                          <h4 className="font-medium text-primary-800 mb-2">Upgrade to Continue</h4>
                          <p className="text-sm text-primary-700 mb-3">
                            You've used {transformResult.limitInfo.usage?.transformations || 0} of your monthly transformations. 
                            Upgrade to get unlimited transformations and premium features.
                          </p>
                          <button className="btn-primary btn-sm">
                            Upgrade Now
                          </button>
                        </div>
                      )}
                      
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
        ) : (
          /* Welcome screen for non-authenticated users */
          <div className="text-center py-20">
            <div className="max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <span className="text-white font-bold text-2xl">PDF</span>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Transform Your PDFs with Ease
              </h1>
              
              <p className="text-xl text-gray-600 mb-8">
                Rotate, remove pages, add watermarks, and more. Professional PDF editing made simple.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Processing</h3>
                  <p className="text-gray-600 text-sm">Transform your PDFs in seconds with our optimized processing engine.</p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Private</h3>
                  <p className="text-gray-600 text-sm">Your files are processed securely and automatically deleted after processing.</p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Tools</h3>
                  <p className="text-gray-600 text-sm">Access powerful PDF transformation tools used by professionals.</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-lg font-semibold"
              >
                <LogIn className="h-5 w-5" />
                <span>Get Started - Sign Up Free</span>
              </button>
              
              <p className="text-sm text-gray-500 mt-4">
                Free tier includes 5 transformations per month. No credit card required.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          // Optionally refresh the page or update state
        }}
      />

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
