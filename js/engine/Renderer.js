class RendererManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 600);

        // Sky: bright light blue (not black)
        this.scene.background = new THREE.Color(0xd0e8f8);
        this.scene.fog = new THREE.Fog(0xd0e8f8, 80, 280);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.6;
        this.container.appendChild(this.renderer.domElement);

        this._setupLights();
        window.addEventListener('resize', () => this._onResize());
    }

    _setupLights() {
        // Bright ambient
        const ambient = new THREE.AmbientLight(0xffffff, 1.8);
        this.scene.add(ambient);

        // Main sun directional light
        const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
        sun.position.set(40, 80, 40);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -80;
        sun.shadow.camera.right = 80;
        sun.shadow.camera.top = 80;
        sun.shadow.camera.bottom = -80;
        this.scene.add(sun);

        // Fill light (opposite side)
        const fill = new THREE.DirectionalLight(0xc8e8ff, 1.0);
        fill.position.set(-40, 30, -40);
        this.scene.add(fill);

        // Arena point lights
        const p1 = new THREE.PointLight(0x00f3ff, 1.5, 60);
        p1.position.set(0, 25, 0);
        this.scene.add(p1);

        const p2 = new THREE.PointLight(0xff0055, 0.8, 50);
        p2.position.set(-50, 15, -50);
        this.scene.add(p2);

        const p3 = new THREE.PointLight(0xff0055, 0.8, 50);
        p3.position.set(50, 15, 50);
        this.scene.add(p3);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
