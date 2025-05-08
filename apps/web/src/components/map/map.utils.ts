import { toGeoJson } from '@/lib';

import { MapSource } from './map';

export const addSources = ({
  mapbox,
  sources,
}: {
  mapbox: mapboxgl.Map;
  sources: MapSource[];
}) => {
  try {
    if (!mapbox) return;

    sources.forEach(({ source, data }) => {
      mapbox.addSource(source, {
        type: 'geojson',
        data: toGeoJson({ mode: source, data }),
      });
    });
  } catch (e) {
    console.error(e);
  }
};

export const updateSources = ({
  mapbox,
  sources,
}: {
  mapbox: mapboxgl.Map;
  sources: MapSource[];
}) => {
  try {
    if (!mapbox) return;

    sources.forEach(({ source: id, data }) => {
      const source = mapbox.getSource(id) as mapboxgl.GeoJSONSource;
      source.setData(
        toGeoJson({
          mode: id,
          data: data.map(({ lat, lon, properties }) => ({
            lat,
            lon,
            properties,
          })),
        }),
      );
    });
  } catch (e) {
    console.error(e);
  }
};
