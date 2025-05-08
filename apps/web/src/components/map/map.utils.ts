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

    sources.forEach(({ sourceId, type, data, config }) => {
      let source: SourceSpecification = {
        type: 'geojson',
        data: toGeoJson({ type, data }),
      };

      if (config?.cluster) {
        source.cluster = true;
        source.clusterMaxZoom = 10;
        source.clusterRadius = 50;
      }

      mapbox.addSource(sourceId, source);
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

    sources.forEach(({ sourceId, type, data }) => {
      const source = mapbox.getSource(sourceId) as mapboxgl.GeoJSONSource;
      source.setData(
        toGeoJson({
          type,
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
