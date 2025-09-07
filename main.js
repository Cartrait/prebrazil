// Use CDN-based module imports
import * as THREE from 'https://cdn.skypack.dev/three';
import { OrbitControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';
import { PMREMGenerator } from 'https://cdn.skypack.dev/three';

// Canvas and Renderer Setup
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // clean dark background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 1.6, 4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.1, 0);
controls.update();
controls.enableDamping = true;
controls.enablePan = false;
controls.maxDistance = 6;
controls.minDistance = 2;

// === Environment (HDRI) ===
const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader()
  .setPath('/textures/environment/')
  .load('autoshop_01_1k.hdr', (hdrEquirect) => {
    const envMap = pmremGenerator.fromEquirectangular(hdrEquirect).texture;
    scene.environment = envMap;
    hdrEquirect.dispose();
    pmremGenerator.dispose();
  });

// === Lights ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(4, 5, 3);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
rimLight.position.set(-3, 2, -2);
rimLight.castShadow = true;
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
fillLight.position.set(2, 3, -4);
fillLight.castShadow = true;
scene.add(fillLight);

// === Ground Plane ===
const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x111111,
  metalness: 0.6,
  roughness: 0.8,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// === Globals ===
const loader = new GLTFLoader();
let currentCar = null;
let currentSplitter = null;
let currentSpoiler = null;
let carPaintMaterial = null;

function unloadModel(model) {
  if (model) {
    scene.remove(model);
    model.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material?.dispose();
      }
    });
  }
}

// === Load Front Splitter ===
function loadFrontSplitter(trim) {
  const splitterPaths = {
    base: '/models/vw_golf/front_splitters/F.mk7.standard.splitter.glb',
    gti: '/models/vw_golf/front_splitters/F.mk7.gti.splitter.glb',
    r: '/models/vw_golf/front_splitters/F.mk7.r.splitter.glb',
  };

  const path = splitterPaths[trim];
  if (!path) return;

  if (currentSplitter) unloadModel(currentSplitter);

  loader.load(path, (gltf) => {
    currentSplitter = gltf.scene;
    currentSplitter.position.set(0, 0, 0);
    currentSplitter.scale.set(1.2, 1.2, 1.2);
    currentSplitter.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(currentSplitter);
  });
}

// === Load Rear Spoiler ===
function loadRearSpoiler(trim) {
  if (trim !== 'gti' && trim !== 'r') return;

  const spoilerPath = '/models/vw_golf/rear_spoilers/mk7.gti.r.spoiler.glb';

  if (currentSpoiler) unloadModel(currentSpoiler);

  loader.load(spoilerPath, (gltf) => {
    currentSpoiler = gltf.scene;
    currentSpoiler.position.set(0, 0, 0);
    currentSpoiler.scale.set(1.2, 1.2, 1.2);
    currentSpoiler.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(currentSpoiler);
  });
}

// === Load Car ===
function loadCarModel(trim, showSplitter = false, showSpoiler = false) {
  const modelPaths = {
    base: '/models/vw_golf/golf.mk7.base.glb',
    gti: '/models/vw_golf/golf.mk7.gti.glb',
    r: '/models/vw_golf/golf.mk7.r.glb'
  };

  const path = modelPaths[trim] || modelPaths.base;

  if (currentCar) unloadModel(currentCar);
  currentCar = null;
  carPaintMaterial = null;

  if (currentSplitter) {
    unloadModel(currentSplitter);
    currentSplitter = null;
  }
  if (currentSpoiler) {
    unloadModel(currentSpoiler);
    currentSpoiler = null;
  }

  loader.load(path, (gltf) => {
    currentCar = gltf.scene;
    currentCar.position.set(0, 0, 0);
    currentCar.scale.set(1.2, 1.2, 1.2);

    currentCar.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material?.name === 'carpaint') {
          carPaintMaterial = child.material;
          updateCarColor(document.getElementById('colorPicker').value);
        }
      }
    });

    scene.add(currentCar);

    if (showSplitter) loadFrontSplitter(trim);
    if (showSpoiler) loadRearSpoiler(trim);
  });
}

// === Color Mapping ===
function mapColorNameToHex(name) {
  const map = {
    RED: '#c93030',
    BLUE: '#2e4cad',
    WHITE: '#ffffff',
    BLACK: '#111111',
    GREY: '#777777',
    SILVER: '#cccccc',
    YELLOW: '#e2e211',
    GREEN: '#197d30'
  };
  return map[name?.toUpperCase()] || '#aaaaaa';
}

function updateCarColor(hexColor) {
  if (carPaintMaterial) {
    carPaintMaterial.color.set(hexColor);
  }
}

// === Vehicle Lookup ===
async function getVehicleDataFromVDG(reg) {
  try {
    const response = await fetch(`http://localhost:3000/api/vehicle?vrm=${encodeURIComponent(reg)}`);
    const data = await response.json();

    const vehicle = data?.Results?.VehicleDetails;
    const modelInfo = data?.Results?.ModelDetails?.ModelIdentification;
    const colour = vehicle?.VehicleHistory?.ColourDetails?.CurrentColour;

    const model = modelInfo?.Model || '';
    const make = modelInfo?.Make || '';

    const trim = model.toUpperCase().includes('GTI') ? 'gti'
                : model.toUpperCase().includes('R') ? 'r'
                : 'base';

    return { make, model, colour, trim };
  } catch (err) {
    console.error('Client API error:', err);
    return { make: null, model: null, colour: null, trim: null };
  }
}

// === Animate Loop ===
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// === DOM Setup ===
window.addEventListener('DOMContentLoaded', () => {
  const variantSelect = document.getElementById('variantSelect');
  const colorPicker = document.getElementById('colorPicker');
  const loadCarBtn = document.getElementById('loadCarBtn');
  const regInput = document.getElementById('regInput');
  const showSplitterToggle = document.getElementById('showSplitter');
  const showSpoilerToggle = document.getElementById('showSpoiler');

  variantSelect.addEventListener('change', (e) => {
    const trim = e.target.value;
    const showSplitter = showSplitterToggle.checked;
    const showSpoiler = showSpoilerToggle.checked;
    loadCarModel(trim, showSplitter, showSpoiler);
  });

  colorPicker.addEventListener('input', (e) => {
    updateCarColor(e.target.value);
  });

  loadCarBtn.addEventListener('click', async () => {
    const reg = regInput.value.trim().toUpperCase();
    if (!reg) return alert('Please enter a registration number');

    const { make, model, colour, trim } = await getVehicleDataFromVDG(reg);
    if (!make || !model || !colour || !trim) {
      console.error("❌ Missing vehicle data");
      return;
    }

    if (make.toUpperCase() === 'VOLKSWAGEN' && model.toUpperCase().includes('GOLF')) {
      const hex = mapColorNameToHex(colour);
      const showSplitter = showSplitterToggle.checked;
      const showSpoiler = showSpoilerToggle.checked;
      variantSelect.value = trim;
      loadCarModel(trim, showSplitter, showSpoiler);
      setTimeout(() => updateCarColor(hex), 500);
    } else {
      alert('Only VW Golfs are supported right now.');
    }
  });

  // Live toggle listeners
  showSplitterToggle.addEventListener('change', (e) => {
    const trim = variantSelect.value;
    if (e.target.checked) {
      loadFrontSplitter(trim);
    } else {
      unloadModel(currentSplitter);
      currentSplitter = null;
    }
  });

  showSpoilerToggle.addEventListener('change', (e) => {
    const trim = variantSelect.value;
    if (trim !== 'gti' && trim !== 'r') return;

    if (e.target.checked) {
      loadRearSpoiler(trim);
    } else {
      unloadModel(currentSpoiler);
      currentSpoiler = null;
    }
  });

  // Load default base car
  loadCarModel('base');
});
