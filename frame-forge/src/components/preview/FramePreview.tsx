import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useFrameStore } from '../../store/useFrameStore';
import { useFrameWorker } from '../../engine/useFrameWorker';
import { meshToThreeGeometry } from '../../engine/bridge';

function FrameMesh() {
  const meshData = useFrameStore((s) => s.meshData);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    if (!meshData) return null;
    return meshToThreeGeometry(meshData);
  }, [meshData]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#b8b8b8"
        metalness={0.1}
        roughness={0.6}
        flatShading={true}
      />
    </mesh>
  );
}

/**
 * Internal component to handle view resets via store state
 */
function ViewManager() {
  const { camera, controls } = useThree();
  const resetView = useFrameStore((s) => s.resetView);
  
  useEffect(() => {
    if (resetView > 0) {
      // Reset camera position
      camera.position.set(200, 150, 200);
      camera.lookAt(0, 0, 0);
      
      // Reset OrbitControls
      if (controls) {
        // @ts-expect-error - controls is unknown but we know it's OrbitControls
        controls.reset();
      }
    }
  }, [resetView, camera, controls]);

  return null;
}

function ResetViewButton() {
  const requestResetView = useFrameStore((s) => s.requestResetView);

  return (
    <button
      onClick={requestResetView}
      className="absolute bottom-4 right-4 bg-neutral-800/80 hover:bg-neutral-700 text-white p-2 rounded-full shadow-lg transition-colors z-20"
      title="Reset View"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
  );
}

function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.3}
      />

      {/* Grid for scale reference */}
      <Grid
        args={[300, 300]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#404040"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#505050"
        fadeDistance={400}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {/* Frame mesh */}
      <Center>
        <FrameMesh />
      </Center>

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={50}
        maxDistance={1000}
      />
      
      {/* View state manager */}
      <ViewManager />
    </>
  );
}

function LoadingOverlay() {
  const isGenerating = useFrameStore((s) => s.isGenerating);
  const progress = useFrameStore((s) => s.progress);
  const progressStage = useFrameStore((s) => s.progressStage);

  if (!isGenerating) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
      <div className="bg-neutral-800 rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <div className="text-white font-medium">{progressStage || 'Generating...'}</div>
            <div className="text-neutral-400 text-sm">{progress}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorOverlay() {
  const error = useFrameStore((s) => s.error);

  if (!error) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
      <div className="bg-red-900/90 rounded-lg p-6 shadow-xl max-w-md">
        <div className="text-red-200 font-medium mb-2">Generation Error</div>
        <div className="text-red-100 text-sm">{error}</div>
      </div>
    </div>
  );
}

export function FramePreview() {
  // Initialize worker and trigger generation
  useFrameWorker();

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{
          position: [200, 150, 200],
          fov: 45,
          near: 1,
          far: 5000,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
        }}
      >
        <Scene />
      </Canvas>
      <ResetViewButton />
      <LoadingOverlay />
      <ErrorOverlay />
    </div>
  );
}
