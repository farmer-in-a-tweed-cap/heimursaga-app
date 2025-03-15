export interface ISearchQueryPayload {
  location?: ISearchQueryLocation;
  limit?: number;
  page?: number;
  userId?: number;
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
