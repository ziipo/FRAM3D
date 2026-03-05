import { useEffect, useRef, useCallback } from 'react';
import { useFrameStore, selectFrameParams } from '../store/useFrameStore';
import { useShallow } from 'zustand/react/shallow';
import type { WorkerResponse, GenerateMessage, SplitExportMessage } from '../types/frame';
import { getBuildPlatePreset } from '../data/buildPlates';

// Import worker as URL for Vite
import WorkerUrl from './worker.ts?worker&url';

/**
 * Hook to manage the frame generation Web Worker.
 * Automatically regenerates when parameters change.
 */
export function useFrameWorker() {
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useFrameStore(useShallow(selectFrameParams));
  
  // Build plate settings (for triggering regeneration)
  const buildPlateEnabled = useFrameStore((s) => s.buildPlateEnabled);
  const buildPlatePresetId = useFrameStore((s) => s.buildPlatePresetId);
  const buildPlateCustomWidth = useFrameStore((s) => s.buildPlateCustomWidth);
  const buildPlateCustomDepth = useFrameStore((s) => s.buildPlateCustomDepth);

  const setGenerating = useFrameStore((s) => s.setGenerating);
  const setProgress = useFrameStore((s) => s.setProgress);
  const setError = useFrameStore((s) => s.setError);
  const setMeshData = useFrameStore((s) => s.setMeshData);
  const setSplitParts = useFrameStore((s) => s.setSplitParts);
  const setStlData = useFrameStore((s) => s.setStlData);
  const setThreemfData = useFrameStore((s) => s.setThreemfData);
  const setSplitExporting = useFrameStore((s) => s.setSplitExporting);
  const setSplitExportResult = useFrameStore((s) => s.setSplitExportResult);
  const setTriggerSplitExport = useFrameStore((s) => s.setTriggerSplitExport);

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(WorkerUrl, { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      switch (response.type) {
        case 'result':
          setMeshData(response.mesh);
          setSplitParts(response.splitParts || null);
          setStlData(response.stlData);
          setThreemfData(response.threemfData);
          setGenerating(false);
          break;

        case 'split-export-result':
          setSplitExportResult(response.zipData, response.splitInfo);
          if (response.diagnosticSvgs && response.diagnosticSvgs.length > 0) {
            console.log(`[FrameForge] ${response.diagnosticSvgs.length} diagnostic SVG(s) generated`);
            (globalThis as Record<string, unknown>).__diagnosticSvgs = response.diagnosticSvgs;
          }
          break;

        case 'progress':
          setProgress(response.percent, response.stage);
          break;

        case 'error':
          setError(response.error);
          setSplitExporting(false);
          break;
      }
    };

    worker.onerror = (event) => {
      setError(`Worker error: ${event.message}`);
      setSplitExporting(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [setGenerating, setProgress, setError, setMeshData, setSplitParts, setStlData, setThreemfData, setSplitExporting, setSplitExportResult]);

  // Generate function
  const generate = useCallback(() => {
    if (!workerRef.current) return;

    setGenerating(true);
    setError(null);

    const preset = getBuildPlatePreset(buildPlatePresetId);

    const plateWidth = buildPlatePresetId === 'custom'
      ? buildPlateCustomWidth
      : preset?.width ?? 220;
    const plateDepth = buildPlatePresetId === 'custom'
      ? buildPlateCustomDepth
      : preset?.depth ?? 220;

    const message: GenerateMessage = {
      type: 'generate',
      params,
      buildPlate: buildPlateEnabled ? { width: plateWidth, depth: plateDepth } : undefined,
    };

    workerRef.current.postMessage(message);
  }, [
    params, 
    buildPlateEnabled, buildPlatePresetId, buildPlateCustomWidth, buildPlateCustomDepth,
    setGenerating, setError
  ]);

  // Split export function
  const splitExport = useCallback(() => {
    if (!workerRef.current) return;

    const preset = getBuildPlatePreset(buildPlatePresetId);

    const plateWidth = buildPlatePresetId === 'custom'
      ? buildPlateCustomWidth
      : preset?.width ?? 220;
    const plateDepth = buildPlatePresetId === 'custom'
      ? buildPlateCustomDepth
      : preset?.depth ?? 220;

    setSplitExporting(true);
    setError(null);

    const message: SplitExportMessage = {
      type: 'split-export',
      params,
      buildPlate: { width: plateWidth, depth: plateDepth },
    };

    workerRef.current.postMessage(message);
  }, [
    params, 
    buildPlatePresetId, buildPlateCustomWidth, buildPlateCustomDepth,
    setSplitExporting, setError
  ]);

  // Register splitExport in the store so ExportButton can call it
  useEffect(() => {
    setTriggerSplitExport(splitExport);
    return () => setTriggerSplitExport(null);
  }, [splitExport, setTriggerSplitExport]);

  // Debounced regeneration when params change
  useEffect(() => {
    // Cancel any pending generation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Schedule new generation after debounce delay
    debounceRef.current = setTimeout(() => {
      generate();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [generate]);

  return { generate };
}
