export interface ISearchQueryPayload {
  location?: ISearchQueryLocation;
  limit?: number;
  page?: number;
  userId?: number;
}

export interface ISearchQueryResponse {
  results: number;
  data: {
    id: string;
    title: string;
    content: string;
    date: Date;
    lat: number;
    lon: number;
  }[];
  geojson?: {
    type: string;
    features: {
      type: string;
      properties: Record<string, string | number | boolean | Date>;
      geometry: { type: string; coordinates: [number, number, number] };
    }[];
  };
}

export interface ISearchQueryLocation {
  bounds?: ISearchQueryLocationBounds;
}

export interface ISearchQueryLocationBounds {
  ne: ISearchQueryLocationBound;
  sw: ISearchQueryLocationBound;
}

export interface ISearchQueryLocationBound {
  lat: number;
  lon: number;
}
