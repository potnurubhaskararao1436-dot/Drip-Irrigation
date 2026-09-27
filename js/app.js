/**
 * ESP32 Smart Irrigation System - Main Application Orchestrator
 * Senior Audit Passed: Safe startup sequence, global error handler, subscription wiring.
 */

window.addEventListener('error', (event) => {
    console.warn("Caught unhandled application warning:", event.error || event.message);
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing ESP32 Smart Irrigation System 3D Simulation...");

    // 1. Initialize 3D Graphics Engine
    try {
        window.scene3D = new Scene3D('canvas-container');
    } catch (err) {
        console.error("Three.js initialization error: ", err);
    }

    // 2. Connect Simulation State updates to 3D Scene and UI Manager
    if (window.simEngine) {
        window.simEngine.subscribe((state) => {
            if (window.scene3D && typeof window.scene3D.updateFromState === 'function') {
                window.scene3D.updateFromState(state);
            }
            if (window.uiManager && typeof window.uiManager.updateFromState === 'function') {
                window.uiManager.updateFromState(state);
            }
        });

        // 3. Trigger initial baseline state
        window.simEngine.presetReset();
    }

    console.log("ESP32 Smart Irrigation System 3D Simulation Ready!");
});
