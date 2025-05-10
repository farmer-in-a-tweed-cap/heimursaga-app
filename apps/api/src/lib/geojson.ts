import { GeoJson } from '@repo/types';

type GeoJsonFeature<T = any> = {
  lat: number;
  lon: number;
  properties: T;
};

export const toGeoJson = <T = any>(
  dataType: 'collection',
  features: GeoJsonFeature<T>[],
): GeoJson<T> => {
  switch (dataType) {
    case 'collection':
      return {
        type: 'FeatureCollection',
        features: features.map(({ lat, lon, properties }) => ({
          type: 'Feature',
          properties,
          geometry: {
            type: 'Point',
            coordinates: [lon, lat, 0.0],
          },
        })),
      };
  }
};
