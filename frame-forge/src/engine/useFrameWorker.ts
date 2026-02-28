import { useEffect, useRef, useCallback } from 'react';
import { useFrameStore, selectFrameParams } from '../store/useFrameStore';
import { useShallow } from 'zustand/react/shallow';
import type { WorkerResponse, GenerateMessage } from '../types/frame';

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
  const setGenerating = useFrameStore((s) => s.setGenerating);
  const setProgress = useFrameStore((s) => s.setProgress);
  const setError = useFrameStore((s) => s.setError);
  const setMeshData = useFrameStore((s) => s.setMeshData);
  const setStlData = useFrameStore((s) => s.setStlData);

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(WorkerUrl, { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      switch (response.type) {
        case 'result':
          setMeshData(response.mesh);
          setStlData(response.stlData);
          setGenerating(false);
          break;

        case 'progress':
          setProgress(response.percent, response.stage);
          break;

        case 'error':
          setError(response.error);
          break;
      }
    };

    worker.onerror = (event) => {
      setError(`Worker error: ${event.message}`);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [setGenerating, setProgress, setError, setMeshData, setStlData]);

  // Generate function
  const generate = useCallback(() => {
    if (!workerRef.current) return;

    setGenerating(true);
    setError(null);

    const message: GenerateMessage = {
      type: 'generate',
      params,
    };

    workerRef.current.postMessage(message);
  }, [params, setGenerating, setError]);

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
