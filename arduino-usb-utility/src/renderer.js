// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const currentPort = document.getElementById('currentPort');
const currentBaudRate = document.getElementById('currentBaudRate');
const lastDataTime = document.getElementById('lastDataTime');

const portSelect = document.getElementById('portSelect');
const baudRateSelect = document.getElementById('baudRateSelect');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const refreshBtn = document.getElementById('refreshBtn');

const supabaseUrl = document.getElementById('supabaseUrl');
const supabaseKey = document.getElementById('supabaseKey');
const autoConnect = document.getElementById('autoConnect');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const testSupabaseBtn = document.getElementById('testSupabaseBtn');
const supabaseStatus = document.getElementById('supabaseStatus');

const sensor1Value = document.getElementById('sensor1Value');
const sensor2Value = document.getElementById('sensor2Value');
const tempValue = document.getElementById('tempValue');
const dataStatus = document.getElementById('dataStatus');
const dataLog = document.getElementById('dataLog');

const pumpOnBtn = document.getElementById('pumpOnBtn');
const pumpOffBtn = document.getElementById('pumpOffBtn');
const pumpStatus = document.getElementById('pumpStatus');

// State
let isConnected = false;
let lastDataReceived = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadConfiguration();
    updateConnectionStatus(false);
    updateDataStatus('Waiting for data');
    
    // Set up event listeners
    connectBtn.addEventListener('click', handleConnect);
    disconnectBtn.addEventListener('click', handleDisconnect);
    refreshBtn.addEventListener('click', refreshPorts);
    saveConfigBtn.addEventListener('click', saveConfiguration);
    testSupabaseBtn.addEventListener('click', testSupabaseConnection);
    
    pumpOnBtn.addEventListener('click', () => sendPumpCommand('on'));
    pumpOffBtn.addEventListener('click', () => sendPumpCommand('off'));

    // Set up IPC listeners
    window.electronAPI.onSerialStatus((event, status) => {
        isConnected = status.connected;
        updateConnectionStatus(status.connected);
        if (status.port) {
            currentPort.textContent = status.port;
        }
        if (status.error) {
            showNotification('Connection Error: ' + status.error, 'error');
        }
    });

    window.electronAPI.onSerialError((event, error) => {
        showNotification('Serial Error: ' + error, 'error');
        updateConnectionStatus(false);
    });

    window.electronAPI.onSensorData((event, data) => {
        updateSensorData(data);
        logData(data);
    });

    window.electronAPI.onPumpStatus((event, status) => {
        updatePumpStatus(status.state, true);
        showNotification('Pump command sent successfully', 'success');
    });

    window.electronAPI.onPumpError((event, error) => {
        updatePumpStatus('error', false);
        showNotification('Pump Error: ' + error, 'error');
    });

    // Load initial configuration
    refreshPorts();
});

// Connection Management
async function handleConnect() {
    const portPath = portSelect.value;
    const baudRate = parseInt(baudRateSelect.value);
    
    if (!portPath) {
        showNotification('Please select a USB port', 'warning');
        return;
    }

    updateConnectionStatus(false, 'Connecting...');
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;

    try {
        const success = await window.electronAPI.connectArduino(portPath, baudRate);
        if (success) {
            showNotification('Connected to Arduino successfully', 'success');
            currentBaudRate.textContent = baudRate.toString();
        } else {
            showNotification('Failed to connect to Arduino', 'error');
            updateConnectionStatus(false);
        }
    } catch (error) {
        showNotification('Connection failed: ' + error.message, 'error');
        updateConnectionStatus(false);
    } finally {
        connectBtn.disabled = false;
    }
}

async function handleDisconnect() {
    try {
        await window.electronAPI.disconnectArduino();
        showNotification('Disconnected from Arduino', 'info');
        updateConnectionStatus(false);
    } catch (error) {
        showNotification('Disconnect failed: ' + error.message, 'error');
    }
}

async function refreshPorts() {
    try {
        const ports = await window.electronAPI.getPorts();
        portSelect.innerHTML = '<option value="">Select a port...</option>';
        
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port.path;
            option.textContent = `${port.path} - ${port.manufacturer || 'Unknown'}`;
            portSelect.appendChild(option);
        });

        // Try to select previously used port
        const config = await window.electronAPI.getConfig();
        if (config.selectedPort) {
            portSelect.value = config.selectedPort;
        }

        showNotification(`Found ${ports.length} USB ports`, 'info');
    } catch (error) {
        showNotification('Failed to refresh ports: ' + error.message, 'error');
    }
}

// Configuration Management
async function loadConfiguration() {
    try {
        const config = await window.electronAPI.getConfig();
        supabaseUrl.value = config.supabaseUrl || '';
        supabaseKey.value = config.supabaseKey || '';
        baudRateSelect.value = config.baudRate || 115200;
        autoConnect.checked = config.autoConnect || false;
        
        if (config.supabaseUrl && config.supabaseKey) {
            updateSupabaseStatus(true);
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
    }
}

async function saveConfiguration() {
    const config = {
        supabaseUrl: supabaseUrl.value.trim(),
        supabaseKey: supabaseKey.value.trim(),
        baudRate: parseInt(baudRateSelect.value),
        autoConnect: autoConnect.checked,
        pumpControlEnabled: true
    };

    try {
        await window.electronAPI.saveConfig(config);
        showNotification('Configuration saved successfully', 'success');
        
        if (config.supabaseUrl && config.supabaseKey) {
            updateSupabaseStatus(true);
        }
    } catch (error) {
        showNotification('Failed to save configuration: ' + error.message, 'error');
    }
}

async function testSupabaseConnection() {
    try {
        const result = await window.electronAPI.testSupabase();
        if (result.success) {
            showNotification('Supabase connection successful', 'success');
            updateSupabaseStatus(true);
        } else {
            showNotification('Supabase connection failed: ' + result.error, 'error');
            updateSupabaseStatus(false);
        }
    } catch (error) {
        showNotification('Test failed: ' + error.message, 'error');
        updateSupabaseStatus(false);
    }
}

// Data Management
function updateSensorData(data) {
    sensor1Value.textContent = data.sensor1 !== null ? data.sensor1.toFixed(1) : '--';
    sensor2Value.textContent = data.sensor2 !== null ? data.sensor2.toFixed(1) : '--';
    tempValue.textContent = data.temperature !== null ? data.temperature.toFixed(1) : '--';
    
    lastDataReceived = new Date();
    lastDataTime.textContent = lastDataReceived.toLocaleTimeString();
    updateDataStatus('Receiving data');
}

function logData(data) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = new Date().toLocaleTimeString();
    
    const dataSpan = document.createElement('span');
    dataSpan.className = 'log-data';
    dataSpan.textContent = `Sensor1: ${data.sensor1 || '--'}%, Sensor2: ${data.sensor2 || '--'}%, Temp: ${data.temperature || '--'}°C`;
    
    entry.appendChild(time);
    entry.appendChild(dataSpan);
    dataLog.prepend(entry);
    
    // Limit log entries to 20
    const entries = dataLog.querySelectorAll('.log-entry');
    if (entries.length > 20) {
        entries[entries.length - 1].remove();
    }
}

function sendPumpCommand(state) {
    if (!isConnected) {
        showNotification('Not connected to Arduino', 'warning');
        return;
    }
    
    updatePumpStatus(state, null);
    window.electronAPI.sendPumpCommand(state);
}

// UI Updates
function updateConnectionStatus(connected, text = null) {
    isConnected = connected;
    if (connected) {
        connectionStatus.className = 'status-indicator connected';
        connectionStatus.querySelector('.status-text').textContent = text || 'Connected';
    } else {
        connectionStatus.className = 'status-indicator';
        connectionStatus.querySelector('.status-text').textContent = text || 'Disconnected';
    }
}

function updateSupabaseStatus(configured) {
    if (configured) {
        supabaseStatus.className = 'status-indicator configured';
        supabaseStatus.querySelector('.status-text').textContent = 'Configured';
    } else {
        supabaseStatus.className = 'status-indicator';
        supabaseStatus.querySelector('.status-text').textContent = 'Not configured';
    }
}

function updateDataStatus(status) {
    dataStatus.className = 'status-indicator ' + (status === 'Receiving data' ? 'success' : '');
    dataStatus.querySelector('.status-text').textContent = status;
}

function updatePumpStatus(state, success) {
    const statusText = success === true ? 'Command sent' : success === false ? 'Error' : 'Sending...';
    pumpStatus.className = 'status-indicator ' + (success === true ? 'success' : success === false ? 'error' : '');
    pumpStatus.querySelector('.status-text').textContent = statusText;
}

// Notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// CSS for notifications (add to styles.css)
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem 1.5rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.fade-out {
        transform: translateX(100%);
        opacity: 0;
    }
    
    .notification-info { border-left: 4px solid #3b82f6; }
    .notification-success { border-left: 4px solid #22c55e; }
    .notification-warning { border-left: 4px solid #f59e0b; }
    .notification-error { border-left: 4px solid #ef4444; }
`;
document.head.appendChild(style);