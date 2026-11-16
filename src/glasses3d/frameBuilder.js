// Builds any frame from its description in frameDefs.js. Everything is in centimeters.
// The model faces +z, with the point midway between the lens centers at the origin.
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Path,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  DoubleSide,
} from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { GRADIENT_FADE } from '../frames/look.js'
import { GLASSES_3D } from '../glassesOverlay.js'

// How deep the rims are, and the small rounded edge on them
const RIM_DEPTH = 0.25
const BEVEL = 0.03
// Real frames curve gently around the face. This pushes the sides back by this much per cm squared.
const FACE_CURVE = 0.0045
// The gap between the lenses for Classic frames
const BRIDGE_GAP = 1.7
const CURVE_DETAIL = 16

// ---- Shape helpers ----

// Push an outline outward by distance, to make the outside edge of a rim
function offsetOutline(points, distance) {
  const center = points.reduce((sum, point) => sum.add(point), new Vector2()).divideScalar(points.length)
  return points.map((point, index) => {
    const before = points[(index - 1 + points.length) % points.length]
    const after = points[(index + 1) % points.length]
    const normal = new Vector2(after.y - before.y, before.x - after.x).normalize()
    // Make sure the normal points away from the middle of the lens
    if (normal.dot(point.clone().sub(center)) < 0) normal.negate()
    return point.clone().addScaledVector(normal, distance)
  })
}

function bounds(points) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) }
}

function area(points) {
  const box = bounds(points)
  return (box.right - box.left) * (box.top - box.bottom)
}

// The vertical middle of a lens, measured where the eye sits rather than across its whole width,
// so that the sweeping tip of a cat-eye doesn't pull it upward
function lensMiddleY(points) {
  const box = bounds(points)
  const middleX = (box.left + box.right) / 2
  const near = points.filter((point) => Math.abs(point.x - middleX) < (box.right - box.left) * 0.08)
  const nearBox = bounds(near.length > 1 ? near : points)
  return (nearBox.top + nearBox.bottom) / 2
}

// Flat rims: the outside shape with the lens holes cut out, extruded with a small bevel
function extrudeRim(outer, holes) {
  const shape = new Shape(outer)
  shape.holes = holes.map((hole) => new Path(hole))
  return new ExtrudeGeometry(shape, {
    depth: RIM_DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelOffset: -BEVEL,
    bevelSegments: 2,
  }).translate(0, 0, -RIM_DEPTH)
}

// Curve a flat front gently around the face
function applyFaceCurve(geometry) {
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    positions.setZ(i, positions.getZ(i) - FACE_CURVE * x * x)
  }
  geometry.computeVertexNormals()
  return geometry
}

// A tapered bar along a curve, with an oval cross-section. Used for temple arms and bridges.
// getSize(t) gives its [width, height] at each point along it, from 0 to 1.
function sweepBar(points, getSize, segments = 32) {
  const curve = new CatmullRomCurve3(points)
  const sides = 8
  const vertices = []
  const indices = []
  const up = new Vector3(0, 1, 0)

  for (let step = 0; step <= segments; step++) {
    const t = step / segments
    const center = curve.getPoint(t)
    const tangent = curve.getTangent(t)
    const across = new Vector3().crossVectors(tangent, up).normalize()
    const upward = new Vector3().crossVectors(across, tangent).normalize()
    const [width, height] = getSize(t)

    for (let side = 0; side < sides; side++) {
      const angle = (side / sides) * Math.PI * 2
      const point = center
        .clone()
        .addScaledVector(across, (Math.cos(angle) * width) / 2)
        .addScaledVector(upward, (Math.sin(angle) * height) / 2)
      vertices.push(point.x, point.y, point.z)
    }

    if (step < segments) {
      const row = step * sides
      for (let side = 0; side < sides; side++) {
        const next = (side + 1) % sides
        indices.push(row + side, row + sides + side, row + next)
        indices.push(row + next, row + sides + side, row + sides + next)
      }
    }
  }

  // Close both ends, so a bar never looks hollow
  for (let side = 1; side < sides - 1; side++) {
    indices.push(0, side, side + 1)
    const row = segments * sides
    indices.push(row, row + side + 1, row + side)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

// ---- Fronts: the rims, lens outlines and anything else facing forward ----

// A Classic front, drawn from its lens outline and sized to fit the target width
function buildClassicFront(def, targetWidth) {
  const raw = def.lensOutline().getPoints(CURVE_DETAIL).slice(0, -1)
  const rawBox = bounds(raw)
  // Half the frame is half the gap, then the inner rim, the lens, and the outer rim
  const lensWidth = targetWidth / 2 - BRIDGE_GAP / 2 - 2 * def.rimWidth
  const scale = lensWidth / (rawBox.right - rawBox.left)
  const lensCenterX = BRIDGE_GAP / 2 + def.rimWidth + lensWidth / 2

  // The 2D art has y pointing down and x running towards the nose, which is the left lens here
  const unplaced = raw.map((point) => new Vector2((point.x - rawBox.left) * scale, -point.y * scale))
  const middle = lensMiddleY(unplaced)
  const left = unplaced.map((point) => new Vector2(point.x - lensWidth - BRIDGE_GAP / 2 - def.rimWidth, point.y - middle))
  const right = left.map((point) => new Vector2(-point.x, point.y)).reverse()

  const rims = [left, right].map((lens) => ({ outer: offsetOutline(lens, def.rimWidth), holes: [lens] }))
  return { rims, lenses: [left, right], lensCenterX, bridgeGap: BRIDGE_GAP, hasBridge: true }
}

// The SVG files are only fetched once
const svgLoads = new Map()

function loadSvg(file) {
  if (!svgLoads.has(file)) {
    svgLoads.set(
      file,
      fetch(`${import.meta.env.BASE_URL}frames/svg/${file}.svg`)
        .then((response) => response.text())
        .then((text) => new SVGLoader().parse(text).paths),
    )
  }
  return svgLoads.get(file)
}

// A More styles front, from the parts of its original SVG
async function buildSvgFront(def, targetWidth) {
  const { file, parts, holes: holePaths = {}, mirror = [], level = 0 } = def.svg
  const paths = await loadSvg(file)
  const turn = (level * Math.PI) / 180

  // SVG shapes as lists of points, with y flipped to point up, and leveled if needed
  const toPoints = (curvePath) =>
    curvePath.getPoints(CURVE_DETAIL).slice(0, -1).map((point) => new Vector2(point.x, -point.y).rotateAround(new Vector2(), turn))

  let pieces = []
  for (const index of parts) {
    for (const shape of SVGLoader.createShapes(paths[index])) {
      const holes = shape.holes.map(toPoints)
      if (holePaths[index] !== undefined) holes.push(toPoints(SVGLoader.createShapes(paths[holePaths[index]])[0]))
      pieces.push({ outer: toPoints(shape), holes, mirrored: mirror.includes(index) })
    }
  }

  // The lenses are the large holes, and not small details like the Wayfarer's rivet slots
  const allHoles = pieces.flatMap((piece) => piece.holes)
  const largest = Math.max(...allHoles.map(area))
  const isLens = (hole) => area(hole) > largest * 0.3
  let lensBoxes = allHoles.filter(isLens).map(bounds)

  // Art where only one side is usable is copied across the middle of the frame.
  // It's placed so the bridge and top bar, which are already centered, stay in the middle.
  const others = pieces.filter((piece) => !piece.mirrored).flatMap((piece) => piece.outer)
  const axis = others.length ? (bounds(others).left + bounds(others).right) / 2 : 0
  const flip = (points) => points.map((point) => new Vector2(2 * axis - point.x, point.y)).reverse()
  pieces = pieces.flatMap((piece) =>
    piece.mirrored
      ? [piece, { outer: flip(piece.outer), holes: piece.holes.map(flip), mirrored: false }]
      : [piece],
  )

  // Move the middle of the lenses to the origin, and scale to the target width
  const lenses = pieces.flatMap((piece) => piece.holes.filter(isLens))
  lensBoxes = lenses.map(bounds)
  const centerX = (Math.min(...lensBoxes.map((box) => box.left)) + Math.max(...lensBoxes.map((box) => box.right))) / 2
  const centerY = lensMiddleY(lenses[0])
  const outerBox = bounds(pieces.flatMap((piece) => piece.outer))
  const halfWidth = Math.max(outerBox.right - centerX, centerX - outerBox.left)
  const scale = targetWidth / (2 * halfWidth)
  const place = (points) => points.map((point) => new Vector2((point.x - centerX) * scale, (point.y - centerY) * scale))

  const rims = pieces.map((piece) => ({ outer: place(piece.outer), holes: piece.holes.map(place) }))
  const placedLenses = lenses.map(place)
  const right = bounds(placedLenses.filter((lens) => bounds(lens).left > 0).flat())

  return {
    rims,
    lenses: placedLenses,
    lensCenterX: (right.left + right.right) / 2,
    bridgeGap: 2 * right.left,
    hasBridge: false,
  }
}

// ---- Materials: one of each, shared by every frame so a swatch changes them all at once ----

// How each finish catches the light. Clearcoat is never quite 0, as going to and from 0 rebuilds the
// shader, which would stutter the video on every change.
const FINISH_MATERIALS = {
  glossy: { roughness: 0.25, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0.001 },
  metallic: { roughness: 0.3, metalness: 0.9, clearcoat: 0.001 },
}

function createLensMaterial(isGradient) {
  return new MeshPhysicalMaterial({
    transparent: true,
    roughness: 0.05,
    metalness: 0,
    reflectivity: 0.3,
    // A gradient uses the fade stored on each lens's corners
    vertexColors: isGradient,
    // Lenses never hide anything behind them
    depthWrite: false,
    side: DoubleSide,
  })
}

export function createFrameMaterials() {
  const frame = new MeshPhysicalMaterial(FINISH_MATERIALS.glossy)
  // Separate materials, so each keeps its shader and switching between them doesn't stutter
  const flatLens = createLensMaterial(false)
  const gradientLens = createLensMaterial(true)
  const lensMeshes = []
  let lens = flatLens

  return {
    frame,

    setColor(hex) {
      frame.color.set(hex)
    },

    setFinish(finish) {
      frame.setValues(FINISH_MATERIALS[finish])
    },

    // Every lens on every frame follows the choice, including frames that are built later
    addLensMesh(mesh) {
      lensMeshes.push(mesh)
      mesh.material = lens
    },

    setLens({ color, opacity, isGradient }) {
      lens = isGradient ? gradientLens : flatLens
      lens.color.set(color)
      lens.opacity = opacity
      lensMeshes.forEach((mesh) => {
        mesh.material = lens
      })
    },

    dispose() {
      frame.dispose()
      flatLens.dispose()
      gradientLens.dispose()
    },
  }
}

// Store a gradient lens's fade, from full strength at its top edge to GRADIENT_FADE at its bottom edge.
// The fade changes evenly with height, so it stays smooth across the lens's long thin triangles.
function addLensFade(geometry, { top, bottom }) {
  const positions = geometry.attributes.position
  const colors = []
  for (let i = 0; i < positions.count; i++) {
    const height = (positions.getY(i) - bottom) / (top - bottom)
    colors.push(1, 1, 1, GRADIENT_FADE + (1 - GRADIENT_FADE) * height)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4))
  return geometry
}

// ---- Putting a whole frame together ----

// A temple arm: from the hinge, out and straight back along the head, then down and in behind the ear.
// side is 1 for the arm on the right of the video, and -1 for the left.
function createArmGeometry(side, hinge, style) {
  const { armLength, armX } = GLASSES_3D
  const [x, y, z] = hinge
  const points = [
    [x, y, z],
    [(x + armX) / 2, y + 0.02, z - 1],
    [armX, y - 0.05, z - armLength * 0.4],
    [armX, y - 0.2, z - armLength * 0.8],
    [armX - 0.15, y - 0.6, z - armLength],
    [armX - 0.6, y - 1.8, z - armLength * 1.14],
  ].map(([px, py, pz]) => new Vector3(side * px, py, pz))

  // Both styles taper towards the tip. Acetate arms are broad and flat, metal arms are thin wire.
  const [widthStart, heightStart, widthEnd, heightEnd] = style === 'acetate' ? [0.22, 0.55, 0.16, 0.26] : [0.13, 0.17, 0.1, 0.12]
  return sweepBar(points, (t) => [widthStart + (widthEnd - widthStart) * t, heightStart + (heightEnd - heightStart) * t], 40)
}

// A Classic bridge between the rims
function createBridgeGeometries(style, gap, lensHeight, rimWidth, curveZ) {
  const inner = gap / 2 + rimWidth * 0.6
  const y = lensHeight * 0.24
  const arc = (rise, height) =>
    sweepBar(
      [new Vector3(-inner, y, curveZ), new Vector3(0, y + rise, curveZ + 0.12), new Vector3(inner, y, curveZ)],
      () => [0.2, height],
      12,
    )

  if (style === 'double') {
    const barY = lensHeight * 0.42
    const barEnd = gap / 2 + rimWidth + 1.2
    const bar = sweepBar(
      [new Vector3(-barEnd, barY, curveZ), new Vector3(0, barY + 0.1, curveZ + 0.05), new Vector3(barEnd, barY, curveZ)],
      () => [0.13, 0.13],
      12,
    )
    return [arc(0.12, 0.16), bar]
  }
  return [style === 'keyhole' ? arc(0.45, 0.2) : arc(0.3, 0.28)]
}

export async function buildFrame(def, materials) {
  const targetWidth = GLASSES_3D.frameWidth * def.lensSize
  const front = def.svg ? await buildSvgFront(def, targetWidth) : buildClassicFront(def, targetWidth)

  const frameMaterial = materials.frame
  const group = new Group()
  const geometries = []

  function add(geometry, material, order = 0) {
    geometries.push(geometry)
    const mesh = new Mesh(geometry, material)
    mesh.renderOrder = order
    group.add(mesh)
    return mesh
  }

  for (const { outer, holes } of front.rims) add(applyFaceCurve(extrudeRim(outer, holes)), frameMaterial)
  const lensBox = bounds(front.lenses.flat())
  for (const lens of front.lenses) {
    const lensGeometry = applyFaceCurve(new ShapeGeometry(new Shape(lens)).translate(0, 0, -RIM_DEPTH / 2))
    // addLensMesh gives it the lens material
    materials.addLensMesh(add(addLensFade(lensGeometry, lensBox), undefined, 1))
  }

  const lensHeight = lensBox.top - lensBox.bottom
  const halfWidth = bounds(front.rims.flatMap((rim) => rim.outer)).right

  if (front.hasBridge) {
    const curveZ = -RIM_DEPTH / 2 - FACE_CURVE * (front.bridgeGap / 2) ** 2
    for (const bridge of createBridgeGeometries(def.bridge, front.bridgeGap, lensHeight, def.rimWidth, curveZ)) add(bridge, frameMaterial)
  }

  // No nose pads: they sit over the inner corner of the eye on many faces, and with the head turned
  // only one shows, which reads as a smudge. Real pads are barely seen from the front anyway.

  // Hinges, in the top third of the outer edge of the rims, behind the front
  const outerPoints = front.rims.flatMap((rim) => rim.outer).filter((point) => point.x > halfWidth * 0.93)
  const hingeY = bounds(outerPoints).top - 0.25
  const hingeZ = -RIM_DEPTH - FACE_CURVE * halfWidth * halfWidth
  const hingeGeometry = new BoxGeometry(0.34, 0.42, 0.42)
  geometries.push(hingeGeometry)
  for (const side of [-1, 1]) {
    const hinge = new Mesh(hingeGeometry, frameMaterial)
    hinge.position.set(side * (halfWidth - 0.1), hingeY, hingeZ - 0.1)
    group.add(hinge)
  }

  // Arms are kept apart from the rest, as the arm length slider rebuilds them
  const armHinge = [halfWidth - 0.05, hingeY, hingeZ - 0.2]
  const arms = [-1, 1].map((side) => new Mesh(createArmGeometry(side, armHinge, def.arm), frameMaterial))
  arms.forEach((arm) => group.add(arm))
  let builtKey = `${GLASSES_3D.armLength}/${GLASSES_3D.armX}`

  return {
    group,
    lensCenterX: front.lensCenterX,
    frontWidth: 2 * halfWidth,

    // Rebuild the arms if a slider has changed them
    updateArms() {
      const key = `${GLASSES_3D.armLength}/${GLASSES_3D.armX}`
      if (key === builtKey) return
      builtKey = key
      arms.forEach((arm, index) => {
        arm.geometry.dispose()
        arm.geometry = createArmGeometry(index === 0 ? -1 : 1, armHinge, def.arm)
      })
    },

    dispose() {
      geometries.forEach((geometry) => geometry.dispose())
      arms.forEach((arm) => arm.geometry.dispose())
    },
  }
}
