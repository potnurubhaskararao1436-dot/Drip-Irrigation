# ESP32 Smart Irrigation System - 3D Simulation

**Subtitle:** Automatic Soil Moisture Based Drip Irrigation

An interactive, real-time 3D simulation of an IoT-based Smart Irrigation System using an ESP32 microcontroller, WebGL (Three.js), and vanilla JavaScript.

---

## 🌟 Key Features

1. **Functional 3D Simulation**:
   - Interactive 3D smart farm scene with soil bed, 4 dynamic plant models, water tank, filter, 12V DC pump, main PVC pipe, branch lines, and 4 micro-drip emitters.
   - Realistic electronics panel showcasing ESP32 board, YI-69 Soil Moisture sensor, DHT22 climate sensor, Water Level sensor, 5V Relay module, 16x2 I2C LCD, and 5V/12V dual power supplies.
   - Real-time particle water droplet animation when pumping.
   - Dynamic plant leaf response: Plants droop and turn yellowish-brown when dry (< 35%), lifting up and turning vibrant green when watered.

2. **ESP32 Microcontroller Logic & Safety**:
   - **GPIO 34**: Soil Moisture Sensor (Analog Input)
   - **GPIO 4**: DHT22 Climate Sensor (Digital Data)
   - **GPIO 27**: Water Level Depth Sensor (Digital/Analog)
   - **GPIO 26**: 5V Relay Control Input
   - **GPIO 21 (SDA) / GPIO 22 (SCL)**: 16x2 I2C LCD Display
   - **Automatic Mode**:
     - `IF Soil Moisture < 40% AND Water Level > 10%` $\rightarrow$ Pump ON, Relay Energized.
     - `IF Soil Moisture >= 40%` $\rightarrow$ Pump OFF, Relay De-energized.
     - `IF Water Level <= 10%` $\rightarrow$ Pump OFF, Safety Warning `"LOW WATER LEVEL - PUMP OFF"`.
   - **Manual Mode**: Allows user pump toggle with safety override if tank level $\le 10\%$.

3. **Interactive Telemetry & Controls**:
   - Real-time Chart.js graph plotting Soil Moisture & Water Tank Level over time.
   - Live 16x2 dot-matrix green backlit digital LCD readout.
   - Data Flow Pipeline diagram highlighting active hardware channels.
   - Interactive 3D raycasting object selection with component specs inspector.
   - Preset buttons (`Simulate Dry Soil`, `Simulate Low Water`, `Simulate Normal`, `Reset All`).
   - Camera preset toolbar (`Reset View`, `Farm View`, `Circuit View`, `Top View`).

4. **12-Step Automated Demonstration ("RUN DEMO")**:
   - Guided step-by-step scenario displaying dry soil detection, pump startup, water flow, plant recovery, auto cutoff, and safety interlocks with onscreen commentary.

---

## 🚀 How to Run Locally

1. Launch a local web server (e.g. VS Code Live Server, `npx http-server`, or Python HTTP server):
   ```bash
   python -m http.server 8000
   ```
2. Open your browser and navigate to `http://localhost:8000`.

---

## 🛠 Circuit Pinout Table

| ESP32 Pin | Connected Component | Signal Type | Power |
| :--- | :--- | :--- | :--- |
| **GPIO 34** | Soil Moisture Sensor | Analog Input (AO) | 5V DC / GND |
| **GPIO 4** | DHT22 Sensor | Digital Input (DATA) | 5V DC / GND |
| **GPIO 27** | Water Level Sensor | Digital Input (DO) | 5V DC / GND |
| **GPIO 26** | 5V Relay Module | Digital Output (IN) | 5V DC / GND |
| **GPIO 21** | 16x2 I2C LCD | I2C Data (SDA) | 5V DC / GND |
| **GPIO 22** | 16x2 I2C LCD | I2C Clock (SCL) | 5V DC / GND |

*Note: The 12V DC Water Pump is powered by an independent 12V Power Supply routed through the Relay isolated contacts.*
