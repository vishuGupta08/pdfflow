/**
 * Integration Test Setup
 * This file contains setup and teardown logic for integration tests
 */

const { spawn } = require('child_process')
const path = require('path')

let serverProcess = null

// Global setup - start server if needed
beforeAll(async () => {
  console.log('🚀 Setting up integration test environment...')
  
  // Check if server is already running
  const isServerRunning = await checkServerHealth()
  
  if (!isServerRunning) {
    console.log('📦 Starting server for integration tests...')
    serverProcess = await startServer()
    
    // Wait for server to be ready
    await waitForServer()
  } else {
    console.log('✅ Server is already running')
  }
})

// Global teardown
afterAll(async () => {
  if (serverProcess) {
    console.log('🛑 Shutting down test server...')
    serverProcess.kill('SIGTERM')
    serverProcess = null
  }
})

// Helper function to check if server is running
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3001/health')
    return response.ok
  } catch (error) {
    return false
  }
}

// Helper function to start the server
async function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../../server')
    const server = spawn('npm', ['run', 'dev'], {
      cwd: serverPath,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test', PORT: '3001' }
    })
    
    server.stdout.on('data', (data) => {
      const output = data.toString()
      if (output.includes('server running on port')) {
        resolve(server)
      }
    })
    
    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString())
    })
    
    server.on('error', (error) => {
      reject(error)
    })
    
    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Server startup timeout'))
    }, 30000)
  })
}

// Helper function to wait for server to be ready
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:3001/health')
      if (response.ok) {
        console.log('✅ Server is ready for testing')
        return
      }
    } catch (error) {
      // Server not ready yet
    }
    
    // Wait 1 second before next attempt
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error('Server failed to become ready within timeout period')
}

module.exports = {
  checkServerHealth,
  startServer,
  waitForServer
} 