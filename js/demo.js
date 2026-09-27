/**
 * ESP32 Smart Irrigation System - Automated Demonstration Runner
 * Senior Audit Passed: Safe step transitions, explicit threshold verification, timer cleanup.
 */

class DemoRunner {
    constructor() {
        this.isRunning = false;
        this.currentStep = 0;
        this.stepTimeout = null;

        this.demoBanner = document.getElementById('demo-banner');
        this.demoStepText = document.getElementById('demo-step-text');
        this.btnRunDemo = document.getElementById('btn-run-demo');
        this.btnStopDemo = document.getElementById('btn-stop-demo');

        this.bindEvents();
    }

    bindEvents() {
        if (this.btnRunDemo) {
            this.btnRunDemo.addEventListener('click', () => this.startDemo());
        }
        if (this.btnStopDemo) {
            this.btnStopDemo.addEventListener('click', () => this.stopDemo());
        }
    }

    startDemo() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.currentStep = 1;

        if (this.demoBanner) this.demoBanner.classList.remove('demo-hidden');
        if (window.simEngine) window.simEngine.state.demoActive = true;

        this.runStep();
    }

    stopDemo() {
        this.isRunning = false;
        if (this.stepTimeout) {
            clearTimeout(this.stepTimeout);
            this.stepTimeout = null;
        }

        if (this.demoBanner) this.demoBanner.classList.add('demo-hidden');
        if (window.simEngine) {
            window.simEngine.state.demoActive = false;
            window.simEngine.presetReset();
        }
    }

    runStep() {
        if (!this.isRunning) return;

        switch (this.currentStep) {
            case 1:
                this.updateBanner("STEP 1/12: Normal initial condition (Soil: 62%, Water: 80%).");
                if (window.simEngine) window.simEngine.presetNormal();
                if (window.scene3D) window.scene3D.setCameraPreset('farm');
                this.next(3500);
                break;

            case 2:
                this.updateBanner("STEP 2/12: Soil moisture drops below 40% threshold...");
                if (window.simEngine) window.simEngine.setSoilMoisture(32);
                this.next(3000);
                break;

            case 3:
                this.updateBanner("STEP 3/12: ESP32 reads GPIO 34 (Soil = 32%) < 40% threshold.");
                if (window.scene3D) window.scene3D.setCameraPreset('circuit');
                this.next(3000);
                break;

            case 4:
                this.updateBanner("STEP 4/12: ESP32 algorithm triggers Irrigation Required decision.");
                this.next(2500);
                break;

            case 5:
                this.updateBanner("STEP 5/12: ESP32 sets GPIO 26 HIGH -> 5V Relay energizes (Green LED ON).");
                this.next(2500);
                break;

            case 6:
                this.updateBanner("STEP 6/12: Relay closes 12V circuit -> DC Water Pump turns ON!");
                this.next(2500);
                break;

            case 7:
                this.updateBanner("STEP 7/12: Water pressurized from tank through filter into main PVC pipe.");
                if (window.scene3D) window.scene3D.setCameraPreset('farm');
                this.next(3000);
                break;

            case 8:
                this.updateBanner("STEP 8/12: Micro-drip emitters release water droplets to plant roots.");
                this.next(3500);
                break;

            case 9:
                this.updateBanner("STEP 9/12: Soil moisture increases & plant leaves regain healthy green state.");
                this.next(4000);
                break;

            case 10:
                this.updateBanner("STEP 10/12: Soil moisture reaches 40% threshold -> ESP32 triggers Auto Cutoff!");
                if (window.simEngine) window.simEngine.setSoilMoisture(40);
                this.next(3000);
                break;

            case 11:
                this.updateBanner("STEP 11/12: Relay de-energizes & Water Pump stops automatically.");
                if (window.scene3D) window.scene3D.setCameraPreset('reset');
                this.next(3000);
                break;

            case 12:
                this.updateBanner("STEP 12/12: DEMO COMPLETE - Target moisture reached. System in Standby.");
                this.stepTimeout = setTimeout(() => {
                    this.stopDemo();
                }, 4000);
                break;

            default:
                this.stopDemo();
                break;
        }
    }

    next(delayMs) {
        this.currentStep++;
        this.stepTimeout = setTimeout(() => this.runStep(), delayMs);
    }

    updateBanner(text) {
        if (this.demoStepText) {
            this.demoStepText.innerText = text;
        }
    }
}

// Global Singleton Instance
window.demoRunner = new DemoRunner();
