const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const Store = require('electron-store')
const path = require('path')
const SerialPort = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')
const { createClient } = require('@supabase/supabase-js')

// Initialize store for configuration
const store = new Store({
  defaults: {
    supabaseUrl: '',
    supabaseKey: '',
    selectedPort: '',
    baudRate: 115200,
    autoConnect: false,
    pumpControlEnabled: true
  }
})

let mainWindow
let serialPort = null
let parser = null
let isReading = false
let supabase = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.loadFile('index.html')
  
  // Open dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

// Initialize Supabase client
function initSupabase() {
  const url = store.get('supabaseUrl')
  const key = store.get('supabaseKey')
  
  if (url && key) {
    supabase = createClient(url, key)
    return true
  }
  return false
}

// Connect to Arduino
async function connectToArduino(portPath, baudRate) {
  try {
    if (serialPort && serialPort.isOpen) {
      await serialPort.close()
    }

    serialPort = new SerialPort({
      path: portPath,
      baudRate: baudRate,
      autoOpen: false
    })

    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }))

    serialPort.open()
    
    parser.on('data', handleSerialData)
    serialPort.on('error', handleSerialError)
    serialPort.on('close', handleSerialClose)

    isReading = true
    mainWindow.webContents.send('serial-status', { connected: true, port: portPath })
    
    return true
  } catch (error) {
    console.error('Failed to connect to Arduino:', error)
    mainWindow.webContents.send('serial-status', { connected: false, error: error.message })
    return false
  }
}

// Disconnect from Arduino
async function disconnectArduino() {
  try {
    if (serialPort && serialPort.isOpen) {
      await serialPort.close()
    }
    isReading = false
    mainWindow.webContents.send('serial-status', { connected: false })
  } catch (error) {
    console.error('Error disconnecting from Arduino:', error)
  }
}

// Handle incoming serial data
function handleSerialData(data) {
  try {
    const line = data.toString().trim()
    console.log('Received from Arduino:', line)

    // Parse JSON data from Arduino
    if (line.startsWith('{') && line.endsWith('}')) {
      const sensorData = JSON.parse(line)
      
      // Send data to renderer
      mainWindow.webContents.send('sensor-data', sensorData)
      
      // Save to Supabase if configured
      if (supabase) {
        saveSensorDataToSupabase(sensorData)
      }
    }
  } catch (error) {
    console.error('Error parsing serial data:', error)
  }
}

// Save sensor data to Supabase
async function saveSensorDataToSupabase(data) {
  try {
    const { error } = await supabase
      .from('sensor_data')
      .insert({
        sensor1: data.sensor1 || null,
        sensor2: data.sensor2 || null,
        temperature: data.temperature || null,
        timestamp: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving to Supabase:', error)
    }
  } catch (error) {
    console.error('Unexpected error saving to Supabase:', error)
  }
}

// Handle serial errors
function handleSerialError(error) {
  console.error('Serial port error:', error)
  mainWindow.webContents.send('serial-error', error.message)
}

// Handle serial port close
function handleSerialClose() {
  isReading = false
  mainWindow.webContents.send('serial-status', { connected: false })
}

// Send pump command to Arduino
function sendPumpCommand(state) {
  if (serialPort && serialPort.isOpen) {
    const command = state === 'on' ? 'PUMP_ON\n' : 'PUMP_OFF\n'
    serialPort.write(command, (err) => {
      if (err) {
        console.error('Error sending pump command:', err)
        mainWindow.webContents.send('pump-error', err.message)
      } else {
        console.log('Pump command sent:', state)
        mainWindow.webContents.send('pump-status', { state: state, success: true })
      }
    })
  } else {
    mainWindow.webContents.send('pump-error', 'Not connected to Arduino')
  }
}

// IPC handlers
ipcMain.handle('get-ports', async () => {
  try {
    const ports = await SerialPort.list()
    return ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer,
      pnpId: port.pnpId,
      vendorId: port.vendorId,
      productId: port.productId
    }))
  } catch (error) {
    console.error('Error getting ports:', error)
    return []
  }
})

ipcMain.handle('connect-arduino', async (event, portPath, baudRate) => {
  store.set('selectedPort', portPath)
  store.set('baudRate', baudRate)
  return await connectToArduino(portPath, baudRate)
})

ipcMain.handle('disconnect-arduino', async () => {
  await disconnectArduino()
})

ipcMain.handle('get-connection-status', () => {
  return {
    connected: serialPort && serialPort.isOpen,
    port: store.get('selectedPort'),
    baudRate: store.get('baudRate')
  }
})

ipcMain.handle('send-pump-command', (event, state) => {
  sendPumpCommand(state)
})

ipcMain.handle('save-config', (event, config) => {
  store.set('supabaseUrl', config.supabaseUrl)
  store.set('supabaseKey', config.supabaseKey)
  store.set('baudRate', config.baudRate)
  store.set('autoConnect', config.autoConnect)
  store.set('pumpControlEnabled', config.pumpControlEnabled)
  
  // Reinitialize Supabase if credentials changed
  if (config.supabaseUrl && config.supabaseKey) {
    initSupabase()
  }
})

ipcMain.handle('get-config', () => {
  return {
    supabaseUrl: store.get('supabaseUrl'),
    supabaseKey: store.get('supabaseKey'),
    selectedPort: store.get('selectedPort'),
    baudRate: store.get('baudRate'),
    autoConnect: store.get('autoConnect'),
    pumpControlEnabled: store.get('pumpControlEnabled')
  }
})

ipcMain.handle('test-supabase', async () => {
  if (!initSupabase()) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase.from('sensor_data').select('*').limit(1)
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, message: 'Supabase connection successful' }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Auto-connect on startup if configured
app.whenReady().then(() => {
  createWindow()

  // Check if auto-connect is enabled
  if (store.get('autoConnect') && store.get('selectedPort')) {
    setTimeout(() => {
      connectToArduino(store.get('selectedPort'), store.get('baudRate'))
    }, 1000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Graceful shutdown
app.on('before-quit', async () => {
  if (serialPort && serialPort.isOpen) {
    await serialPort.close()
  }
})