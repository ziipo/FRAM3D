import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useFrameStore } from '../../store/useFrameStore';
import { useFrameWorker } from '../../engine/useFrameWorker';
import { meshToThreeGeometry } from '../../engine/bridge';

function FrameMesh() {
  const meshData = useFrameStore((s) => s.meshData);
  const splitParts = useFrameStore((s) => s.splitParts);
  const explosionGap = useFrameStore((s) => s.explosionGap);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    if (!meshData) return null;
    return meshToThreeGeometry(meshData);
  }, [meshData]);

  // If we have split parts, render them instead of the single mesh
  if (splitParts && splitParts.length > 0) {
    return (
      <group>
        {splitParts.map((part, i) => (
          <ExplodedPart key={`${part.name}-${i}`} part={part} gap={explosionGap} allParts={splitParts} />
        ))}
      </group>
    );
  }

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

function ExplodedPart({ part, gap, allParts }: { part: any, gap: number, allParts: any[] }) {
  const geometry = useMemo(() => meshToThreeGeometry(part), [part]);
  
  // Calculate offset based on worldPos and explosion gap
  const position = useMemo(() => {
    const basePos = part.worldPos || [0, 0, 0];
    const offset: [number, number, number] = [...basePos];
    
    if (gap === 0) return offset;
    
    const name = part.name.toLowerCase();
    
    // Determine which side this part belongs to
    let sidePrefix = '';
    if (name.includes('top')) sidePrefix = 'top';
    else if (name.includes('bottom')) sidePrefix = 'bottom';
    else if (name.includes('left')) sidePrefix = 'left';
    else if (name.includes('right')) sidePrefix = 'right';

    // Side explosion (pull the whole side away from the center)
    const sideFactor = 1.0;
    if (sidePrefix === 'top') offset[1] += gap * sideFactor;
    if (sidePrefix === 'bottom') offset[1] -= gap * sideFactor;
    if (sidePrefix === 'left') offset[0] -= gap * sideFactor;
    if (sidePrefix === 'right') offset[0] += gap * sideFactor;
    
    // Count how many pieces this side is split into (e.g. 'top-1.stl', 'top-2.stl')
    const sideParts = allParts.filter(p => p.name.startsWith(sidePrefix + '-'));
    const pieceCount = sideParts.length;

    if (name.includes('tenon')) {
      // Tenon sits between piece idx and idx+1. Effective index is idx + 0.5.
      const tenonMatch = name.match(/tenon-[a-z]+-(\d+)\.stl/);
      if (tenonMatch && pieceCount > 1) {
        const tIdx = parseInt(tenonMatch[1]);
        const shift = (tIdx + 0.5) - (pieceCount + 1) / 2;
        
        if (sidePrefix === 'top' || sidePrefix === 'bottom') {
          offset[0] += shift * gap;
        } else {
          offset[1] += shift * gap;
        }
      }
    } else {
      // Regular frame piece
      const match = name.match(/-(\d+)\.stl/);
      if (match && pieceCount > 1) {
        const idx = parseInt(match[1]); // 1-based
        const shift = idx - (pieceCount + 1) / 2;
        
        if (sidePrefix === 'top' || sidePrefix === 'bottom') {
          // Split along X axis
          offset[0] += shift * gap;
        } else {
          // Split along Y axis
          offset[1] += shift * gap;
        }
      }
    }
    
    return offset;
  }, [part.name, part.worldPos, gap, allParts]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <meshStandardMaterial
        color={part.name.includes('tenon') ? "#4a90e2" : "#b8b8b8"}
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
