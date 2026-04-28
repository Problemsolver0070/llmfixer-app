import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type ModelEntry = {
  id: string;
  display_name: string;
  provider: string;
  description: string;
};

export type ProviderTeaser = {
  provider: string;
  display_name: string;
  description: string;
};

export type Catalog = {
  available: ModelEntry[];
  coming_soon: ProviderTeaser[];
};

let cached: Catalog | null = null;

export function __resetModelsCacheForTests() {
  cached = null;
}

export function useModels() {
  const [data, setData] = useState<Catalog | null>(cached);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(cached === null);

  useEffect(() => {
    if (cached !== null) return;
    let cancelled = false;
    api<Catalog>('/v1/models/catalog')
      .then((c) => {
        if (cancelled) return;
        cached = c;
        setData(c);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
