import { SourceSpecification } from 'mapbox-gl';

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

    sources.forEach(({ source: id, data, config }) => {
      let source: SourceSpecification = {
        type: 'geojson',
        data: toGeoJson({ mode: id, data }),
      };

      if (config?.cluster) {
        source.cluster = true;
        source.clusterMaxZoom = 10;
        source.clusterRadius = 50;
      }

      mapbox.addSource(id, source);
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
