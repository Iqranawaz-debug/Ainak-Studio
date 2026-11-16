// An invisible head built from the face landmarks. It only writes depth, never color,
// so anything behind it (the far arm, an arm behind a cheek) simply isn't drawn.
import { FaceLandmarker } from '@mediapipe/tasks-vision'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
} from 'three'
import { GLASSES_3D } from '../glassesOverlay.js'

// The landmarks that make up the face mesh. The extra iris landmarks after these aren't used.
const FACE_POINTS = 468

// Every three connections in MediaPipe's list form one triangle of the face
function getFaceTriangles() {
  const connections = FaceLandmarker.FACE_LANDMARKS_TESSELATION
  const triangles = []
  for (let i = 0; i < connections.length; i += 3) {
    triangles.push(connections[i].start, connections[i + 1].start, connections[i + 2].start)
  }
  return triangles
}

export function createHeadOccluder() {
  const oval = FaceLandmarker.FACE_LANDMARKS_FACE_OVAL
  const ovalPoints = [...new Set(oval.map((edge) => edge.start))]
  // The face mesh stops at the edge of the face. To give the head sides, each point on that edge
  // gets a partner further back, stored after the face points.
  const backIndex = new Map(ovalPoints.map((point, index) => [point, FACE_POINTS + index]))

  const indices = getFaceTriangles()
  for (const { start, end } of oval) {
    indices.push(start, end, backIndex.get(end), start, backIndex.get(end), backIndex.get(start))
  }

  const positions = new BufferAttribute(new Float32Array((FACE_POINTS + ovalPoints.length) * 3), 3)
  positions.setUsage(DynamicDrawUsage)

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', positions)
  geometry.setIndex(indices)

  const material = new MeshBasicMaterial({ color: '#E8553D', colorWrite: false, side: DoubleSide })
  const face = new Mesh(geometry, material)
  // It moves every frame, so working out whether it's on screen would only waste time
  face.frustumCulled = false

  // The landmarks stop short of the ears, so each ear is a simple block fixed to the head.
  // The arms pass behind these and disappear, as they do behind real ears.
  const { earX, earY, earZ, earSize } = GLASSES_3D
  const earGeometry = new BoxGeometry(...earSize)
  const ears = [-1, 1].map((side) => {
    const ear = new Mesh(earGeometry, material)
    ear.matrixAutoUpdate = false
    ear.frustumCulled = false
    ear.userData.offset = new Matrix4().makeTranslation(side * earX, earY, earZ)
    return ear
  })

  const group = new Group()
  group.add(face, ...ears)
  // Drawn first, so that it can hide what is drawn after it
  group.children.forEach((mesh) => {
    mesh.renderOrder = -1
  })

  return {
    group,

    // place(landmark) gives a landmark's position in centimeters from the camera.
    // backward is the direction out of the back of the head.
    update(landmarks, place, backward, headMatrix) {
      const { headDepth, headInset } = GLASSES_3D
      const points = []
      for (let i = 0; i < FACE_POINTS; i++) {
        const point = place(landmarks[i])
        points.push(point)
        positions.setXYZ(
          i,
          point.x + backward.x * headInset,
          point.y + backward.y * headInset,
          point.z + backward.z * headInset,
        )
      }
      for (const [point, index] of backIndex) {
        const { x, y, z } = points[point]
        positions.setXYZ(index, x + backward.x * headDepth, y + backward.y * headDepth, z + backward.z * headDepth)
      }
      positions.needsUpdate = true

      for (const ear of ears) {
        ear.matrix.multiplyMatrices(headMatrix, ear.userData.offset)
        ear.matrixWorldNeedsUpdate = true
      }

      // Debug mode can show the shape in color
      material.colorWrite = GLASSES_3D.showOccluder
    },

    dispose() {
      geometry.dispose()
      earGeometry.dispose()
      material.dispose()
    },
  }
}
