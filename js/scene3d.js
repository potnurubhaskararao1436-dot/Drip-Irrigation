/**
 * ESP32 Smart Irrigation System - 3D Graphics Engine (Three.js WebGL)
 * Senior Audit Passed: WebGL safety fallbacks, camera drag vs click differentiation, font load handling.
 */

class Scene3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        if (typeof THREE === 'undefined') {
            console.error("Three.js library is missing or failed to load!");
            this.container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-family:sans-serif;text-align:center;padding:20px;">
                    <div>
                        <h3>WebGL Engine Error</h3>
                        <p>Three.js library failed to load. Please check your internet connection or local assets.</p>
                    </div>
                </div>`;
            return;
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.mouseDownPos = { x: 0, y: 0 };

        // Object references for dynamic animation
        this.plants = [];
        this.waterMesh = null;
        this.waterParticles = null;
        this.pumpImpeller = null;
        this.relayLedGreen = null;
        this.esp32Led = null;
        this.lcdCanvas = null;
        this.lcdContext = null;
        this.lcdTexture = null;
        this.interactiveObjects = [];

        // Camera interpolation targets
        this.camTargetPos = new THREE.Vector3(12, 14, 18);
        this.camTargetLookAt = new THREE.Vector3(0, 2, 0);

        this.init();
    }

    init() {
        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.018);

        // 2. Camera Setup
        const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.copy(this.camTargetPos);

        // 3. Renderer Setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevents going below ground
        this.controls.minDistance = 3;
        this.controls.maxDistance = 45;
        this.controls.target.copy(this.camTargetLookAt);

        // 5. Lighting Setup
        this.setupLighting();

        // 6. Build 3D Models & Environment
        this.buildEnvironment();
        this.buildFarmAndPlants();
        this.buildWaterSystem();
        this.buildElectronicsPanel();
        this.createWaterParticleSystem();

        // 7. Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
        
        const dom = this.renderer.domElement;
        dom.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        dom.addEventListener('mousedown', (e) => {
            this.mouseDownPos = { x: e.clientX, y: e.clientY };
        });

        dom.addEventListener('mouseup', (e) => {
            const dx = Math.abs(e.clientX - this.mouseDownPos.x);
            const dy = Math.abs(e.clientY - this.mouseDownPos.y);
            // Differentiate click from camera drag (less than 6px movement)
            if (dx < 6 && dy < 6) {
                this.onMouseClick(e);
            }
        });

        // Re-render 3D LCD text when web fonts finish loading
        if (document.fonts) {
            document.fonts.ready.then(() => {
                this.updateLcd3DText("Soil: 62%  T:28C", "Pump: OFF");
            });
        }

        // 8. Animation Loop
        this.animate();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
        mainLight.position.set(15, 25, 15);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 60;
        mainLight.shadow.camera.left = -15;
        mainLight.shadow.camera.right = 15;
        mainLight.shadow.camera.top = 15;
        mainLight.shadow.camera.bottom = -15;
        this.scene.add(mainLight);

        // Soft blue fill light for farm aesthetic
        const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
    }

    buildEnvironment() {
        // Main Ground Base Platform
        const groundGeo = new THREE.BoxGeometry(32, 0.6, 22);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = -0.3;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid overlay
        const gridHelper = new THREE.GridHelper(32, 32, 0x38bdf8, 0x334155);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
    }

    buildFarmAndPlants() {
        // Garden Soil Bed
        const soilGeo = new THREE.BoxGeometry(16, 0.4, 6);
        const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.95 });
        const soilBed = new THREE.Mesh(soilGeo, soilMat);
        soilBed.position.set(-4, 0.2, 3);
        soilBed.castShadow = true;
        soilBed.receiveShadow = true;
        this.scene.add(soilBed);

        // Soil border frame
        const borderGeo = new THREE.BoxGeometry(16.4, 0.5, 6.4);
        const borderMat = new THREE.MeshStandardMaterial({ color: 0x52301c, roughness: 0.7 });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.set(-4, 0.15, 3);
        this.scene.add(border);

        // 4 Plants spaced along the soil bed
        const plantPositions = [-10, -6, -2, 2];
        
        plantPositions.forEach((posX, idx) => {
            const plantGroup = new THREE.Group();
            plantGroup.position.set(posX, 0.4, 3);

            // Soil mound
            const moundGeo = new THREE.ConeGeometry(0.8, 0.3, 12);
            const moundMat = new THREE.MeshStandardMaterial({ color: 0x27150a, roughness: 0.9 });
            const mound = new THREE.Mesh(moundGeo, moundMat);
            mound.position.y = 0.15;
            plantGroup.add(mound);

            // Stem
            const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8);
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.75;
            stem.castShadow = true;
            plantGroup.add(stem);

            // Leaves (4 leaves per plant)
            const leaves = [];
            const leafAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            
            leafAngles.forEach((ang) => {
                const leafGroup = new THREE.Group();
                leafGroup.position.set(0, 1.1, 0);
                leafGroup.rotation.y = ang;

                // Leaf geometry (stretched sphere)
                const leafGeo = new THREE.SphereGeometry(0.4, 8, 8);
                leafGeo.scale(1, 0.1, 2);
                leafGeo.translate(0, 0, 0.4);

                const leafMat = new THREE.MeshStandardMaterial({
                    color: 0x16a34a,
                    roughness: 0.4
                });
                const leafMesh = new THREE.Mesh(leafGeo, leafMat);
                leafMesh.castShadow = true;
                leafGroup.add(leafMesh);

                plantGroup.add(leafGroup);
                leaves.push(leafGroup);
                leaves[leaves.length - 1].mesh = leafMesh;
            });

            this.scene.add(plantGroup);

            // Register plant object reference for moisture morphing
            this.plants.push({
                group: plantGroup,
                stem: stem,
                leaves: leaves
            });

            // Make plant interactive
            plantGroup.userData = {
                name: `Plant #${idx + 1}`,
                tag: "Crop / Crop Soil",
                desc: "Soil moisture and water status directly affect leaf rigidity and green color saturation.",
                pins: "Monitored by Soil Moisture Sensor AO (GPIO 34)",
                power: "N/A",
                role: "Agricultural Target for Drip Irrigation"
            };
            this.registerInteractive(plantGroup);
        });
    }

    buildWaterSystem() {
        // 1. Water Tank Cylinder
        const tankGroup = new THREE.Group();
        tankGroup.position.set(-13, 0, -5);

        // Transparent acrylic wall
        const tankGeo = new THREE.CylinderGeometry(1.6, 1.6, 4.5, 32, 1, true);
        const tankMat = new THREE.MeshPhysicalMaterial({
            color: 0xe2e8f0,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 0.5
        });
        const tankMesh = new THREE.Mesh(tankGeo, tankMat);
        tankMesh.position.y = 2.25;
        tankGroup.add(tankMesh);

        // Tank Base & Lid
        const capGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.2, 32);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });
        const tankBase = new THREE.Mesh(capGeo, capMat);
        tankBase.position.y = 0.1;
        tankBase.castShadow = true;
        tankGroup.add(tankBase);

        const tankLid = new THREE.Mesh(capGeo, capMat);
        tankLid.position.y = 4.5;
        tankGroup.add(tankLid);

        // Dynamic Water Volume Cylinder
        const waterGeo = new THREE.CylinderGeometry(1.52, 1.52, 4.0, 32);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1
        });
        this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
        this.waterMesh.position.y = 2.1;
        tankGroup.add(this.waterMesh);

        tankGroup.userData = {
            name: "Water Storage Tank (12L)",
            tag: "Water Supply Unit",
            desc: "Holds reserve water for the drip irrigation system. Monitored by depth level sensor.",
            pins: "Level Sensor attached to GPIO 27",
            power: "Passive Container",
            role: "Primary Water Source"
        };
        this.scene.add(tankGroup);
        this.registerInteractive(tankGroup);

        // 2. Water Filter Unit
        const filterGroup = new THREE.Group();
        filterGroup.position.set(-9, 0, -5);

        const filterBodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
        const filterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
        const filterBody = new THREE.Mesh(filterBodyGeo, filterMat);
        filterBody.position.y = 1.0;
        filterGroup.add(filterBody);

        const filterTopGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16);
        const filterTopMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
        const filterTop = new THREE.Mesh(filterTopGeo, filterTopMat);
        filterTop.position.y = 2.0;
        filterGroup.add(filterTop);

        filterGroup.userData = {
            name: "In-line Water Filter",
            tag: "Filtration Unit",
            desc: "Removes particulate matter from tank water before reaching pump and drip emitters.",
            pins: "Mechanical Filter",
            power: "Passive",
            role: "Prevents Drip Emitter Clogging"
        };
        this.scene.add(filterGroup);
        this.registerInteractive(filterGroup);

        // 3. 12V DC Water Pump Unit
        const pumpGroup = new THREE.Group();
        pumpGroup.position.set(-5, 0, -5);

        // Motor Housing
        const motorGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.6, 24);
        motorGeo.rotateZ(Math.PI / 2);
        const motorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
        const motor = new THREE.Mesh(motorGeo, motorMat);
        motor.position.set(0, 0.8, 0);
        motor.castShadow = true;
        pumpGroup.add(motor);

        // Pump Head Chamber
        const headGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.8, 24);
        headGeo.rotateZ(Math.PI / 2);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(1.1, 0.8, 0);
        pumpGroup.add(head);

        // Impeller Visual
        const impellerGeo = new THREE.BoxGeometry(0.1, 0.6, 0.6);
        const impellerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
        this.pumpImpeller = new THREE.Mesh(impellerGeo, impellerMat);
        this.pumpImpeller.position.set(1.5, 0.8, 0);
        pumpGroup.add(this.pumpImpeller);

        pumpGroup.userData = {
            name: "12V DC Submersible Water Pump",
            tag: "Actuator / Hydraulic Pump",
            desc: "Controlled by ESP32 via 5V Relay module. Pressurizes water into main PVC line.",
            pins: "Power driven via Relay Switch (Controlled by GPIO 26)",
            power: "12V DC External Supply",
            role: "Main Water Delivery Actuator"
        };
        this.scene.add(pumpGroup);
        this.registerInteractive(pumpGroup);

        // 4. Piping System
        this.buildPipes();
    }

    buildPipes() {
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
        const pipeRadius = 0.12;

        // Pipe 1: Tank to Filter
        const p1Geo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 2.4, 12);
        p1Geo.rotateZ(Math.PI / 2);
        const p1 = new THREE.Mesh(p1Geo, pipeMat);
        p1.position.set(-11, 0.8, -5);
        this.scene.add(p1);

        // Pipe 2: Filter to Pump
        const p2Geo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 3.2, 12);
        p2Geo.rotateZ(Math.PI / 2);
        const p2 = new THREE.Mesh(p2Geo, pipeMat);
        p2.position.set(-7, 0.8, -5);
        this.scene.add(p2);

        // Pipe 3: Pump up and across to Garden Bed Main Line
        const path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-3.5, 0.8, -5),
            new THREE.Vector3(-3.5, 2.2, -5),
            new THREE.Vector3(-11.5, 2.2, 3),
            new THREE.Vector3(3.5, 2.2, 3)
        ]);
        const tubeGeo = new THREE.TubeGeometry(path, 64, pipeRadius, 12, false);
        const mainPipe = new THREE.Mesh(tubeGeo, pipeMat);
        this.scene.add(mainPipe);

        // 4 Drip Branch Pipes dropping down to plants
        const plantXPos = [-10, -6, -2, 2];
        plantXPos.forEach((px) => {
            const branchGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12);
            const branch = new THREE.Mesh(branchGeo, pipeMat);
            branch.position.set(px, 1.8, 3);
            this.scene.add(branch);

            // Drip Emitter Head
            const emitterGeo = new THREE.ConeGeometry(0.12, 0.2, 12);
            const emitterMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
            const emitter = new THREE.Mesh(emitterGeo, emitterMat);
            emitter.position.set(px, 1.35, 3);
            emitter.rotation.x = Math.PI;
            this.scene.add(emitter);
        });
    }

    buildElectronicsPanel() {
        const panelGroup = new THREE.Group();
        panelGroup.position.set(10, 2.5, -1);
        panelGroup.rotation.x = -Math.PI / 6;

        const boardGeo = new THREE.BoxGeometry(10, 7, 0.4);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.castShadow = true;
        panelGroup.add(board);

        const frameGeo = new THREE.BoxGeometry(10.3, 7.3, 0.3);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.z = -0.1;
        panelGroup.add(frame);

        // 1. ESP32 Development Board Model
        const esp32Group = new THREE.Group();
        esp32Group.position.set(-2.5, 1.0, 0.4);

        const espPcbGeo = new THREE.BoxGeometry(2.4, 3.8, 0.15);
        const espPcbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
        const espPcb = new THREE.Mesh(espPcbGeo, espPcbMat);
        esp32Group.add(espPcb);

        const chipGeo = new THREE.BoxGeometry(1.2, 1.4, 0.12);
        const chipMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.set(0, 0.6, 0.12);
        esp32Group.add(chip);

        const pinStripGeo = new THREE.BoxGeometry(0.2, 3.4, 0.3);
        const pinMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
        const leftPins = new THREE.Mesh(pinStripGeo, pinMat);
        leftPins.position.set(-1.0, 0, 0.15);
        const rightPins = new THREE.Mesh(pinStripGeo, pinMat);
        rightPins.position.set(1.0, 0, 0.15);
        esp32Group.add(leftPins);
        esp32Group.add(rightPins);

        const ledGeo = new THREE.SphereGeometry(0.1, 12, 12);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        this.esp32Led = new THREE.Mesh(ledGeo, ledMat);
        this.esp32Led.position.set(-0.6, -1.2, 0.15);
        esp32Group.add(this.esp32Led);

        esp32Group.userData = {
            name: "ESP32 Wi-Fi / BT Microcontroller",
            tag: "Main Processing Unit",
            desc: "Executes control logic, samples sensors via ADC, and toggles relay.",
            pins: "GPIO 34 (Soil), GPIO 4 (DHT22), GPIO 27 (Water), GPIO 26 (Relay), GPIO 21/22 (I2C LCD)",
            power: "5V DC via Micro-USB",
            role: "System Brain & Decision Logic Engine"
        };
        panelGroup.add(esp32Group);
        this.registerInteractive(esp32Group);

        // 2. 5V Relay Module Model
        const relayGroup = new THREE.Group();
        relayGroup.position.set(2.5, 1.5, 0.4);

        const relayPcbGeo = new THREE.BoxGeometry(2.0, 2.2, 0.15);
        const relayPcbMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
        const relayPcb = new THREE.Mesh(relayPcbGeo, relayPcbMat);
        relayGroup.add(relayPcb);

        const boxGeo = new THREE.BoxGeometry(1.4, 1.2, 0.8);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
        const relayBox = new THREE.Mesh(boxGeo, boxMat);
        relayBox.position.set(0, 0.2, 0.45);
        relayGroup.add(relayBox);

        const ledPowerGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const ledPowerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const ledPower = new THREE.Mesh(ledPowerGeo, ledPowerMat);
        ledPower.position.set(-0.6, -0.6, 0.15);
        relayGroup.add(ledPower);

        const ledGreenGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
        this.relayLedGreen = new THREE.Mesh(ledGreenGeo, ledGreenMat);
        this.relayLedGreen.position.set(0.6, -0.6, 0.15);
        relayGroup.add(this.relayLedGreen);

        relayGroup.userData = {
            name: "5V Single Channel Relay Module",
            tag: "Electromechanical Switch",
            desc: "Optocoupler isolated relay that switches 12V high-current circuit to the water pump.",
            pins: "IN connected to ESP32 GPIO 26",
            power: "5V VCC / GND",
            role: "Galvanic Isolation & Pump Power Control"
        };
        panelGroup.add(relayGroup);
        this.registerInteractive(relayGroup);

        // 3. DHT22 Sensor
        const dhtGroup = new THREE.Group();
        dhtGroup.position.set(2.5, -1.5, 0.4);

        const dhtCaseGeo = new THREE.BoxGeometry(1.2, 1.6, 0.4);
        const dhtCaseMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
        const dhtCase = new THREE.Mesh(dhtCaseGeo, dhtCaseMat);
        dhtGroup.add(dhtCase);

        dhtGroup.userData = {
            name: "DHT22 Climate Sensor",
            tag: "Digital Sensor",
            desc: "Measures ambient temperature and humidity for micro-climate analysis.",
            pins: "DATA connected to ESP32 GPIO 4",
            power: "5V DC / GND",
            role: "Environmental Telemetry"
        };
        panelGroup.add(dhtGroup);
        this.registerInteractive(dhtGroup);

        // 4. 16x2 LCD Module
        this.build3DLcd(panelGroup);

        // 5. Dual Power Supplies
        this.buildPowerSupplies(panelGroup);

        this.scene.add(panelGroup);

        // 6. Soil Moisture Sensor Probe
        this.buildSoilMoistureProbe();

        // 7. Water Level Sensor Probe
        this.buildWaterLevelSensor();

        // 8. Wires
        this.build3DWiring(panelGroup);
    }

    build3DLcd(parentGroup) {
        const lcdGroup = new THREE.Group();
        lcdGroup.position.set(-2.5, -2.0, 0.4);

        const lcdPcbGeo = new THREE.BoxGeometry(4.0, 1.8, 0.15);
        const lcdPcbMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
        const lcdPcb = new THREE.Mesh(lcdPcbGeo, lcdPcbMat);
        lcdGroup.add(lcdPcb);

        this.lcdCanvas = document.createElement('canvas');
        this.lcdCanvas.width = 512;
        this.lcdCanvas.height = 128;
        this.lcdContext = this.lcdCanvas.getContext('2d');

        this.lcdTexture = new THREE.CanvasTexture(this.lcdCanvas);
        const lcdScreenGeo = new THREE.PlaneGeometry(3.6, 1.4);
        const lcdScreenMat = new THREE.MeshBasicMaterial({ map: this.lcdTexture });
        const lcdScreen = new THREE.Mesh(lcdScreenGeo, lcdScreenMat);
        lcdScreen.position.z = 0.12;
        lcdGroup.add(lcdScreen);

        this.updateLcd3DText("Soil: 62%  T:28C", "Pump: OFF");

        lcdGroup.userData = {
            name: "16x2 I2C LCD Display Module",
            tag: "Human-Machine Interface",
            desc: "Displays real-time soil moisture %, ambient temperature, and pump status.",
            pins: "SDA -> GPIO 21, SCL -> GPIO 22",
            power: "5V DC / GND",
            role: "Local Hardware Telemetry Readout"
        };
        parentGroup.add(lcdGroup);
        this.registerInteractive(lcdGroup);
    }

    updateLcd3DText(line1, line2) {
        if (!this.lcdContext) return;

        this.lcdContext.fillStyle = '#143812';
        this.lcdContext.fillRect(0, 0, 512, 128);

        this.lcdContext.fillStyle = '#39ff14';
        this.lcdContext.font = 'bold 44px VT323, monospace';
        this.lcdContext.shadowColor = '#39ff14';
        this.lcdContext.shadowBlur = 8;

        this.lcdContext.fillText(line1 || "", 20, 52);
        this.lcdContext.fillText(line2 || "", 20, 106);

        if (this.lcdTexture) this.lcdTexture.needsUpdate = true;
    }

    buildPowerSupplies(parentGroup) {
        const pwr5vGroup = new THREE.Group();
        pwr5vGroup.position.set(-0.2, 2.5, 0.4);

        const pwr5vGeo = new THREE.BoxGeometry(1.6, 1.2, 0.5);
        const pwr5vMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 });
        const pwr5v = new THREE.Mesh(pwr5vGeo, pwr5vMat);
        pwr5vGroup.add(pwr5v);

        pwr5vGroup.userData = {
            name: "5V DC Power Supply",
            tag: "Control Logic Power Source",
            desc: "Provides regulated 5V DC power to ESP32, sensors, LCD display, and relay logic.",
            pins: "VCC / GND outputs to 5V Rail",
            power: "Input: 220V AC, Output: 5V DC 2A",
            role: "Low-Voltage Circuit Power"
        };
        parentGroup.add(pwr5vGroup);
        this.registerInteractive(pwr5vGroup);

        const pwr12vGroup = new THREE.Group();
        pwr12vGroup.position.set(0.2, -2.5, 0.4);

        const pwr12vGeo = new THREE.BoxGeometry(1.6, 1.2, 0.5);
        const pwr12vMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5 });
        const pwr12v = new THREE.Mesh(pwr12vGeo, pwr12vMat);
        pwr12vGroup.add(pwr12v);

        pwr12vGroup.userData = {
            name: "12V DC Pump Power Supply",
            tag: "Actuator Power Source",
            desc: "High-current 12V DC power supply isolated from ESP32, routed through Relay contacts to Pump.",
            pins: "Connected to Relay COM terminal",
            power: "Input: 220V AC, Output: 12V DC 3A",
            role: "High-Power Water Pump Power"
        };
        parentGroup.add(pwr12vGroup);
        this.registerInteractive(pwr12vGroup);
    }

    buildSoilMoistureProbe() {
        const probeGroup = new THREE.Group();
        probeGroup.position.set(-10, 0.6, 3);

        const probeGeo = new THREE.BoxGeometry(0.3, 0.9, 0.08);
        const probeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
        const probe = new THREE.Mesh(probeGeo, probeMat);
        probeGroup.add(probe);

        const connGeo = new THREE.BoxGeometry(0.4, 0.4, 0.2);
        const connMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
        const conn = new THREE.Mesh(connGeo, connMat);
        conn.position.y = 0.5;
        probeGroup.add(conn);

        probeGroup.userData = {
            name: "YI-69 Soil Moisture Sensor Probe",
            tag: "Analog Probe Sensor",
            desc: "Measures soil dielectric permittivity (volumetric water content) in Plant 1 root zone.",
            pins: "AO connected to ESP32 GPIO 34",
            power: "5V DC / GND",
            role: "Primary Moisture Detection Input"
        };
        this.scene.add(probeGroup);
        this.registerInteractive(probeGroup);
    }

    buildWaterLevelSensor() {
        const levelGroup = new THREE.Group();
        levelGroup.position.set(-13, 2.5, -5);

        const levelGeo = new THREE.BoxGeometry(0.4, 3.2, 0.08);
        const levelMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.7 });
        const levelSensor = new THREE.Mesh(levelGeo, levelMat);
        levelGroup.add(levelSensor);

        levelGroup.userData = {
            name: "Submersible Water Level Depth Sensor",
            tag: "Resistive Depth Sensor",
            desc: "Measures water depth inside tank to prevent pump dry-run damage.",
            pins: "DO connected to ESP32 GPIO 27",
            power: "5V DC / GND",
            role: "Tank Reserve Safety Sensor"
        };
        this.scene.add(levelGroup);
        this.registerInteractive(levelGroup);
    }

    build3DWiring(panelGroup) {
        const wireRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const wireBlueMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const wireYellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

        const createWire = (p1, p2, mat) => {
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            mid.z += 0.8;
            const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
            const tube = new THREE.TubeGeometry(curve, 20, 0.04, 8, false);
            return new THREE.Mesh(tube, mat);
        };

        const wireRelay = createWire(new THREE.Vector3(-1.5, 1.0, 0.5), new THREE.Vector3(1.5, 1.5, 0.5), wireYellowMat);
        panelGroup.add(wireRelay);

        const wireLcd = createWire(new THREE.Vector3(-2.5, -0.2, 0.5), new THREE.Vector3(-2.5, -1.1, 0.5), wireBlueMat);
        panelGroup.add(wireLcd);

        const wirePwr = createWire(new THREE.Vector3(-0.2, 1.9, 0.5), new THREE.Vector3(-2.5, 2.5, 0.5), wireRedMat);
        panelGroup.add(wirePwr);
    }

    createWaterParticleSystem() {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        const plantXPos = [-10, -6, -2, 2];

        for (let i = 0; i < particleCount; i++) {
            const px = plantXPos[i % 4];
            positions[i * 3] = px + (Math.random() - 0.5) * 0.2;
            positions[i * 3 + 1] = 1.35;
            positions[i * 3 + 2] = 3 + (Math.random() - 0.5) * 0.2;

            velocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: -0.05 - Math.random() * 0.05,
                z: (Math.random() - 0.5) * 0.02,
                originY: 1.35
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x38bdf8,
            size: 0.15,
            transparent: true,
            opacity: 0.8
        });

        this.waterParticles = new THREE.Points(geometry, material);
        this.waterParticles.visible = false;
        this.waterParticles.velocities = velocities;
        this.scene.add(this.waterParticles);
    }

    registerInteractive(meshGroup) {
        meshGroup.traverse((child) => {
            if (child.isMesh) {
                child.userData.parentGroup = meshGroup;
                this.interactiveObjects.push(child);
            }
        });
    }

    // UPDATE DYNAMICS ON TICK / FRAME
    updateFromState(state) {
        if (!state) return;

        // 1. Water Tank Volume Cylinder Scaling with NaN safety
        if (this.waterMesh) {
            const lvl = Number.isFinite(state.waterLevel) ? state.waterLevel : 80;
            const h = (lvl / 100) * 4.0;
            this.waterMesh.scale.set(1, Math.max(0.01, lvl / 100), 1);
            this.waterMesh.position.y = 0.1 + h / 2;
        }

        // 2. Pump Impeller Rotation & Water Particle Flow
        if (state.pumpState) {
            if (this.pumpImpeller) this.pumpImpeller.rotation.x += 0.3;
            if (this.waterParticles) this.waterParticles.visible = true;
            if (this.relayLedGreen) this.relayLedGreen.material.color.setHex(0x10b981);
        } else {
            if (this.waterParticles) this.waterParticles.visible = false;
            if (this.relayLedGreen) this.relayLedGreen.material.color.setHex(0x334155);
        }

        // 3. ESP32 Flashing LED
        if (this.esp32Led) {
            this.esp32Led.material.color.setHex(Math.floor(Date.now() / 500) % 2 === 0 ? 0x38bdf8 : 0x0284c7);
        }

        // 4. Plant Health Morphing
        const soilVal = Number.isFinite(state.soilMoisture) ? state.soilMoisture : 62;
        this.plants.forEach((plant) => {
            let droopAngle = 0;
            let leafColor = 0x16a34a;

            if (soilVal < 35) {
                droopAngle = (1 - soilVal / 35) * 0.8;
                leafColor = 0xca8a04;
            } else if (soilVal > 75) {
                droopAngle = -0.1;
                leafColor = 0x15803d;
            }

            plant.leaves.forEach((leafGroup) => {
                leafGroup.rotation.x = droopAngle;
                if (leafGroup.mesh) {
                    leafGroup.mesh.material.color.setHex(leafColor);
                }
            });
        });

        // 5. 3D LCD Screen Update
        const tempVal = Number.isFinite(state.temperature) ? state.temperature : 28;
        const line1 = `Soil:${Math.round(soilVal)}%  T:${Math.round(tempVal)}C`;
        let line2 = `Pump: ${state.pumpState ? 'ON ' : 'OFF'}`;
        if (state.waterLevel <= 10) line2 = "LOW WATER!";
        this.updateLcd3DText(line1, line2);
    }

    setCameraPreset(preset) {
        if (preset === 'reset') {
            this.camTargetPos.set(12, 14, 18);
            this.camTargetLookAt.set(0, 2, 0);
        } else if (preset === 'farm') {
            this.camTargetPos.set(-4, 6, 12);
            this.camTargetLookAt.set(-4, 1.5, 3);
        } else if (preset === 'circuit') {
            this.camTargetPos.set(10, 6, 8);
            this.camTargetLookAt.set(10, 2.5, -1);
        } else if (preset === 'top') {
            this.camTargetPos.set(0, 28, 0.1);
            this.camTargetLookAt.set(0, 0, 0);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.camera && this.controls) {
            this.camera.position.lerp(this.camTargetPos, 0.05);
            this.controls.target.lerp(this.camTargetLookAt, 0.05);
            this.controls.update();
        }

        if (this.waterParticles && this.waterParticles.visible) {
            const positions = this.waterParticles.geometry.attributes.position.array;
            const vels = this.waterParticles.velocities;

            for (let i = 0; i < vels.length; i++) {
                positions[i * 3 + 1] += vels[i].y;
                if (positions[i * 3 + 1] <= 0.4) {
                    positions[i * 3 + 1] = vels[i].originY;
                }
            }
            this.waterParticles.geometry.attributes.position.needsUpdate = true;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onMouseMove(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

        const tooltip = document.getElementById('3d-tooltip');

        if (intersects.length > 0) {
            const group = intersects[0].object.userData.parentGroup;
            if (group && group.userData && group.userData.name) {
                document.body.style.cursor = 'pointer';
                tooltip.classList.remove('tooltip-hidden');
                tooltip.style.left = `${e.clientX - rect.left + 15}px`;
                tooltip.style.top = `${e.clientY - rect.top + 15}px`;
                document.getElementById('tooltip-title').innerText = group.userData.name;
                document.getElementById('tooltip-desc').innerText = group.userData.desc;
            }
        } else {
            document.body.style.cursor = 'default';
            if (tooltip) tooltip.classList.add('tooltip-hidden');
        }
    }

    onMouseClick(e) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

        if (intersects.length > 0) {
            const group = intersects[0].object.userData.parentGroup;
            if (group && group.userData && group.userData.name) {
                if (window.uiManager) {
                    window.uiManager.showComponentInspector(group.userData);
                }
            }
        }
    }

    onWindowResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight || 1;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}
