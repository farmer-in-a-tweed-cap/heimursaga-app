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
  | 'entry_id'
  | 'journey_id'
  | 'search'
  | 'user';

type Params = Partial<Record<ParamKey, string | null>>;

const parse = (
  searchParams: ReadonlyURLSearchParams,
  defaultParams?: Params,
): Params => {
  try {
    const paramKeys = Array.from(searchParams.keys()) as ParamKey[];
    const params: Params = { ...defaultParams };

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

export function useAppParams(defaultParams?: Params) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [params, _setParams] = useState<Params>(
    parse(searchParams, defaultParams),
  );

  const setParams = (params: Partial<Params>) => {
    _setParams((prev) => ({ ...prev, ...params }));
  };

  const updateParams = (params: Partial<Params>) => {
    const keys = Object.keys(params) as ParamKey[];
    const s = new URLSearchParams(searchParams.toString());

    keys.forEach((key) => {
      const value = key ? params[key] : null;
      if (value === null) {
        s.delete(key);
      } else {
        s.set(key, `${value}`);
      }
    });

    // update params
    router.push(`${pathname}?${s.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!params) return;
    updateParams(params);
  }, [params]);

  return {
    params,
    setParams,
  };
}
