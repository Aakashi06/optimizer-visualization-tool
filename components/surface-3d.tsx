"use client"

import { useRef, useMemo } from "react"
import { Canvas, type ThreeEvent } from "@react-three/fiber"
import { OrbitControls, Sphere, Html } from "@react-three/drei"
import * as THREE from "three"
import type { OptimizerStep } from "@/lib/optimizers"

interface Surface3DProps {
  lossFn: (x: number, y: number) => number
  range: { x: [number, number]; y: [number, number] }
  path: OptimizerStep[]
  currentStep: number
  onSurfaceClick: (x: number, y: number) => void
  showGradient: boolean
}

function LossSurface({
  lossFn,
  range,
  onSurfaceClick,
}: {
  lossFn: (x: number, y: number) => number
  range: { x: [number, number]; y: [number, number] }
  onSurfaceClick: (x: number, y: number) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const resolution = 80

  const { geometry, maxZ, minZ } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(range.x[1] - range.x[0], range.y[1] - range.y[0], resolution, resolution)

    const positions = geo.attributes.position.array as Float32Array
    let maxZ = Number.NEGATIVE_INFINITY
    let minZ = Number.POSITIVE_INFINITY

    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i]
      const localY = positions[i + 1]
      const x = localX + (range.x[0] + range.x[1]) / 2
      const y = localY + (range.y[0] + range.y[1]) / 2
      let z = lossFn(x, y)

      if (!isFinite(z)) z = 0
      z = Math.min(Math.max(z, -50), 50) // Clamp for visualization

      positions[i + 2] = z
      if (z > maxZ) maxZ = z
      if (z < minZ) minZ = z
    }

    geo.computeVertexNormals()
    return { geometry: geo, maxZ, minZ }
  }, [lossFn, range])

  // Color the surface based on height
  const colors = useMemo(() => {
    const positions = geometry.attributes.position.array as Float32Array
    const colorArray = new Float32Array((positions.length / 3) * 3)
    const zRange = maxZ - minZ || 1

    for (let i = 0; i < positions.length / 3; i++) {
      const z = positions[i * 3 + 2]
      const t = (z - minZ) / zRange

      // Color gradient from blue (low) to cyan to green to yellow to red (high)
      let r, g, b
      if (t < 0.25) {
        const tt = t / 0.25
        r = 0.1
        g = 0.2 + tt * 0.4
        b = 0.6 + tt * 0.2
      } else if (t < 0.5) {
        const tt = (t - 0.25) / 0.25
        r = 0.1 + tt * 0.2
        g = 0.6 + tt * 0.3
        b = 0.8 - tt * 0.4
      } else if (t < 0.75) {
        const tt = (t - 0.5) / 0.25
        r = 0.3 + tt * 0.5
        g = 0.9 - tt * 0.2
        b = 0.4 - tt * 0.3
      } else {
        const tt = (t - 0.75) / 0.25
        r = 0.8 + tt * 0.2
        g = 0.7 - tt * 0.5
        b = 0.1
      }

      colorArray[i * 3] = r
      colorArray[i * 3 + 1] = g
      colorArray[i * 3 + 2] = b
    }

    return colorArray
  }, [geometry, maxZ, minZ])

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const point = event.point
    const x = point.x
    const y = point.y
    onSurfaceClick(x, y)
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onClick={handleClick}
      position={[(range.x[0] + range.x[1]) / 2, (range.y[0] + range.y[1]) / 2, 0]}
      rotation={[0, 0, 0]}
    >
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  )
}

function OptimizerPath({
  path,
  currentStep,
  showGradient,
}: {
  path: OptimizerStep[]
  currentStep: number
  showGradient: boolean
}) {
  const visiblePath = path.slice(0, currentStep + 1)

  const validPath = visiblePath.filter(
    (step) =>
      typeof step.x === "number" &&
      typeof step.y === "number" &&
      typeof step.z === "number" &&
      Number.isFinite(step.x) &&
      Number.isFinite(step.y) &&
      Number.isFinite(step.z),
  )

  const lineGeometry = useMemo(() => {
    if (validPath.length < 2) return null

    const points = validPath.map((step) => new THREE.Vector3(step.x, step.y, step.z + 0.1))
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    return geometry
  }, [validPath])

  if (validPath.length === 0) return null

  const currentPoint = validPath[validPath.length - 1]

  return (
    <group>
      {lineGeometry && (
        <line geometry={lineGeometry}>
          <lineBasicMaterial color="#f97316" linewidth={2} transparent opacity={0.9} />
        </line>
      )}

      {/* Path markers */}
      {validPath.map((step, i) => (
        <Sphere key={i} position={[step.x, step.y, step.z + 0.1]} args={[0.08, 16, 16]}>
          <meshStandardMaterial
            color={i === validPath.length - 1 ? "#ef4444" : "#fb923c"}
            emissive={i === validPath.length - 1 ? "#ef4444" : "#000000"}
            emissiveIntensity={i === validPath.length - 1 ? 0.5 : 0}
          />
        </Sphere>
      ))}

      {/* Current position marker (larger) */}
      {currentPoint && (
        <Sphere position={[currentPoint.x, currentPoint.y, currentPoint.z + 0.15]} args={[0.15, 32, 32]}>
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
        </Sphere>
      )}

      {/* Gradient arrow */}
      {showGradient && currentPoint && currentPoint.gradNorm > 0.01 && <GradientArrow point={currentPoint} />}
    </group>
  )
}

function GradientArrow({ point }: { point: OptimizerStep }) {
  const scale = Math.min(point.gradNorm * 0.3, 1.5)
  const direction = new THREE.Vector3(-point.gradX, -point.gradY, 0).normalize()

  return (
    <group position={[point.x, point.y, point.z + 0.2]}>
      <arrowHelper args={[direction, new THREE.Vector3(0, 0, 0), scale, 0x22c55e, scale * 0.3, scale * 0.15]} />
    </group>
  )
}

function ContourPlane({
  lossFn,
  range,
}: {
  lossFn: (x: number, y: number) => number
  range: { x: [number, number]; y: [number, number] }
}) {
  const resolution = 100
  const canvas = useMemo(() => {
    const cnv = document.createElement("canvas")
    cnv.width = resolution
    cnv.height = resolution
    const ctx = cnv.getContext("2d")!

    // Calculate Z values
    const zValues: number[][] = []
    let minZ = Number.POSITIVE_INFINITY
    let maxZ = Number.NEGATIVE_INFINITY

    for (let j = 0; j < resolution; j++) {
      zValues[j] = []
      for (let i = 0; i < resolution; i++) {
        const x = range.x[0] + (i / (resolution - 1)) * (range.x[1] - range.x[0])
        const y = range.y[0] + (j / (resolution - 1)) * (range.y[1] - range.y[0])
        let z = lossFn(x, y)
        if (!isFinite(z)) z = 0
        z = Math.min(Math.max(z, -50), 50)
        zValues[j][i] = z
        if (z < minZ) minZ = z
        if (z > maxZ) maxZ = z
      }
    }

    // Draw contour map
    const zRange = maxZ - minZ || 1
    for (let j = 0; j < resolution; j++) {
      for (let i = 0; i < resolution; i++) {
        const t = (zValues[j][i] - minZ) / zRange
        const hue = (1 - t) * 240
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
        ctx.fillRect(i, resolution - 1 - j, 1, 1)
      }
    }

    return cnv
  }, [lossFn, range])

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [canvas])

  const planeZ = -10

  return (
    <mesh position={[(range.x[0] + range.x[1]) / 2, (range.y[0] + range.y[1]) / 2, planeZ]}>
      <planeGeometry args={[range.x[1] - range.x[0], range.y[1] - range.y[0]]} />
      <meshBasicMaterial map={texture} transparent opacity={0.7} />
    </mesh>
  )
}

function AxisLabels({ range }: { range: { x: [number, number]; y: [number, number] } }) {
  return (
    <group>
      <Html position={[range.x[1] + 0.5, 0, 0]} center>
        <span className="text-xs font-mono text-muted-foreground bg-background/80 px-1 rounded">X</span>
      </Html>
      <Html position={[0, range.y[1] + 0.5, 0]} center>
        <span className="text-xs font-mono text-muted-foreground bg-background/80 px-1 rounded">Y</span>
      </Html>
      <Html position={[0, 0, 15]} center>
        <span className="text-xs font-mono text-muted-foreground bg-background/80 px-1 rounded">Loss</span>
      </Html>
    </group>
  )
}

function Scene({ lossFn, range, path, currentStep, onSurfaceClick, showGradient }: Surface3DProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[-10, -10, 5]} intensity={0.4} />

      <LossSurface lossFn={lossFn} range={range} onSurfaceClick={onSurfaceClick} />
      <ContourPlane lossFn={lossFn} range={range} />
      <OptimizerPath path={path} currentStep={currentStep} showGradient={showGradient} />
      <AxisLabels range={range} />

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={5} maxDistance={50} />
      <gridHelper args={[20, 20, "#4b5563", "#374151"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -10.01]} />
    </>
  )
}

export function Surface3D(props: Surface3DProps) {
  return (
    <div className="w-full h-full bg-[#0f1419] rounded-lg overflow-hidden">
      <Canvas camera={{ position: [12, 12, 15], fov: 50 }} gl={{ antialias: true }}>
        <Scene {...props} />
      </Canvas>
    </div>
  )
}
