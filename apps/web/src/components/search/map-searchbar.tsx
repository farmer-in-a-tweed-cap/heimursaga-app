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
  type?: 'location' | 'user' | 'entry' | 'text';
  center?: [number, number];
  bounds?: [number, number, number, number];
  // Additional data for non-location results
  username?: string;
  picture?: string;
  role?: string;
  title?: string;
  place?: string;
  lat?: number;
  lon?: number;
  author?: {
    username: string;
  };
};

export type MapSearchbarChangeHandler = (data: {
  search: string;
  items: MapSearchItem[];
}) => void;

export type MapSearchbarSubmitHandler = (data: {
  context: 'text' | 'location' | 'user' | 'entry';
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
      if (!search) return;
      
      setLoading(true);

      // Fetch all search results in parallel
      const [locationResults, searchResults] = await Promise.all([
        // Mapbox location search
        mapbox.token
          ? apiClient.mapbox
              .search({
                token: mapbox.token,
                search,
              })
              .then(({ items }) => 
                items.map(item => ({ ...item, type: 'location' as const }))
              )
              .catch(() => [])
          : Promise.resolve([]),
        
        // User and entry search
        apiClient.search({
          query: {},
          payload: { search },
        }).then(({ data }) => {
          if (!data?.data) return [];
          
          const { users = [], entries = [] } = data.data;
          
          return [
            // Map users
            ...users.map((user: any) => ({
              id: `user-${user.id}`,
              name: `@${user.username}`,
              context: user.role === 'CREATOR' ? 'Explorer Pro' : 'Explorer',
              type: 'user' as const,
              username: user.username,
              picture: user.picture,
              role: user.role,
            })),
            // Map entries
            ...entries.map((entry: any) => ({
              id: `entry-${entry.id}`,
              name: entry.title,
              context: `${entry.place} • @${entry.author.username}`,
              type: 'entry' as const,
              title: entry.title,
              place: entry.place,
              author: entry.author,
              lat: entry.lat,
              lon: entry.lon,
            })),
          ];
        }).catch((error) => {
          console.error('Search API error:', error);
          return [];
        })
      ]);

      // Prioritize entries by putting them first, then users, then locations
      const allResults = [...searchResults, ...locationResults];

      // update the state
      setResults((prev) => {
        const searchItem = prev.find(
          ({ id }) => id === SEARCHBAR_CUSTOM_ITEM_ID,
        );
        if (searchItem) {
          return [searchItem, ...allResults];
        } else {
          return allResults;
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
      } else if (result.type === 'user') {
        onSubmit({
          context: 'user',
          item: result,
        });
      } else if (result.type === 'entry') {
        onSubmit({
          context: 'entry',
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
