import { applyOffset, processGeometry } from "@/index"
import "./index.css"
import * as THREE from "three"

import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"

let renderer, scene

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

btnMeshOffset.addEventListener("click", async (e) => {
  e.preventDefault()

  const offset = offsetElement.value

  if (mesh) {
    const meshOffset = await applyOffset(mesh, offset)
    removeAddOffset(meshOffset)
  }
})

btnPointOffset.addEventListener("click", (e) => {
  e.preventDefault()

  const offset = offsetElement.value

  if (mesh) {
    const newMesh = processGeometry(mesh.geometry, offset)
    removeAddOffset(newMesh)
  }
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
