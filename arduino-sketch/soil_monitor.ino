/*
 * Arduino Soil Monitor with USB Communication
 * 
 * This sketch reads soil moisture sensors and temperature,
 * then sends the data to the desktop utility via USB serial.
 * It also listens for pump control commands.
 * 
 * Connections:
 * - Soil Sensor 1: A0
 * - Soil Sensor 2: A1  
 * - DHT22 Temperature: Digital Pin 2
 * - Water Pump Relay: Digital Pin 3
 * 
 * Baud Rate: 115200
 */

#include <DHT.h>

// Pin definitions
#define DHTPIN 2
#define DHTTYPE DHT22
#define PUMP_RELAY_PIN 3

// Sensor variables
DHT dht(DHTPIN, DHTTYPE);
int soilSensor1Pin = A0;
int soilSensor2Pin = A1;

// Calibration values (adjust based on your sensors)
const float MIN_MOISTURE = 0.0;    // Dry sensor value
const float MAX_MOISTURE = 1023.0; // Wet sensor value

// Pump control
bool pumpState = false;
bool pumpCommandReceived = false;
String pumpCommand = "";

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Set up pump relay pin
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  digitalWrite(PUMP_RELAY_PIN, LOW); // Start with pump off
  
  // Wait for serial to initialize
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("Arduino Soil Monitor Initialized");
  Serial.println("Waiting for commands...");
}

void loop() {
  // Check for incoming commands
  checkForCommands();
  
  // Read sensors
  float soilMoisture1 = readSoilMoisture(soilSensor1Pin);
  float soilMoisture2 = readSoilMoisture(soilSensor2Pin);
  float temperature = readTemperature();
  float humidity = readHumidity();
  
  // Control pump based on commands
  handlePumpControl();
  
  // Create JSON data packet
  String jsonData = createJSONData(soilMoisture1, soilMoisture2, temperature, humidity);
  
  // Send data to desktop utility
  Serial.println(jsonData);
  
  // Print to serial monitor for debugging
  Serial.print("Soil Moisture 1: ");
  Serial.print(soilMoisture1);
  Serial.print("%, Soil Moisture 2: ");
  Serial.print(soilMoisture2);
  Serial.print("%, Temp: ");
  Serial.print(temperature);
  Serial.print("°C, Humidity: ");
  Serial.print(humidity);
  Serial.println("%");
  
  // Wait before next reading
  delay(2000); // Read every 2 seconds
}

// Read soil moisture sensor and convert to percentage
float readSoilMoisture(int sensorPin) {
  int sensorValue = analogRead(sensorPin);
  // Convert to percentage (0-100%)
  // Note: Most soil sensors give lower values when wet, higher when dry
  // This formula assumes: 0 = dry, 1023 = wet
  float percentage = map(sensorValue, MIN_MOISTURE, MAX_MOISTURE, 100.0, 0.0);
  
  // Clamp values to 0-100%
  if (percentage < 0) percentage = 0;
  if (percentage > 100) percentage = 100;
  
  return percentage;
}

// Read temperature from DHT22
float readTemperature() {
  float temp = dht.readTemperature();
  
  // Check if reading failed
  if (isnan(temp)) {
    Serial.println("Failed to read temperature from DHT sensor");
    return -999; // Error value
  }
  
  return temp;
}

// Read humidity from DHT22
float readHumidity() {
  float humidity = dht.readHumidity();
  
  // Check if reading failed
  if (isnan(humidity)) {
    Serial.println("Failed to read humidity from DHT sensor");
    return -999; // Error value
  }
  
  return humidity;
}

// Create JSON formatted data string
String createJSONData(float soilMoisture1, float soilMoisture2, float temp, float humidity) {
  String json = "{";
  json += "\"soil_moisture_1\":" + String(soilMoisture1, 2) + ",";
  json += "\"soil_moisture_2\":" + String(soilMoisture2, 2) + ",";
  json += "\"temperature\":" + String(temp, 2) + ",";
  json += "\"humidity\":" + String(humidity, 2);
  json += "}";
  return json;
}

// Check for incoming serial commands
void checkForCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "PUMP_ON") {
      pumpCommand = "ON";
      pumpCommandReceived = true;
      Serial.println("PUMP_COMMAND_RECEIVED: ON");
    } else if (command == "PUMP_OFF") {
      pumpCommand = "OFF";
      pumpCommandReceived = true;
      Serial.println("PUMP_COMMAND_RECEIVED: OFF");
    } else {
      Serial.println("UNKNOWN_COMMAND: " + command);
    }
  }
}

// Handle pump control based on received commands
void handlePumpControl() {
  if (pumpCommandReceived) {
    if (pumpCommand == "ON") {
      digitalWrite(PUMP_RELAY_PIN, HIGH);
      pumpState = true;
      Serial.println("PUMP_STATUS: ON");
    } else if (pumpCommand == "OFF") {
      digitalWrite(PUMP_RELAY_PIN, LOW);
      pumpState = false;
      Serial.println("PUMP_STATUS: OFF");
    }
    
    pumpCommandReceived = false;
    pumpCommand = "";
  }
}