import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { TransformationRuleForm } from './components/TransformationRuleForm'
import { PreviewPanel } from './components/PreviewPanel'
import { PDFPreview } from './components/PDFPreview'
import { PDFEditor, PDFEdit } from './components/PDFEditor'
import { AuthModal } from './components/AuthModal'
import FeedbackModal from './components/FeedbackModal'
import FloatingFeedbackButton from './components/FloatingFeedbackButton'
import { SEO, SEOConfigs } from './components/SEO'
import { transformPDF, editPDF, ApiService, TransformResult } from './services/api'
import { useAuth } from './contexts/AuthContext'
import type { TransformationRule, UploadedFile } from './types'
import { LogIn, LogOut, User, MessageSquare } from 'lucide-react'
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
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editResult, setEditResult] = useState<TransformResult | null>(null)
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Debug logging
  console.log('🏠 App render - User:', user ? `${user.email} (${user.uid})` : 'Not authenticated');
  console.log('⏳ App render - Loading:', loading);
  
  // Debug transform result and buttons
  if (transformResult) {
    console.log('📊 Current transform result:', transformResult);
    console.log('✅ Transform success:', transformResult.success);
    console.log('🎯 Should show buttons:', transformResult.success);
  }

  // Check if there's active work (uploaded file, transformations, or ongoing processes)
  const hasActiveWork = () => {
    return uploadedFile || 
           transformationRules.length > 0 || 
           isTransforming || 
           isUploading || 
           transformResult ||
           showEditor ||
           editResult;
  }

  // Handle PDFFlow logo/title click
  const handleLogoClick = () => {
    if (hasActiveWork()) {
      setShowRefreshConfirm(true);
    } else {
      // No active work, just refresh
      window.location.reload();
    }
  }

  // Handle confirmed refresh
  const handleConfirmRefresh = () => {
    setShowRefreshConfirm(false);
    window.location.reload();
  }

  // Handle cancel refresh
  const handleCancelRefresh = () => {
    setShowRefreshConfirm(false);
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
    setUploadError(null)
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
    console.log('🔍 Preview button clicked');
    if (transformResult?.previewId) {
      // Show transformed preview
      setCurrentStep('preview');
      setShowPreview(true);
    } else if (uploadedFile) {
      // Show live preview with current transformations
      setShowLivePreview(true);
    }
  }

  const handleClosePreview = () => {
    setShowPreview(false)
  }

  const handleCloseLivePreview = () => {
    setShowLivePreview(false)
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
    setShowEditor(false)
    setUploadError(null)
    setIsUploading(false)
  }

  const handleEditPDF = () => {
    setShowEditor(true)
  }

  const handleCloseEditor = () => {
    setShowEditor(false)
  }

  const handleSaveEdits = async (edits: PDFEdit[]) => {
    console.log('🔥 handleSaveEdits called with:', edits);
    
    if (!uploadedFile) {
      console.error('❌ No uploaded file found');
      return;
    }

    try {
      console.log('💾 Saving edits to PDF:', edits);
      
      // Save edits for downloading the edited PDF directly
      const result = await editPDF(uploadedFile.fileId, edits);
      
      console.log('📤 Edit API result:', result);
      
      if (result.success) {
        console.log('✅ PDF edited successfully!');
        setEditResult(result);
        
        // Also add edits as a transformation rule to preserve them in subsequent transformations
        const editRule: TransformationRule = {
          id: `edit_${Date.now()}`,
          type: 'edit_pdf',
          edits: edits
        };
        
        // Add edit rule at the beginning so edits are applied first
        setTransformationRules(prev => [editRule, ...prev]);
        setShowEditor(false);
      } else {
        console.error('❌ Failed to edit PDF:', result.error);
        alert(`Failed to edit PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error editing PDF:', error);
      alert(`Error editing PDF: ${error}`);
    }
  }

  const handleDownloadEditedPDF = () => {
    if (editResult?.downloadId) {
      console.log('⬇️ Downloading edited PDF - Download ID:', editResult.downloadId);
      const downloadUrl = ApiService.getDownloadUrl(editResult.downloadId)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = editResult.fileName || 'edited.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
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

  // Dynamic SEO configuration based on current state
  const getSEOConfig = () => {
    // If user is working with specific transformations, show relevant SEO
    if (transformationRules.length > 0) {
      const primaryTransformation = transformationRules[0]?.type
      
      switch (primaryTransformation) {
        case 'merge_pdfs':
          return SEOConfigs.merge
        case 'split_pdf':
          return SEOConfigs.split
        case 'compress':
          return SEOConfigs.compress
        case 'convert_to_word':
          return SEOConfigs.convert
        case 'add_watermark':
          return SEOConfigs.watermark
        default:
          return SEOConfigs.editor
      }
    }
    
    // If in editor mode
    if (showEditor) {
      return SEOConfigs.editor
    }
    
    // Default homepage SEO
    return SEOConfigs.homepage
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-teal-100 animate-gradient">
      <SEO {...getSEOConfig()} />
      
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/20 animate-fade-in-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-3 hover-scale transition-all duration-300 cursor-pointer group flex-shrink-0"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl animate-float">
                <span className="text-white font-bold text-sm">PDF</span>
              </div>
              <h1 className="text-xl font-bold text-gradient-primary whitespace-nowrap">PDF Clinic</h1>
            </button>
            
            {/* Progress Steps - Center positioned when authenticated */}
            {user && (
              <div className="hidden lg:flex items-center space-x-6 flex-1 justify-center max-w-md">
                {(['upload', 'configure', 'preview', 'download'] as Step[]).map((step, index) => {
                  const status = getStepStatus(step)
                  return (
                    <div key={step} className="flex items-center">
                      <div className={`flex items-center space-x-2 ${
                        status === 'current' ? 'text-primary-600' :
                        status === 'completed' ? 'text-success-600' :
                        'text-gray-400'
                      }`}>
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                          status === 'current' ? 'border-primary-600 bg-primary-50' :
                          status === 'completed' ? 'border-success-600 bg-success-50' :
                          'border-gray-300 bg-white'
                        }`}>
                          {status === 'completed' ? '✓' : index + 1}
                        </div>
                        <span className="text-sm font-medium capitalize whitespace-nowrap">{step}</span>
                      </div>
                      {index < 3 && (
                        <div className={`w-8 h-0.5 ml-3 flex-shrink-0 ${
                          status === 'completed' ? 'bg-success-300' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Right side - Auth/User info */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              {/* Feedback Button - Always visible */}
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="inline-flex items-center space-x-2 px-3 py-2 glass-dark hover:glass-strong rounded-xl transition-all duration-300 group hover-lift border border-white/20 hover:border-indigo-300"
                title="Share your feedback"
              >
                <div className="relative">
                  <MessageSquare className="h-4 w-4 text-gray-600 group-hover:text-indigo-600 transition-colors duration-300" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse opacity-80"></div>
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-600 transition-colors duration-300 hidden sm:inline">Feedback</span>
              </button>
              
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 glass-dark px-3 py-2 rounded-xl border border-white/20">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center animate-pulse-glow border border-indigo-200">
                      <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={signOut}
                    className="btn-ghost hover-lift flex items-center space-x-1"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-primary hover-glow flex items-center space-x-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
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
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 008-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
                  isUploading={isUploading}
                  uploadError={uploadError}
                  setIsUploading={setIsUploading}
                  setUploadError={setUploadError}
                />
              </div>

              {/* Edit PDF Button */}
              {uploadedFile && currentStep === 'configure' && (
                <div className="card card-hover animate-fade-in-up p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float border border-purple-200">
                      <svg className="h-8 w-8 text-gradient-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gradient-primary mb-3">
                      Edit Your PDF
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Add text, images, highlights, and annotations directly to your PDF before applying transformations.
                    </p>
                    <button
                      onClick={handleEditPDF}
                      className="btn-secondary hover-glow inline-flex items-center space-x-2"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Open PDF Editor</span>
                    </button>
                  </div>
                </div>
              )}

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
                <div className="card card-hover animate-scale-in p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow border-2 border-green-200">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gradient-primary mb-3">
                      Ready to Transform
                    </h3>
                    <p className="text-gray-600 mb-8 text-lg">
                      <span className="font-semibold text-green-600">{transformationRules.length}</span> transformation{transformationRules.length !== 1 ? 's' : ''} will be applied to your PDF
                    </p>
                    
                    <button
                      onClick={handleTransform}
                      disabled={isTransforming}
                      className="btn-primary btn-xl group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center">
                        {isTransforming ? (
                          <>
                            <svg className="animate-spin h-6 w-6 text-white mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing Magic...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Transform PDF</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview & Download Step */}
              {transformResult && (
                <div className={`transition-all duration-300 ${
                  currentStep === 'preview' ? 'opacity-100' : 'opacity-60'
                }`}>
                  <div className="card card-hover animate-scale-in p-6">
                    <div className="text-center">
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow border-2 ${
                        transformResult.success ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-200' : 'bg-gradient-to-br from-red-100 to-pink-100 border-red-200'
                      }`}>
                        {transformResult.success ? (
                          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-gradient-primary mb-3">
                        {transformResult.success ? 'Transformation Complete!' : 'Transformation Failed'}
                      </h3>
                      <p className="text-gray-600 mb-8 text-lg">
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
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                          <button
                            onClick={handlePreview}
                            className="btn-secondary hover-glow inline-flex items-center space-x-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Preview PDF</span>
                          </button>
                          <button
                            onClick={handleDownload}
                            className="btn-primary hover-glow inline-flex items-center space-x-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download PDF</span>
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

              {/* Download Edited PDF */}
              {editResult && editResult.success && (
                <div className="card card-hover animate-scale-in p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow border-2 border-emerald-200">
                      <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gradient-primary mb-3">
                      PDF Edited Successfully!
                    </h3>
                    <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                      Your PDF has been edited and is ready for download. You can also apply additional transformations below.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <button
                        onClick={handleDownloadEditedPDF}
                        className="btn-primary hover-glow inline-flex items-center space-x-2"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Download Edited PDF</span>
                      </button>
                      <button
                        onClick={() => {
                          if (editResult?.previewId) {
                            setTransformResult(editResult);
                            setShowPreview(true);
                          }
                        }}
                        className="btn-secondary hover-glow inline-flex items-center space-x-2"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Preview Edited PDF</span>
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
                uploadedFile={uploadedFile}
                onPreview={() => setShowLivePreview(true)}
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

      {/* PDF Preview Modal - Transformed Result */}
      {showPreview && transformResult?.previewId && (
        <PDFPreview
          fileId={transformResult.previewId}
          fileName={transformResult.fileName}
          onClose={handleClosePreview}
          onDownload={handleDownload}
        />
      )}

      {/* PDF Live Preview Modal - Current Transformations */}
      {showLivePreview && uploadedFile && (
        <PDFPreview
          fileId={uploadedFile.fileId}
          fileName={uploadedFile.originalName}
          onClose={handleCloseLivePreview}
          onDownload={handleDownload}
          transformations={transformationRules}
          showOriginal={transformationRules.length === 0}
        />
      )}

      {/* PDF Editor Modal */}
      {showEditor && uploadedFile && (
        <PDFEditor
          fileId={uploadedFile.fileId}
          fileName={uploadedFile.originalName}
          onSave={handleSaveEdits}
          onClose={handleCloseEditor}
        />
      )}

      {/* Refresh Confirmation Modal */}
      {showRefreshConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Refresh Page?</h3>
              
              <p className="text-gray-600 mb-6">
                You have an uploaded file or active transformation in progress. 
                Refreshing the page will reset your current work and you'll lose:
              </p>
              
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                <ul className="space-y-2 text-sm text-gray-700">
                  {uploadedFile && (
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      <span>Uploaded file: {uploadedFile.originalName}</span>
                    </li>
                  )}
                  {transformationRules.length > 0 && (
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      <span>{transformationRules.length} transformation{transformationRules.length > 1 ? 's' : ''} configured</span>
                    </li>
                  )}
                  {(isTransforming || isUploading) && (
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>Process in progress</span>
                    </li>
                  )}
                  {transformResult && (
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>Transformation results</span>
                    </li>
                  )}
                  {editResult && (
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>PDF editing results</span>
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelRefresh}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRefresh}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Refresh Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Floating Feedback Button */}
      <FloatingFeedbackButton
        onClick={() => setShowFeedbackModal(true)}
      />
    </div>
  )
}

export default App
