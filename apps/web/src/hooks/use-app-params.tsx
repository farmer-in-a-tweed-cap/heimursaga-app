'use client';

import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useEffect, useState } from 'react';

import { SEARCH_PARAMS } from '@/constants';

const PARAM_KEYS = [
  SEARCH_PARAMS.CONTEXT,
  SEARCH_PARAMS.FILTER,
  SEARCH_PARAMS.CONTEXT,
  SEARCH_PARAMS.LAT,
  SEARCH_PARAMS.LON,
  SEARCH_PARAMS.ZOOM,
  SEARCH_PARAMS.POST_ID,
  SEARCH_PARAMS.SEARCH,
  SEARCH_PARAMS.USER,
];

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
    const paramKeys = searchParams.keys().toArray() as ParamKey[];
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

  const params: ParamState = {
    lat: searchParams.get(SEARCH_PARAMS.LAT),
    lon: searchParams.get(SEARCH_PARAMS.LON),
    zoom: searchParams.get(SEARCH_PARAMS.ZOOM),
  };

  // const [params, setParams] = useState<ParamState>(
  //   {
  //     lat: searchParams.get(SEARCH_PARAMS.LAT),
  //     lon: searchParams.get(SEARCH_PARAMS.LON),
  //     zoom: searchParams.get(SEARCH_PARAMS.ZOOM),
  //   },
  //   // parseSearchParams(searchParams, defaultParams),
  // );

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

  // useEffect(() => {
  //   setParams(parseSearchParams(searchParams, defaultParams));
  // }, [searchParams, defaultParams]);

  // useEffect(() => {
  //   if (defaultParams) {
  //     updateParams({ ...defaultParams, ...params });
  //   }
  // }, []);

  return {
    params,
    updateParams,
  };
}
