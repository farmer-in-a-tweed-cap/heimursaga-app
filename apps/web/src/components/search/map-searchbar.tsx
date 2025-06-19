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
  value?: string | null;
  query: string | null;
  onChange?: (value: string) => void;
  onClear?: () => void;
  onSubmit?: MapSearchbarSubmitHandler;
};

export const MapSearchbar: React.FC<Props> = ({
  value = null,
  query = null,
  onChange,
  onClear,
  onSubmit,
}) => {
  const mapbox = useMapbox();

  const [search] = useDebounce(value, 500, { leading: true });
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<MapSearchItem[]>([]);

  const handleSearch = async (search: string) => {
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

      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const handleSubmit = (resultId: string) => {
    const result = results.find(({ id }) => id === resultId);
    if (!result) return;

    const query = result.name;

    if (onChange) {
      onChange(query);
    }

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
    if (value) {
      setResults((prev) => {
        const results =
          prev.filter(({ id }) => id !== SEARCHBAR_CUSTOM_ITEM_ID) || [];
        return [{ id: SEARCHBAR_CUSTOM_ITEM_ID, name: value }, ...results];
      });
    }
  }, [value]);

  useEffect(() => {
    if (!search) return;
    handleSearch(search);
  }, [search]);

  return (
    <Searchbar
      loading={loading}
      value={value || undefined}
      results={results}
      clear={query ? true : false}
      onResultClick={handleSubmit}
      onChange={onChange}
      onClear={onClear}
    />
  );
};
