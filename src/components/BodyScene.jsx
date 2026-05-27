'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Suspense, useRef, useEffect } from 'react'
import HumanBodyModel from './HumanBodyModel'

/**
 * Momentum-based rotation:
 *   - autoRotate starts ON (slow ambient spin)
 *   - 'start' → immediately kill autoRotate
 *   - 'end'   → re-enable autoRotate after 2.2 s so inertia fully decays first
 *   - dampingFactor 0.04 = long natural coast when spun fast,
 *     clean stop when dragged slowly to a halt
 */
function SmartOrbitControls() {
  const controlsRef = useRef()
  const timerRef    = useRef(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const onStart = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controls.autoRotate = false
    }

    const onEnd = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true
      }, 2200)
    }

    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
    }
  }, [])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={3}
      maxDistance={9}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI * 5 / 6}
      autoRotate
      autoRotateSpeed={0.65}
      enableDamping
      dampingFactor={0.04}
    />
  )
}

export default function BodyScene({ onRegionClick, selectedPoint }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 50 }}
      style={{ background: 'transparent' }}
      gl={{ powerPreference: 'high-performance', antialias: true, alpha: true }}
      shadows
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
      }}
    >
      <Suspense fallback={null}>
        <HumanBodyModel onRegionClick={onRegionClick} selectedPoint={selectedPoint} />
      </Suspense>

      {/* Sci-fi lighting — cool whites + blues only */}
      <ambientLight intensity={0.15} color="#001832" />
      <directionalLight intensity={2.2} position={[2, 5, 4]} color="#c8e8ff"
        castShadow shadow-mapSize={[1024, 1024]} shadow-camera-far={20} />
      <directionalLight intensity={1.3} position={[-3, 0.5, -2.5]} color="#0044cc" />
      <pointLight intensity={1.1} position={[0, 0, 6]} color="#00ccff" distance={12} />

      {selectedPoint && (
        <pointLight position={selectedPoint} intensity={4.0}
          distance={1.6} decay={2} color="#ff2200" />
      )}

      <Environment preset="night" />
      <SmartOrbitControls />
    </Canvas>
  )
}
