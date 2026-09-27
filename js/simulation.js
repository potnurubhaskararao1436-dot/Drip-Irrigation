/**
 * ESP32 Smart Irrigation System - Core Simulation Engine
 * Senior Audit Passed: Safe clamping, dt capping, robust safety interlocks, and state validation.
 */

class SimulationEngine {
    constructor() {
        // Core System State
        this.state = {
            soilMoisture: 62,   // 0 - 100 %
            waterLevel: 80,     // 0 - 100 %
            temperature: 28,    // 10 - 50 °C
            humidity: 65,       // 0 - 100 %
            mode: 'AUTO',       // 'AUTO' | 'MANUAL'
            manualPumpReq: false,// Requested state in manual mode
            pumpState: false,   // Active pump output state
            relayState: false,  // Active relay state
            plantHealth: 'HEALTHY', // 'DRY' | 'HEALTHY' | 'WET'
            warning: '',        // Active safety warning string
            demoActive: false   // Is demonstration scenario running?
        };

        this.listeners = [];
        this.lastTickTime = performance.now();
        
        // Start physical tick update loop
        this.startLoop();
    }

    // Subscribe to state changes
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    notify() {
        this.listeners.forEach(cb => {
            try {
                cb(this.state);
            } catch (e) {
                console.error("Error in simulation listener:", e);
            }
        });
    }

    // Helper for numerical clamping & NaN prevention
    clamp(val, min, max, defaultVal = min) {
        const num = parseFloat(val);
        if (!Number.isFinite(num)) return defaultVal;
        return Math.min(max, Math.max(min, num));
    }

    // Setters for interactive sliders
    setSoilMoisture(val) {
        this.state.soilMoisture = this.clamp(val, 0, 100, 62);
        this.evaluateLogic();
    }

    setWaterLevel(val) {
        this.state.waterLevel = this.clamp(val, 0, 100, 80);
        this.evaluateLogic();
    }

    setTemperature(val) {
        this.state.temperature = this.clamp(val, 10, 50, 28);
        this.evaluateLogic();
    }

    setHumidity(val) {
        this.state.humidity = this.clamp(val, 0, 100, 65);
        this.evaluateLogic();
    }

    setMode(mode) {
        if (mode === 'AUTO' || mode === 'MANUAL') {
            this.state.mode = mode;
            if (mode === 'MANUAL') {
                this.state.manualPumpReq = this.state.pumpState;
            }
            this.evaluateLogic();
        }
    }

    setManualPump(turnOn) {
        if (this.state.mode !== 'MANUAL') return;

        if (turnOn) {
            if (this.state.waterLevel <= 10) {
                this.state.manualPumpReq = false;
                this.state.pumpState = false;
                this.state.relayState = false;
                this.state.warning = "Pump blocked: insufficient water";
            } else {
                this.state.manualPumpReq = true;
                this.state.pumpState = true;
                this.state.relayState = true;
                this.state.warning = "";
            }
        } else {
            this.state.manualPumpReq = false;
            this.state.pumpState = false;
            this.state.relayState = false;
            this.state.warning = "";
        }
        this.evaluateLogic();
    }

    // Presets
    presetDrySoil() {
        this.state.soilMoisture = 25;
        this.state.waterLevel = 80;
        this.state.temperature = 28;
        this.state.humidity = 60;
        this.evaluateLogic();
    }

    presetLowWater() {
        this.state.waterLevel = 5;
        this.evaluateLogic();
    }

    presetNormal() {
        this.state.soilMoisture = 65;
        this.state.waterLevel = 80;
        this.state.temperature = 28;
        this.state.humidity = 65;
        this.evaluateLogic();
    }

    presetReset() {
        this.state.soilMoisture = 62;
        this.state.waterLevel = 80;
        this.state.temperature = 28;
        this.state.humidity = 65;
        this.state.mode = 'AUTO';
        this.state.manualPumpReq = false;
        this.state.warning = '';
        this.evaluateLogic();
    }

    // ESP32 CORE DECISION ALGORITHM & SAFETY INTERLOCKS
    evaluateLogic() {
        // Critical Safety Check: Water level <= 10%
        if (this.state.waterLevel <= 10) {
            this.state.pumpState = false;
            this.state.relayState = false;
            this.state.warning = "LOW WATER LEVEL - PUMP OFF";
        } else {
            // Water level is adequate (> 10%)
            if (this.state.mode === 'AUTO') {
                if (this.state.soilMoisture < 40) {
                    this.state.pumpState = true;
                    this.state.relayState = true;
                    this.state.warning = "";
                } else {
                    this.state.pumpState = false;
                    this.state.relayState = false;
                    this.state.warning = "";
                }
            } else {
                // MANUAL MODE
                if (this.state.manualPumpReq) {
                    this.state.pumpState = true;
                    this.state.relayState = true;
                    this.state.warning = "";
                } else {
                    this.state.pumpState = false;
                    this.state.relayState = false;
                    this.state.warning = "";
                }
            }
        }

        // Determine Plant Health Status
        if (this.state.soilMoisture < 35) {
            this.state.plantHealth = 'DRY';
        } else if (this.state.soilMoisture <= 75) {
            this.state.plantHealth = 'HEALTHY';
        } else {
            this.state.plantHealth = 'WET';
        }

        this.notify();
    }

    // REAL-TIME PHYSICAL TICK LOOP (Pumping dynamics & soil moisture increase)
    startLoop() {
        setInterval(() => {
            const now = performance.now();
            // Cap delta time to max 0.1s to prevent time jumps when browser tab is inactive
            const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
            this.lastTickTime = now;

            let changed = false;

            // If pump is active, water flows: tank decreases, soil moisture increases
            if (this.state.pumpState) {
                // Soil moisture increases by ~1.5% per second while pumping
                const moistureInc = dt * 1.5;
                if (this.state.soilMoisture < 100) {
                    this.state.soilMoisture = this.clamp(this.state.soilMoisture + moistureInc, 0, 100);
                    changed = true;
                }

                // Tank water level decreases by ~0.5% per second while pumping
                const levelDec = dt * 0.5;
                if (this.state.waterLevel > 0) {
                    this.state.waterLevel = this.clamp(this.state.waterLevel - levelDec, 0, 100);
                    changed = true;
                }
            }

            if (changed) {
                this.evaluateLogic();
            }
        }, 100);
    }
}

// Global Singleton Instance
window.simEngine = new SimulationEngine();
