declare module '@mapbox/polyline' {
  function encode(coordinates: number[][], precision?: number): string;
  function decode(encoded: string, precision?: number): number[][];
  const polyline: { encode: typeof encode; decode: typeof decode };
  export default polyline;
}
