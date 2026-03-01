const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Serial port operations
  getPorts: () => ipcRenderer.invoke('get-ports'),
  connectArduino: (portPath, baudRate) => ipcRenderer.invoke('connect-arduino', portPath, baudRate),
  disconnectArduino: () => ipcRenderer.invoke('disconnect-arduino'),
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
  
  // Pump control
  sendPumpCommand: (state) => ipcRenderer.invoke('send-pump-command', state),
  
  // Configuration
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getConfig: () => ipcRenderer.invoke('get-config'),
  testSupabase: () => ipcRenderer.invoke('test-supabase'),
  
  // Event listeners
  onSerialStatus: (callback) => ipcRenderer.on('serial-status', callback),
  onSerialError: (callback) => ipcRenderer.on('serial-error', callback),
  onSensorData: (callback) => ipcRenderer.on('sensor-data', callback),
  onPumpStatus: (callback) => ipcRenderer.on('pump-status', callback),
  onPumpError: (callback) => ipcRenderer.on('pump-error', callback)
})