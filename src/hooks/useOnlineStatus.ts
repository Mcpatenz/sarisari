/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

const SIMULATED_OFFLINE_KEY = 'tingipos_simulated_offline';

export function useOnlineStatus() {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSimulateOffline = () => {
    setSimulatedOffline(prev => {
      const next = !prev;
      localStorage.setItem(SIMULATED_OFFLINE_KEY, next.toString());
      return next;
    });
  };

  const isEffectivelyOnline = browserOnline && !simulatedOffline;

  return {
    isOnline: isEffectivelyOnline,
    browserOnline,
    simulatedOffline,
    toggleSimulateOffline,
  };
}
