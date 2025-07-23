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


    sources.forEach(({ sourceId, type, data, config }) => {
      const source = mapbox.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(
          toGeoJson({
            type,
            data: data.map(({ id, lat, lon, properties }) => ({
              id,
              lat,
              lon,
              properties,
            })),
          }),
        );
      } else {
        // Source doesn't exist, add it
        let sourceSpec: SourceSpecification = {
          type: 'geojson',
          data: toGeoJson({ type, data }),
        };

        if (config?.cluster) {
          sourceSpec.cluster = true;
          sourceSpec.clusterMaxZoom = 10;
          sourceSpec.clusterRadius = 50;
        }

        mapbox.addSource(sourceId, sourceSpec);
      }
    });
  } catch (e) {
    console.error(e);
  }
};
