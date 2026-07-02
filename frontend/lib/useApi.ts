"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";

export function useBackendToken(): string | undefined {
  const { data: session } = useSession();
  return session?.backendToken;
}

interface UseApiOptions {
  /** Re-fetch every N ms (e.g. incident polling). */
  pollMs?: number;
  /** Skip fetching until true. */
  enabled?: boolean;
}

export function useApi<T>(path: string | null, options: UseApiOptions = {}) {
  const { data: session, status } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathRef = useRef(path);
  pathRef.current = path;

  const enabled = options.enabled !== false && status === "authenticated" && path !== null;
  const token = session?.backendToken;

  const load = useCallback(async () => {
    if (!pathRef.current || !token) return;
    try {
      const result = await apiFetch<T>(pathRef.current, token);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    load();
  }, [enabled, load, path]);

  useEffect(() => {
    if (!enabled || !options.pollMs) return;
    const timer = setInterval(load, options.pollMs);
    return () => clearInterval(timer);
  }, [enabled, options.pollMs, load]);

  return { data, error, loading: loading && enabled, refresh: load, token };
}
