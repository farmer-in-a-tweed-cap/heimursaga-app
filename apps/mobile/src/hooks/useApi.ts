import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from 'expo-router';
import { api, ApiError } from '@/services/api';

interface UseApiOptions {
  /** Re-fetch data when the screen regains focus (e.g. navigating back) */
  refetchOnFocus?: boolean;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(endpoint: string | null, options?: UseApiOptions): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!endpoint);
  const [error, setError] = useState<ApiError | null>(null);
  const [trigger, setTrigger] = useState(0);
  const resolversRef = useRef<Array<() => void>>([]);
  const hasFetchedRef = useRef(false);

  const refetch = useCallback(() => {
    return new Promise<void>((resolve) => {
      resolversRef.current.push(resolve);
      setTrigger((n) => n + 1);
    });
  }, []);

  // Refetch when screen regains focus (skips the initial focus)
  const navigation = useNavigation();
  useEffect(() => {
    if (!options?.refetchOnFocus || !endpoint) return;
    const unsubscribe = navigation.addListener('focus', () => {
      if (hasFetchedRef.current) {
        setTrigger((n) => n + 1);
      }
    });
    return unsubscribe;
  }, [navigation, options?.refetchOnFocus, endpoint]);

  useEffect(() => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<T>(endpoint)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err : new ApiError(0, String(err)));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          hasFetchedRef.current = true;
        }
        resolversRef.current.splice(0).forEach((r) => r());
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, trigger]);

  return { data, loading, error, refetch };
}

interface UseMutationState<TArgs extends unknown[], T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  mutate: (...args: TArgs) => Promise<T | undefined>;
  reset: () => void;
}

export function useMutation<TArgs extends unknown[], T>(
  fn: (...args: TArgs) => Promise<T>,
): UseMutationState<TArgs, T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        setData(result);
        return result;
      } catch (err) {
        const apiErr = err instanceof ApiError ? err : new ApiError(0, String(err));
        setError(apiErr);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, mutate, reset };
}
