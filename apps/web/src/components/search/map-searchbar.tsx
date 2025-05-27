'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { useMapbox } from '@/hooks';

import { Searchbar } from './searchbar';

export type MapSearchbarLocationChangeHandler = (data: {
  bounds: { sw: [number, number]; ne: [number, number] };
}) => void;

type MapSearchResult = {
  id: string;
  name: string;
  context: string;
  center: [number, number];
  bounds: [number, number, number, number];
};

type Props = { onLocationChange?: MapSearchbarLocationChangeHandler };

export const MapSearchbar: React.FC<Props> = ({ onLocationChange }) => {
  const mapbox = useMapbox();

  const [_search, setSearch] = useState<string | undefined>();
  const [search] = useDebounce(_search, 500, { leading: true });
  const [loading, setLoading] = useState<boolean>(false);

  const [results, setResults] = useState<MapSearchResult[]>([]);

  const fetchResults = async (query: string) => {
    try {
      console.log('search:', query);

      setLoading(true);

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapbox.token}&limit=10&types=country,place&autocomplete=true&language=en`;
      const response = await fetch(url, { method: 'GET' });

      const json = await response.json();
      const features = (json?.features as any[]) || [];

      const results = features.map(
        ({ id, bbox, text, center, context = [] }) =>
          ({
            id,
            name: text,
            context: context.map(({ text }: any) => text).join(', '),
            bounds: bbox,
            center,
          }) satisfies MapSearchResult,
      );

      console.log(features);

      setResults(results);
      setLoading(false);
    } catch (e) {
      console.log(e);

      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    if (!value) return;
    setSearch(value);
  };

  const handleResultClick = (id: string) => {
    const result = results.find((el) => el.id === id);

    if (result && onLocationChange) {
      onLocationChange({
        bounds: {
          sw: [result.bounds[0], result.bounds[1]],
          ne: [result.bounds[2], result.bounds[3]],
        },
      });
    }
  };

  useEffect(() => {
    if (!search) return;
    fetchResults(search);
  }, [search]);

  return (
    <Searchbar
      loading={loading}
      value={search}
      results={results.map(({ id, name, context }) => ({ id, name, context }))}
      onChange={handleChange}
      onResultClick={handleResultClick}
    />
  );
};
