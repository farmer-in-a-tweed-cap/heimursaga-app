type GeoJsonFeature<T = any> = {
  lat: number;
  lon: number;
  properties: T;
};

export const toGeoJson = <T = any>({
  mode,
  data,
}: {
  mode: string;
  data: GeoJsonFeature<T>[];
}): GeoJSON.GeoJSON => {
  switch (mode) {
    default:
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
      };
  }
};
