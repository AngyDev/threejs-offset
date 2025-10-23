import { applyOffset, processGeometry } from "@/index";
import "./index.css";
import * as THREE from "three";

import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;

function init() {
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight - 100,
  };

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0xf0f0f0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(sizes.width, sizes.height);
  renderer.sortObjects = false;

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize, false);

  const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 1, 1000);
  camera.position.x = 0;
  camera.position.y = -200;
  camera.position.z = 100;

  const controls = new TrackballControls(camera, container);
  controls.rotateSpeed = 10.0;

  // the light follow the camera position
  controls.addEventListener("change", lightUpdate);

  function lightUpdate(): void {
    directionalLight.position.copy(camera.position);
  }

  scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x505050));

  // LIGHTS
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // color, intensity
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.copy(camera.position);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  function onWindowResize(): void {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight - 100;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  function render(): void {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  }

  render();
}

init();

let mesh: THREE.Mesh | null = null;

const offsetElement = document.getElementById("offset") as HTMLInputElement;
const btnMeshOffset = document.getElementById("meshOffset") as HTMLButtonElement;
const btnPointOffset = document.getElementById("pointOffset") as HTMLButtonElement;

btnMeshOffset?.addEventListener("click", async (e: Event) => {
  e.preventDefault();

  const offset = Number(offsetElement?.value || 0);

  if (mesh) {
    const meshOffset = await applyOffset(mesh, offset);
    removeAddOffset(meshOffset);
  }
});

btnPointOffset?.addEventListener("click", (e: Event) => {
  e.preventDefault();

  const offset = Number(offsetElement?.value || 0);

  if (mesh) {
    const newMesh = processGeometry(mesh.geometry, offset);
    removeAddOffset(newMesh);
  }
});

// Load the file and get the geometry
const fileInput = document.getElementById("file") as HTMLInputElement;
fileInput?.addEventListener("change", (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    if (reader.result) {
      const geometry = new STLLoader().parse(reader.result);
      createMeshFromFile(geometry);
    }
  };

  reader.readAsArrayBuffer(file);
});

/**
 * Creates the mesh from the file's geometry
 */
const createMeshFromFile = (geometry: THREE.BufferGeometry): void => {
  if (mesh) {
    scene.remove(mesh);
  }

  const material = new THREE.MeshLambertMaterial({
    color: 0xf7ea00,
    wireframe: false,
  });
  mesh = new THREE.Mesh(geometry, material);

  scene.add(mesh);
};

const removeAddOffset = (offsetMesh: THREE.Mesh | THREE.Points): void => {
  const existingMesh = scene.children.filter((item) => item.name === offsetMesh.name);

  if (existingMesh.length === 0) {
    scene.add(offsetMesh);
  } else {
    scene.remove(existingMesh[0]);
    scene.add(offsetMesh);
  }
};

// Button to clear the scene
const btnClearScene = document.getElementById("clearScene") as HTMLButtonElement;

btnClearScene?.addEventListener("click", () => {
  clearScene();
});

const clearScene = (): void => {
  const meshes = scene.children.filter((item) => item.type === "Mesh" || item.type === "Points");

  if (meshes.length > 0) {
    for (const meshItem of meshes) {
      scene.remove(meshItem);
    }

    const fileInput = document.getElementById("file") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }
  mesh = null;
};
