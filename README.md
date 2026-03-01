# Arduino Soil Monitor Dashboard

A complete IoT solution for monitoring soil moisture and controlling irrigation systems using Arduino Uno and Supabase.

## 🌱 System Overview

This project consists of two main components:

1. **Web Dashboard** - A React-based web application for monitoring and controlling your soil system
2. **Desktop USB Utility** - An Electron app that connects to your Arduino via USB and syncs data to Supabase

## 📋 Requirements

### Hardware
- Arduino Uno
- Soil moisture sensors (2x)
- DHT22 temperature sensor
- Water pump with relay module
- USB cable for Arduino connection

### Software
- Node.js (v18+)
- Arduino IDE
- Supabase account

## 🚀 Quick Start

### 1. Setup Supabase Database

1. Create a new project at [Supabase](https://supabase.com)
2. Run the SQL migrations from `supabase-migrations.sql`
3. Create an `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Setup Web Dashboard

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser and go to `http://localhost:5173`

### 3. Setup Desktop USB Utility

```bash
# Navigate to utility directory
cd arduino-usb-utility

# Install dependencies
npm install

# Start the utility
npm start
```

### 4. Upload Arduino Code

1. Open `arduino-sketch/soil_monitor.ino` in Arduino IDE
2. Install the DHT sensor library if needed
3. Upload to your Arduino Uno

### 5. Connect Everything

1. Open the Desktop USB Utility
2. Select your Arduino's USB port
3. Enter your Supabase credentials
4. Click "Connect"
5. Start monitoring your soil data!

## 📊 Features

### Web Dashboard
- ✅ Real-time sensor monitoring
- ✅ Historical data charts
- ✅ User authentication and profiles
- ✅ Data export to CSV
- ✅ Pump control interface
- ✅ Weather integration with 5-day forecast
- ✅ Responsive design

### Desktop USB Utility
- ✅ USB connection to Arduino
- ✅ Automatic data syncing to Supabase
- ✅ Pump command sending
- ✅ Configuration management
- ✅ Live sensor data display

### Arduino Integration
- ✅ Soil moisture monitoring (2 sensors)
- ✅ Temperature monitoring
- ✅ Pump control via relay
- ✅ JSON data output
- ✅ Command reception

## 🔧 Configuration

### Arduino Connections

```
Soil Sensor 1 → A0
Soil Sensor 2 → A1
DHT22 Temp    → Digital Pin 2
DHT22 Humidity → Digital Pin 2 (same pin as temp)
Pump Relay    → Digital Pin 3
```

### Calibration

Adjust these values in `arduino-sketch/soil_monitor.ino` based on your soil sensors:

```cpp
const float MIN_MOISTURE = 0.0;    // Dry sensor value
const float MAX_MOISTURE = 1023.0; // Wet sensor value
```

## 📱 Usage

### Web Dashboard
1. **Sign Up/Sign In** - Create an account to access the dashboard
2. **Monitor Sensors** - View real-time and historical data
3. **Control Pump** - Turn the water pump on/off remotely
4. **Export Data** - Download sensor data as CSV
5. **View Profile** - See your activity history

### Desktop USB Utility
1. **Connect to Arduino** - Select USB port and connect
2. **Configure Supabase** - Enter your database credentials
3. **Monitor Data** - Watch live sensor readings
4. **Control Pump** - Send commands directly to Arduino

## 🗄️ Database Schema

The system uses these tables in Supabase:

- `sensor_data` - Stores all sensor readings
- `connection_status` - Tracks connection state
- `pump_commands` - Logs pump control commands
- `profiles` - User profile information
- `user_history` - Complete audit trail of user actions

## 🛠️ Development

### Building the Desktop App

```bash
# Build for your platform
npm run build

# Create installers
npm run dist
```

### Adding New Sensors

1. Modify the Arduino sketch to read additional sensors
2. Update the JSON output format
3. The web dashboard will automatically display new data

## 🔒 Security

- All data is encrypted in transit
- User authentication required for dashboard access
- Supabase provides secure database access
- USB utility stores credentials locally only

## 🐛 Troubleshooting

### Common Issues

**Arduino not detected:**
- Check USB connection
- Try different USB ports
- Ensure Arduino drivers are installed

**Supabase connection failed:**
- Verify URL and API key
- Check internet connection
- Ensure tables are created

**No sensor data:**
- Check sensor wiring
- Verify sensor power supply
- Check calibration values

### Debug Mode

Enable debug logging in the desktop utility:
1. Open Developer Tools (F12)
2. Check Console tab for error messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the backend database
- [Electron](https://electronjs.org) for desktop app framework
- [React](https://reactjs.org) for the web interface
- [DHT sensor library](https://github.com/adafruit/DHT-sensor-library) for temperature reading

---

**Note:** This system requires both the web dashboard and desktop utility to function properly. The desktop utility handles USB communication while the web dashboard provides the user interface."# water-detector" 
