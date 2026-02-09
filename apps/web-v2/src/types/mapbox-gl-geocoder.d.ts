declare module '@mapbox/mapbox-gl-geocoder' {
  import { IControl } from 'mapbox-gl';

  interface GeocoderOptions {
    accessToken: string;
    mapboxgl?: any;
    marker?: boolean;
    placeholder?: string;
    proximity?: { longitude: number; latitude: number };
    types?: string;
    countries?: string;
    language?: string;
    limit?: number;
    minLength?: number;
    bbox?: [number, number, number, number];
    filter?: (feature: any) => boolean;
    localGeocoder?: (query: string) => any[];
    reverseGeocode?: boolean;
    enableEventLogging?: boolean;
    collapsed?: boolean;
    clearAndBlurOnEsc?: boolean;
    clearOnBlur?: boolean;
    flyTo?: boolean | object;
    trackProximity?: boolean;
    zoom?: number;
  }

  class MapboxGeocoder implements IControl {
    constructor(options: GeocoderOptions);
    onAdd(map: any): HTMLElement;
    onRemove(): void;
    on(event: string, callback: (result: any) => void): this;
    off(event: string, callback: (result: any) => void): this;
    setInput(value: string): this;
    setProximity(proximity: { longitude: number; latitude: number }): this;
    getProximity(): { longitude: number; latitude: number };
    setLanguage(language: string): this;
    getLanguage(): string;
    setZoom(zoom: number): this;
    getZoom(): number;
    setFlyTo(flyTo: boolean | object): this;
    getFlyTo(): boolean | object;
    setPlaceholder(placeholder: string): this;
    getPlaceholder(): string;
    setCountries(countries: string): this;
    getCountries(): string;
    setTypes(types: string): this;
    getTypes(): string;
    setMinLength(minLength: number): this;
    getMinLength(): number;
    setLimit(limit: number): this;
    getLimit(): number;
    setFilter(filter: (feature: any) => boolean): this;
    getFilter(): (feature: any) => boolean;
    setOrigin(origin: string): this;
    getOrigin(): string;
    query(query: string): this;
    clear(): this;
  }

  export default MapboxGeocoder;
}
