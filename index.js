import * as THREE from "https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js";

import { TrackballControls } from "https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/TrackballControls.js";
import { STLLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/STLLoader.js";
import { VertexNormalsHelper } from "https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/helpers/VertexNormalsHelper.js";

let renderer, scene;
function initDisplay() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0xf0f0f0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.sortObjects = false;

  let container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize, false);

  let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.x = 0;
  camera.position.y = -200;
  camera.position.z = 100;

  let controls = new TrackballControls(camera, container);
  controls.rotateSpeed = 10.0;

  scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x505050));

  let light = new THREE.SpotLight(0xffffff, 1.5);
  light.position.set(0, 500, 2000);
  scene.add(light);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function render() {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  }

  render();
}

initDisplay();

let currentGeometry;
let mesh;

const offsetElement = document.getElementById("offset");
let offset = offsetElement.value;

offsetElement.onchange = (e) => {
  offset = e.target.value;

  if (currentGeometry) processGeometry(currentGeometry);
};

document.getElementById("file").onchange = (e) => {
  let reader = new FileReader();

  reader.onload = () => {
    const geometry = new STLLoader().parse(reader.result);

    createMeshFromFile(geometry);
  };

  reader.readAsArrayBuffer(e.target.files[0]);
};

const createMeshFromFile = (geometry) => {

  if (mesh) {
    scene.remove(mesh);
  }

  const material = new THREE.MeshLambertMaterial({ color: 0xffff00, wireframe: false });
  mesh = new THREE.Mesh(geometry, material);

  scene.add(mesh);

  processGeometry(geometry);
};

const processGeometry = (geometry) => {

  currentGeometry = geometry;

  const vertices = geometry.attributes.position.array;

  const normals = geometry.attributes.normal.array;
  const nNormals = geometry.attributes.normal.count;

  const position = new Float32Array(vertices.length * 3);

  for (let i = 0; i < vertices.length; i = i + 3) {
    position[i] = offset * normals[i] + vertices[i];
    position[i + 1] = offset * normals[i + 1] + vertices[i + 1];
    position[i + 2] = offset * normals[i + 2] + vertices[i + 2];
  }

  const newGeometry = new THREE.BufferGeometry();
  newGeometry.addAttribute("position", new THREE.BufferAttribute(position, 3));

  const newMaterial = new THREE.PointsMaterial({ color: 0xff0000, size: 0.7 });
  const newMesh = new THREE.Points(newGeometry, newMaterial);
  // const newMesh = new THREE.Mesh(newGeometry, newMaterial);

  newMesh.name = "offset";

  const offsetMesh = scene.children.filter((item) => item.name === newMesh.name);

  if (offsetMesh.length === 0) {
    scene.add(newMesh);
  } else {
    scene.remove(offsetMesh[0]);
    scene.add(newMesh);
  }
};
