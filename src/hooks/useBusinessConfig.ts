import { useEffect, useState } from 'react';
import type { BusinessConfig } from '../types/support';
import {
  applyBusinessConfigFromServer,
  getActiveBusinessConfig,
  subscribeBusinessConfig,
} from '../config/businessConfig';

let hydrationPromise: Promise<BusinessConfig> | null = null;

export async function ensureBusinessConfigLoaded(): Promise<BusinessConfig> {
  if (typeof fetch !== 'function') {
    return getActiveBusinessConfig();
  }
  if (!hydrationPromise) {
    hydrationPromise = fetch('/api/config/business')
      .then(async (res) => {
        if (!res.ok) return getActiveBusinessConfig();
        const json = (await res.json()) as {
          success?: boolean;
          config?: Partial<BusinessConfig>;
        };
        if (json?.success && json.config) {
          return applyBusinessConfigFromServer(json.config);
        }
        return getActiveBusinessConfig();
      })
      .catch(() => getActiveBusinessConfig());
  }
  return hydrationPromise;
}

export function useBusinessConfig(): BusinessConfig {
  const [config, setConfig] = useState<BusinessConfig>(() => getActiveBusinessConfig());

  useEffect(() => {
    const unsubscribe = subscribeBusinessConfig((next) => {
      setConfig(next);
    });
    void ensureBusinessConfigLoaded().then((loaded) => {
      setConfig(loaded);
    });
    return unsubscribe;
  }, []);

  return config;
}
