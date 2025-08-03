import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase
const mockFirebase = {
  initializeApp: vi.fn(),
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}

vi.mock('firebase/app', () => ({
  initializeApp: mockFirebase.initializeApp,
}))

vi.mock('firebase/auth', () => ({
  getAuth: mockFirebase.getAuth,
  signInWithEmailAndPassword: mockFirebase.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockFirebase.createUserWithEmailAndPassword,
  signOut: mockFirebase.signOut,
  onAuthStateChanged: mockFirebase.getAuth().onAuthStateChanged,
  GoogleAuthProvider: mockFirebase.GoogleAuthProvider,
  signInWithPopup: mockFirebase.signInWithPopup,
}))

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: vi.fn(() => ({})),
    getInputProps: vi.fn(() => ({})),
    isDragActive: false,
  })),
}))

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: vi.fn(({ children }) => children),
  Page: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'pdf-page', children: 'PDF Page' } })),
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  },
}))

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:3001/api',
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-domain.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'test-bucket',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    VITE_FIREBASE_APP_ID: 'test-app-id',
  },
})

// Mock XMLHttpRequest for upload progress
global.XMLHttpRequest = class MockXMLHttpRequest {
  static readonly UNSENT = 0
  static readonly OPENED = 1
  static readonly HEADERS_RECEIVED = 2
  static readonly LOADING = 3
  static readonly DONE = 4

  readonly UNSENT = 0
  readonly OPENED = 1
  readonly HEADERS_RECEIVED = 2
  readonly LOADING = 3
  readonly DONE = 4

  upload = {
    addEventListener: vi.fn(),
  }
  addEventListener = vi.fn()
  open = vi.fn()
  send = vi.fn()
  responseText = ''
  status = 200
  timeout = 0
  abort = vi.fn()
  readyState = 0
  response = null
  responseType = '' as XMLHttpRequestResponseType
  setRequestHeader = vi.fn()
  getResponseHeader = vi.fn()
  getAllResponseHeaders = vi.fn()
  overrideMimeType = vi.fn()
  onreadystatechange = null
  ontimeout = null
  onerror = null
  onload = null
  onloadstart = null
  onloadend = null
  onabort = null
  onprogress = null
  withCredentials = false
  statusText = ''
  responseURL = ''
  responseXML = null
} as any as typeof XMLHttpRequest 