'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { apiClient } from '@/lib/api';

import { useMapbox } from '@/hooks';

import { SEARCHBAR_CUSTOM_ITEM_ID, Searchbar } from './searchbar';

type MapSearchItem = {
  id: string;
  name: string;
  context?: string;
  center?: [number, number];
  bounds?: [number, number, number, number];
};

export type MapSearchbarChangeHandler = (data: {
  search: string;
  items: MapSearchItem[];
}) => void;

export type MapSearchbarSubmitHandler = (data: {
  context: 'text' | 'location';
  item: MapSearchItem;
}) => void;

type Props = {
  value?: string;
  onChange?: MapSearchbarChangeHandler;
  onSubmit?: MapSearchbarSubmitHandler;
};

export const MapSearchbar: React.FC<Props> = ({
  value,
  onChange,
  onSubmit,
}) => {
  const mapbox = useMapbox();

  const [_search, setSearch] = useState<string | undefined>(value);
  const [search] = useDebounce(_search, 500, { leading: true });

  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<MapSearchItem[]>([]);

  const handleChange = (search: string) => {
    if (!search) return;

    setSearch(search);

    // update the state
    setResults((prev) => {
      const results = prev.filter(({ id }) => id !== SEARCHBAR_CUSTOM_ITEM_ID);
      return [{ id: SEARCHBAR_CUSTOM_ITEM_ID, name: search }, ...results];
    });
  };

  const handleChangeDebounded = async (search: string) => {
    try {
      if (!search || !mapbox.token) return;

      setLoading(true);

      // fetch results
      const results = await apiClient.mapbox
        .search({
          token: mapbox.token,
          search,
        })
        .then(({ items }) => items);

      // update the state
      setResults((prev) => {
        const searchItem = prev.find(
          ({ id }) => id === SEARCHBAR_CUSTOM_ITEM_ID,
        );
        if (searchItem) {
          return [searchItem, ...results];
        } else {
          return results;
        }
      });

      // update the external state
      if (onChange) {
        onChange({
          search,
          items: results.map(({ id, name, context, center, bounds }) => ({
            id,
            name,
            context,
            center,
            bounds,
          })),
        });
      }

      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const handleResultClick = (resultId: string) => {
    const result = results.find(({ id }) => id === resultId);
    if (!result) return;

    if (onSubmit) {
      if (result.id === SEARCHBAR_CUSTOM_ITEM_ID) {
        onSubmit({
          context: 'text',
          item: result,
        });
      } else {
        onSubmit({
          context: 'location',
          item: result,
        });
      }
    }
  };

  useEffect(() => {
    if (!search) return;
    handleChangeDebounded(search);
  }, [search]);

  return (
    <Searchbar
      loading={loading}
      value={search}
      results={results}
      onChange={handleChange}
      onResultClick={handleResultClick}
    />
  );
};
