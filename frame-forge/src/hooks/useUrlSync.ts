import { useEffect, useRef } from 'react';
import { useFrameStore, selectFrameParams } from '../store/useFrameStore';
import { useShallow } from 'zustand/react/shallow';
import { getParamsFromUrl, updateUrlHash } from '../utils/urlParams';

/**
 * Hook to sync frame parameters with URL hash.
 * - On mount, loads parameters from URL if present
 * - On parameter changes, updates URL hash (debounced)
 */
export function useUrlSync() {
  const params = useFrameStore(useShallow(selectFrameParams));
  const setParams = useFrameStore((s) => s.setParams);
  const isInitialMount = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load params from URL on initial mount
  useEffect(() => {
    const urlParams = getParamsFromUrl();
    if (urlParams && Object.keys(urlParams).length > 0) {
      setParams(urlParams);
    }
    isInitialMount.current = false;
  }, [setParams]);

  // Update URL when params change (debounced)
  useEffect(() => {
    // Skip on initial mount (we just loaded from URL)
    if (isInitialMount.current) return;

    // Cancel any pending update
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Schedule URL update
    debounceRef.current = setTimeout(() => {
      updateUrlHash(params);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [params]);
}
