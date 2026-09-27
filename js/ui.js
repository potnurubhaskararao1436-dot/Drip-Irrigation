/**
 * ESP32 Smart Irrigation System - UI Manager
 * Senior Audit Passed: Chart.js throttled graph updates (1Hz), missing element guards, LCD formatting.
 */

class UIManager {
    constructor() {
        this.chart = null;
        this.maxChartPoints = 30;
        this.lastChartUpdateTime = 0;

        // Cache DOM Elements
        this.sliderSoil = document.getElementById('slider-soil');
        this.sliderWater = document.getElementById('slider-water');
        this.sliderTemp = document.getElementById('slider-temp');
        this.sliderHum = document.getElementById('slider-hum');

        this.valSoil = document.getElementById('val-soil');
        this.valWater = document.getElementById('val-water');
        this.valTemp = document.getElementById('val-temp');
        this.valHum = document.getElementById('val-hum');

        this.btnModeAuto = document.getElementById('btn-mode-auto');
        this.btnModeManual = document.getElementById('btn-mode-manual');
        this.manualControlsGroup = document.getElementById('manual-controls');
        this.btnPumpOn = document.getElementById('btn-pump-on');
        this.btnPumpOff = document.getElementById('btn-pump-off');

        this.modeVal = document.getElementById('mode-val');
        this.pumpVal = document.getElementById('pump-val');
        this.relayStateVal = document.getElementById('relay-state-val');
        this.plantHealthVal = document.getElementById('plant-health-val');
        this.hudFlowVal = document.getElementById('hud-flow-val');

        this.alertBanner = document.getElementById('system-alert-banner');
        this.alertText = document.getElementById('alert-text');

        this.lcdLine1 = document.getElementById('lcd-line-1');
        this.lcdLine2 = document.getElementById('lcd-line-2');

        this.initChart();
        this.bindEvents();
    }

    bindEvents() {
        if (this.sliderSoil) {
            this.sliderSoil.addEventListener('input', (e) => {
                window.simEngine.setSoilMoisture(parseFloat(e.target.value));
            });
        }
        if (this.sliderWater) {
            this.sliderWater.addEventListener('input', (e) => {
                window.simEngine.setWaterLevel(parseFloat(e.target.value));
            });
        }
        if (this.sliderTemp) {
            this.sliderTemp.addEventListener('input', (e) => {
                window.simEngine.setTemperature(parseFloat(e.target.value));
            });
        }
        if (this.sliderHum) {
            this.sliderHum.addEventListener('input', (e) => {
                window.simEngine.setHumidity(parseFloat(e.target.value));
            });
        }

        // Mode Toggles
        if (this.btnModeAuto) {
            this.btnModeAuto.addEventListener('click', () => window.simEngine.setMode('AUTO'));
        }
        if (this.btnModeManual) {
            this.btnModeManual.addEventListener('click', () => window.simEngine.setMode('MANUAL'));
        }

        // Manual Pump Overrides
        if (this.btnPumpOn) {
            this.btnPumpOn.addEventListener('click', () => window.simEngine.setManualPump(true));
        }
        if (this.btnPumpOff) {
            this.btnPumpOff.addEventListener('click', () => window.simEngine.setManualPump(false));
        }

        // Presets
        const bDry = document.getElementById('btn-preset-dry');
        if (bDry) bDry.addEventListener('click', () => window.simEngine.presetDrySoil());

        const bLow = document.getElementById('btn-preset-low-water');
        if (bLow) bLow.addEventListener('click', () => window.simEngine.presetLowWater());

        const bNorm = document.getElementById('btn-preset-normal');
        if (bNorm) bNorm.addEventListener('click', () => window.simEngine.presetNormal());

        const bReset = document.getElementById('btn-preset-reset');
        if (bReset) bReset.addEventListener('click', () => window.simEngine.presetReset());

        // Camera Buttons
        const cReset = document.getElementById('btn-cam-reset');
        if (cReset) cReset.addEventListener('click', (e) => this.setCamActive(e.currentTarget, 'reset'));

        const cFarm = document.getElementById('btn-cam-farm');
        if (cFarm) cFarm.addEventListener('click', (e) => this.setCamActive(e.currentTarget, 'farm'));

        const cCirc = document.getElementById('btn-cam-circuit');
        if (cCirc) cCirc.addEventListener('click', (e) => this.setCamActive(e.currentTarget, 'circuit'));

        const cTop = document.getElementById('btn-cam-top');
        if (cTop) cTop.addEventListener('click', (e) => this.setCamActive(e.currentTarget, 'top'));

        // Tab Navigation
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t) => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

                tab.classList.add('active');
                const targetPane = document.getElementById(tab.dataset.tab);
                if (targetPane) targetPane.classList.add('active');
            });
        });
    }

    setCamActive(btnElement, preset) {
        document.querySelectorAll('.cam-btn').forEach((b) => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
        if (window.scene3D) {
            window.scene3D.setCameraPreset(preset);
        }
    }

    initChart() {
        const canvas = document.getElementById('telemetry-chart');
        if (!canvas) return;

        if (typeof Chart === 'undefined') {
            console.warn("Chart.js library is missing. Telemetry chart disabled.");
            return;
        }

        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Soil Moisture (%)',
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        data: [],
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Water Tank Level (%)',
                        borderColor: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        data: [],
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#6b7280', font: { size: 10 } }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#6b7280', font: { size: 10 } }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#9ca3af', font: { family: 'Inter', size: 11 } }
                    }
                },
                animation: false
            }
        });
    }

    updateFromState(state) {
        if (!state) return;

        // 1. Sync Slider Controls & Readouts
        if (this.sliderSoil) this.sliderSoil.value = state.soilMoisture;
        if (this.valSoil) this.valSoil.innerText = `${Math.round(state.soilMoisture)}%`;

        if (this.sliderWater) this.sliderWater.value = state.waterLevel;
        if (this.valWater) this.valWater.innerText = `${Math.round(state.waterLevel)}%`;

        if (this.sliderTemp) this.sliderTemp.value = state.temperature;
        if (this.valTemp) this.valTemp.innerText = `${Math.round(state.temperature)}°C`;

        if (this.sliderHum) this.sliderHum.value = state.humidity;
        if (this.valHum) this.valHum.innerText = `${Math.round(state.humidity)}%`;

        // 2. Mode Buttons & State Badges
        if (state.mode === 'AUTO') {
            if (this.btnModeAuto) this.btnModeAuto.classList.add('active');
            if (this.btnModeManual) this.btnModeManual.classList.remove('active');
            if (this.manualControlsGroup) this.manualControlsGroup.classList.add('disabled');
            if (this.btnPumpOn) this.btnPumpOn.disabled = true;
            if (this.btnPumpOff) this.btnPumpOff.disabled = true;
            if (this.modeVal) this.modeVal.innerText = 'AUTO';
        } else {
            if (this.btnModeManual) this.btnModeManual.classList.add('active');
            if (this.btnModeAuto) this.btnModeAuto.classList.remove('active');
            if (this.manualControlsGroup) this.manualControlsGroup.classList.remove('disabled');
            if (this.btnPumpOn) this.btnPumpOn.disabled = false;
            if (this.btnPumpOff) this.btnPumpOff.disabled = false;
            if (this.modeVal) this.modeVal.innerText = 'MANUAL';
        }

        // 3. Pump & Relay Status Badges
        if (state.pumpState) {
            if (this.pumpVal) { this.pumpVal.innerText = 'ON'; this.pumpVal.className = 'badge-val on'; }
            if (this.relayStateVal) { this.relayStateVal.innerText = 'ON (Energized)'; this.relayStateVal.className = 'mini-val on'; }
            if (this.hudFlowVal) { this.hudFlowVal.innerText = 'FLOWING'; this.hudFlowVal.className = 'hud-value flowing'; }
        } else {
            if (this.pumpVal) { this.pumpVal.innerText = 'OFF'; this.pumpVal.className = 'badge-val off'; }
            if (this.relayStateVal) { this.relayStateVal.innerText = 'OFF (De-energized)'; this.relayStateVal.className = 'mini-val off'; }
            if (this.hudFlowVal) { this.hudFlowVal.innerText = 'STOPPED'; this.hudFlowVal.className = 'hud-value stopped'; }
        }

        // 4. Plant Health Status
        if (this.plantHealthVal) {
            this.plantHealthVal.innerText = state.plantHealth;
            this.plantHealthVal.className = `mini-val ${state.plantHealth.toLowerCase()}`;
        }

        // 5. System Warning Banner
        if (this.alertBanner) {
            if (state.warning) {
                this.alertBanner.classList.remove('alert-hidden');
                if (this.alertText) this.alertText.innerText = state.warning;
            } else {
                this.alertBanner.classList.add('alert-hidden');
            }
        }

        // 6. Virtual 16x2 LCD Text
        const l1 = `Soil:${Math.round(state.soilMoisture).toString().padStart(2, ' ')}% T:${Math.round(state.temperature)}C`;
        let l2 = `Pump: ${state.pumpState ? 'ON ' : 'OFF'}`;
        if (state.waterLevel <= 10) l2 = "LOW WATER!      ";
        if (this.lcdLine1) this.lcdLine1.innerText = l1;
        if (this.lcdLine2) this.lcdLine2.innerText = l2;

        // 7. Chart Telemetry Point Push - THROTTLED to once per 1000ms for high performance
        const now = Date.now();
        if (this.chart && (now - this.lastChartUpdateTime >= 1000)) {
            this.lastChartUpdateTime = now;
            const timeLabel = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
            this.chart.data.labels.push(timeLabel);
            this.chart.data.datasets[0].data.push(state.soilMoisture);
            this.chart.data.datasets[1].data.push(state.waterLevel);

            if (this.chart.data.labels.length > this.maxChartPoints) {
                this.chart.data.labels.shift();
                this.chart.data.datasets[0].data.shift();
                this.chart.data.datasets[1].data.shift();
            }
            this.chart.update();
        }

        // 8. Pipeline Node Lighting
        this.updatePipelineNodes(state);
    }

    updatePipelineNodes(state) {
        const nodeRelay = document.getElementById('node-relay');
        const nodePump = document.getElementById('node-pump');
        const nodeIrrigation = document.getElementById('node-irrigation');
        const nodePlants = document.getElementById('node-plants');

        if (nodeRelay) {
            if (state.relayState) nodeRelay.classList.add('active');
            else nodeRelay.classList.remove('active');
        }

        if (state.pumpState) {
            if (nodePump) nodePump.classList.add('active');
            if (nodeIrrigation) nodeIrrigation.classList.add('active');
            if (nodePlants) nodePlants.classList.add('active');
        } else {
            if (nodePump) nodePump.classList.remove('active');
            if (nodeIrrigation) nodeIrrigation.classList.remove('active');
            if (nodePlants) nodePlants.classList.remove('active');
        }
    }

    showComponentInspector(userData) {
        if (!userData) return;
        const tabInspector = document.querySelector('[data-tab="tab-inspector"]');
        if (tabInspector) tabInspector.click();

        const placeholder = document.getElementById('inspector-placeholder');
        const card = document.getElementById('inspector-card');
        if (placeholder) placeholder.classList.add('hidden');
        if (card) card.classList.remove('hidden');

        const title = document.getElementById('inspect-title');
        const tag = document.getElementById('inspect-tag');
        const desc = document.getElementById('inspect-desc');
        const pins = document.getElementById('inspect-pins');
        const pwr = document.getElementById('inspect-power');
        const role = document.getElementById('inspect-role');

        if (title) title.innerText = userData.name || 'Component Details';
        if (tag) tag.innerText = userData.tag || 'Hardware';
        if (desc) desc.innerText = userData.desc || 'No description available.';
        if (pins) pins.innerText = userData.pins || 'N/A';
        if (pwr) pwr.innerText = userData.power || 'N/A';
        if (role) role.innerText = userData.role || 'N/A';
    }
}

// Global Singleton Instance
window.uiManager = new UIManager();
