import { useState, useRef, useEffect } from 'react'
import { UploadCloud, File as FileIcon, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function TenderUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [reference, setReference] = useState('')
  const [organization, setOrganization] = useState('')
  const [deadline] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed'>('idle')
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState('')
  const [processingMessage, setProcessingMessage] = useState('')
  
  const [tenderId, setTenderId] = useState<number | null>(null)
  const [documentId, setDocumentId] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }
  
  const validateAndSetFile = (selectedFile: File) => {
    setError('')
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are supported.')
      return
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB.')
      return
    }
    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!title || !organization || !file) {
      setError('Please provide a title, organization, and select a file.')
      return
    }
    
    setError('')
    setStatus('uploading')
    setUploadProgress(10)
    
    try {
      // 1. Create tender
      const tenderRes = await api.post('/tenders/', {
        title,
        reference_number: reference || null,
        issuing_organization: organization,
        submission_deadline: deadline || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        description: 'Auto-uploaded'
      })
      
      const newTenderId = tenderRes.data.id
      setTenderId(newTenderId)
      setUploadProgress(40)
      
      // 2. Upload document
      const formData = new FormData()
      formData.append('file', file)
      
      const docRes = await api.post(`/tenders/${newTenderId}/documents`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
          setUploadProgress(40 + (percentCompleted * 0.6))
        }
      })
      
      setDocumentId(docRes.data.id)
      setUploadProgress(100)
      setStatus('uploaded')
      
      // Give a brief moment before switching to processing UI
      setTimeout(() => {
        setStatus('processing')
      }, 1500)
      
    } catch (err: any) {
      setStatus('failed')
      
      if (err.response) {
        console.error("API ERROR", err.response.status, err.response.data);
        const status = err.response.status;
        let detail = err.response.data?.detail || 'Document upload failed. Please try again.';
        if (Array.isArray(detail)) detail = JSON.stringify(detail);
        setError(`Upload failed | Status: ${status} | Detail: ${detail}`);
      } else if (err.request) {
        console.error("NETWORK ERROR", err.request);
        setError(`Network Error: Cannot reach backend at ${api.defaults.baseURL}`);
      } else {
        console.error("REQUEST SETUP ERROR", err.message);
        setError(`Upload failed | Setup Error: ${err.message}`);
      }
    }
  }
  
  // Polling for processing completion
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    
    if (status === 'processing' && tenderId && documentId) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/tenders/${tenderId}/documents/${documentId}/status`)
          const data = res.data
          
          setProcessingStage(data.stage)
          setProcessingProgress(data.progress)
          setProcessingMessage(data.message)
          
          if (data.status === 'Completed' || data.status === 'Analysis Available' || data.status === 'Ready' || data.stage === 'READY') {
            setStatus('completed')
            setProcessingProgress(100)
            if (fileInputRef.current) fileInputRef.current.value = ''
            clearInterval(interval)
          } else if (data.status === 'Failed' || data.status === 'Processing Failed' || data.stage === 'FAILED') {
            setStatus('failed')
            setError(`Processing failed during ${data.failed_stage || 'processing'}: ${data.message || 'Unknown error'}`)
            if (fileInputRef.current) fileInputRef.current.value = ''
            clearInterval(interval)
          }
        } catch (err) {
          console.error('Polling error', err)
        }
      }, 2000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, tenderId, documentId])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload New Tender</h1>
        <p className="text-muted text-sm mt-1">Upload tender documents to begin the intelligent analysis process.</p>
      </div>

      <div className="bg-surface border border-border rounded-lg shadow-sm p-6 space-y-6">
        
        {error && (
          <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tender Title *</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              placeholder="E.g. Development of AI System..."
              disabled={status !== 'idle' && status !== 'failed'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Reference Number</label>
              <input 
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                placeholder="E.g. TEN-2026-001"
                disabled={status !== 'idle' && status !== 'failed'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Issuing Organization *</label>
              <input 
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                placeholder="E.g. Ministry of Technology"
                disabled={status !== 'idle' && status !== 'failed'}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tender Documents *</label>
          
          {!file ? (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/30 rounded-lg p-10 flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <div className="p-4 bg-primary/10 rounded-full mb-3 text-primary">
                <UploadCloud size={32} />
              </div>
              <p className="font-medium text-lg">Click to upload or drag and drop</p>
              <p className="text-muted text-sm mt-1">Supported format: PDF (Max 50MB)</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="application/pdf"
                className="hidden" 
              />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4 flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <FileIcon size={24} />
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              {(status === 'idle' || status === 'failed') && (
                <button onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }} className="text-muted hover:text-danger p-1">
                  <X size={20} />
                </button>
              )}
            </div>
          )}
        </div>
        
        {(status !== 'idle' && status !== 'failed') && (
          <div className="space-y-6 pt-4 border-t border-border">
            
            {/* Upload Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium mb-1">
                <span className="flex items-center gap-2">
                  {status === 'uploading' && <><Loader2 size={16} className="animate-spin text-primary" /> Uploading PDF...</>}
                  {status !== 'uploading' && <><CheckCircle size={16} className="text-success" /> Document uploaded successfully</>}
                </span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Processing Progress */}
            {(status === 'processing' || status === 'completed') && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="flex items-center gap-2">
                    {status === 'processing' && <><Loader2 size={16} className="animate-spin text-primary" /> ⏳ Processing in background ({processingStage || 'QUEUED'})</>}
                    {status === 'completed' && <><CheckCircle size={16} className="text-success" /> Processing Complete & Ready for AI Analysis</>}
                  </span>
                  <span>{processingProgress}%</span>
                </div>
                {processingMessage && (
                  <p className="text-xs text-muted-foreground">{processingMessage}</p>
                )}
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                {status === 'processing' && (
                  <p className="text-xs text-muted-foreground mt-2">You can navigate away. Processing will continue in the background.</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button 
            type="button" 
            onClick={() => navigate('/tenders')}
            disabled={status === 'uploading'}
            className="px-4 py-2 border border-border rounded-md font-medium text-sm hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          
          {status === 'completed' && tenderId ? (
            <button 
              onClick={() => navigate(`/tenders/${tenderId}/summary`)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 flex items-center gap-2"
            >
              View Tender Summary
            </button>
          ) : (
            <button 
              onClick={handleUpload}
              disabled={status === 'uploading' || status === 'uploaded' || status === 'processing' || !file}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-70 flex items-center gap-2"
            >
              Upload & Process
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
