type GeoJsonFeature<T = any> = {
  lat: number;
  lon: number;
  properties: T;
};

export const toGeoJson = <T = any>({
  type,
  data,
}: {
  type: 'point' | 'line';
  data: GeoJsonFeature<T>[];
}): GeoJSON.GeoJSON => {
  switch (type) {
    case 'point':
      return {
        type: 'FeatureCollection',
        features: data.map(({ lat, lon, properties }) => ({
          type: 'Feature',
          properties: { ...properties } as any,
          geometry: {
            type: 'Point',
            coordinates: [lon, lat, 0.0],
          },
        })),
      } as GeoJSON.GeoJSON;
    case 'line':
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: data.map(({ lat, lon }) => [lon, lat, 0.0]),
        },
      } as GeoJSON.GeoJSON;
  }
};
