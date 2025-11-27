let app = null;

class Reticle {
    constructor() {
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false;
    }
}

class App {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        this.reticle = new Reticle();
        this.scene.add(this.reticle.mesh);

        this.models = {};
        this.selectedModel = null;
        this.stabilized = false;
        this.xrSession = null;
        this.viewerSpace = null;
        this.hitTestSource = null;
        this.localReferenceSpace = null;

        this.loadModels();
    }

    async loadModels() {
        const loader = new THREE.GLTFLoader();
        
        // Modelos de ejemplo (URLs públicas de glTF samples)
        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF/SheenChair.gltf', (gltf) => {
            this.models['chair'] = gltf.scene;
            gltf.scene.scale.set(0.5, 0.5, 0.5); // Ajusta tamaño
        });
        
        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Lantern/glTF/Lantern.gltf', (gltf) => {
            this.models['lamp'] = gltf.scene;
            gltf.scene.scale.set(0.01, 0.01, 0.01); // Ajusta (lantern es grande)
        });
        
        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SimpleSparseAccessor/glTF/SimpleSparseAccessor.gltf', (gltf) => {
            this.models['table'] = gltf.scene;
            gltf.scene.scale.set(0.5, 0.5, 0.5);
        });
    }

    async activateXR() {
        try {
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                optionalFeatures: ['dom-overlay', 'hit-test'],
                domOverlay: { root: document.body }
            });
            this.renderer.xr.enabled = true;
            this.renderer.xr.setReferenceSpaceType('local');
            this.renderer.xr.setSession(this.xrSession);

            this.viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
            this.hitTestSource = await this.xrSession.requestHitTestSource({ space: this.viewerSpace });
            this.localReferenceSpace = await this.xrSession.requestReferenceSpace('local');

            this.xrSession.addEventListener('select', this.onSelect.bind(this));
            this.renderer.setAnimationLoop(this.onXRFrame.bind(this));

            document.getElementById('enter-ar').classList.add('hidden');
            document.getElementById('furniture-menu').classList.remove('hidden');
        } catch (e) {
            alert('No se pudo iniciar AR. Asegúrate de usar un dispositivo compatible.');
        }
    }

    onSelect() {
        if (this.selectedModel && this.reticle.mesh.visible) {
            const clone = this.models[this.selectedModel].clone();
            clone.position.copy(this.reticle.mesh.position);
            this.scene.add(clone);
        }
    }

    onXRFrame(time, frame) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        if (hitTestResults.length > 0 && !this.stabilized) {
            this.stabilized = true;
            document.getElementById('stabilization').classList.remove('hidden');
        }
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(this.localReferenceSpace);
            this.reticle.mesh.visible = true;
            this.reticle.mesh.matrix.fromArray(pose.transform.matrix);
            this.reticle.mesh.updateMatrixWorld(true);
        } else {
            this.reticle.mesh.visible = false;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

function selectModel(model) {
    app.selectedModel = model;
    alert(`Seleccionado: ${model}. Ahora toca la pantalla para colocar.`);
    // Opcional: link a compra, ej. window.open('https://amazon.com/link-afiliado');
}

window.onload = () => {
    app = new App();
    document.getElementById('enter-ar').addEventListener('click', () => app.activateXR());

    // Luces básicas para sombras
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    app.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    app.scene.add(directionalLight);
};