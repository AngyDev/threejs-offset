import "./index.css"
import * as THREE from "three"

import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js"
import { createOffsetMesh } from "../src/utils/offsetObjectHash"
import { createMeshFromObject } from "../src/utils/createMeshFromObject"

let renderer, scene

const canvas = document.querySelector("canvas.webgl")

function init() {
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight - 100,
  }

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor(0xf0f0f0)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(sizes.width, sizes.height)
  renderer.sortObjects = false

  let container = document.createElement("div")
  document.body.appendChild(container)
  container.appendChild(renderer.domElement)
  window.addEventListener("resize", onWindowResize, false)

  let camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 1, 1000)
  camera.position.x = 0
  camera.position.y = -200
  camera.position.z = 100

  let controls = new TrackballControls(camera, container)
  controls.rotateSpeed = 10.0

  // the light follow the camera position
  controls.addEventListener("change", lightUpdate)

  function lightUpdate() {
    directionalLight.position.copy(camera.position)
  }

  scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0x505050))

  // LIGHTS
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5) // color, intensity
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.copy(camera.position)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  function onWindowResize() {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight - 100

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  function render() {
    requestAnimationFrame(render)
    controls.update()
    renderer.render(scene, camera)
  }

  render()
}

init()

let mesh

const offsetElement = document.getElementById("offset")
const btnMeshOffset = document.getElementById("meshOffset")
const btnPointOffset = document.getElementById("pointOffset")
const loading = document.getElementById("loading")

btnMeshOffset.addEventListener("click", async (e) => {
  e.preventDefault()

  const offset = offsetElement.value

  if (mesh) await applyOffset(mesh, offset)
})

btnPointOffset.addEventListener("click", (e) => {
  e.preventDefault()

  const offset = offsetElement.value

  if (mesh) processGeometry(mesh.geometry, offset)
})

// Load the file and get the geometry
document.getElementById("file").onchange = (e) => {
  let reader = new FileReader()

  reader.onload = () => {
    const geometry = new STLLoader().parse(reader.result)

    createMeshFromFile(geometry)
  }

  reader.readAsArrayBuffer(e.target.files[0])
}

/**
 * Creates the mesh from the file's geometry
 * @param {THREE.BufferGeometry} geometry
 */
const createMeshFromFile = (geometry) => {
  if (mesh) {
    scene.remove(mesh)
  }

  const material = new THREE.MeshLambertMaterial({ color: 0xf7ea00, wireframe: false })
  mesh = new THREE.Mesh(geometry, material)

  scene.add(mesh)
}

/**
 * Creates a mesh with the offset passed
 * @param {THREE.Mesh} meshToOffset The mesh that the user added to the scene
 * @param {Number} offset The offset passed
 */
const applyOffset = async (meshToOffset, offset) => {
  console.time()

  // 1. Export mesh as an ascii file
  const exporter = new STLExporter()
  const result = exporter.parse(meshToOffset, { binary: false })

  // 2. Creates mesh with offset
  const object = createOffsetMesh(result, offset)
  const meshOffset = await createMeshFromObject(object)

  meshOffset.name = "offset"

  console.timeEnd()

  removeAddOffset(meshOffset)
}

/**
 * Creates a points with the offset passed
 * @param {THREE.Geometry} geometry The geometry that the user added to the scene
 * @param {Number} offset The offset passed
 */
const processGeometry = (geometry, offset) => {
  const vertices = geometry.attributes.position.array

  const normals = geometry.attributes.normal.array

  const position = new Float32Array(vertices.length * 3)

  for (let i = 0; i < vertices.length; i = i + 3) {
    position[i] = offset * normals[i] + vertices[i]
    position[i + 1] = offset * normals[i + 1] + vertices[i + 1]
    position[i + 2] = offset * normals[i + 2] + vertices[i + 2]
  }

  const newGeometry = new THREE.BufferGeometry()
  newGeometry.setAttribute("position", new THREE.BufferAttribute(position, 3))

  const newMaterial = new THREE.PointsMaterial({ color: 0xff0000, size: 0.7 })
  const newMesh = new THREE.Points(newGeometry, newMaterial)

  newMesh.name = "offset"

  removeAddOffset(newMesh)
}

const removeAddOffset = (mesh) => {
  const offsetMesh = scene.children.filter((item) => item.name === mesh.name)

  if (offsetMesh.length === 0) {
    scene.add(mesh)
  } else {
    scene.remove(offsetMesh[0])
    scene.add(mesh)
  }
}

// Button to clear the scene
const btnClearScene = document.getElementById("clearScene")

btnClearScene.addEventListener("click", () => {
  clearScene()
})

const clearScene = () => {
  const meshes = scene.children.filter((item) => item.type === "Mesh" || item.type === "Points")

  if (meshes.length > 0) {
    for (const mesh of meshes) {
      scene.remove(mesh)
    }

    document.getElementById("file").value = ""
  }
}
