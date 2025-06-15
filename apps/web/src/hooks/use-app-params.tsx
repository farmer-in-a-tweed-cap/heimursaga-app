'use client';

import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useEffect, useState } from 'react';

type ParamKey =
  | 'context'
  | 'filter'
  | 'lat'
  | 'lon'
  | 'zoom'
  | 'post_id'
  | 'search'
  | 'user';

type ParamState = Partial<Record<ParamKey, string | null>>;

const parseSearchParams = (
  searchParams: ReadonlyURLSearchParams,
  defaultParams?: ParamState,
): ParamState => {
  try {
    const paramKeys = Array.from(searchParams.keys()) as ParamKey[];
    const params: ParamState = { ...defaultParams };

    paramKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        params[key] = value;
      }
    });

    return params;
  } catch (e) {
    return {};
  }
};

export function useAppParams(defaultParams?: ParamState) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [params, setParams] = useState<ParamState>(
    parseSearchParams(searchParams, defaultParams),
  );

  const updateParams = (state: Partial<ParamState>) => {
    const keys = Object.keys(state) as ParamKey[];
    const s = new URLSearchParams(searchParams.toString());

    // match params
    keys.forEach((key) => {
      const value = state[key];
      if (value) {
        s.set(key, `${value}`);
      } else {
        if (value === null) {
          s.delete(key);
        }
      }
    });

    // update params
    router.push(`${pathname}?${s.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (searchParams) {
      setParams(parseSearchParams(searchParams));
    }
  }, [searchParams]);

  useEffect(() => {
    if (defaultParams) {
      setParams({ ...defaultParams, ...params });
      updateParams({ ...defaultParams, ...params });
    }
  }, []);

  return {
    params,
    updateParams,
  };
}
