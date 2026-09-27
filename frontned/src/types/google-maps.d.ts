// Create this file at: src/types/google-maps.d.ts

interface Window {
  google: typeof google;
  selectFacility?: (id: string) => void;
}

declare namespace google.maps {
  class Map {
    constructor(mapDiv: Element, opts?: MapOptions);
    fitBounds(bounds: LatLngBounds): void;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    addListener(eventName: string, handler: Function): void;
    setMap(map: Map | null): void;
  }

  class InfoWindow {
    constructor(opts?: InfoWindowOptions);
    open(map: Map, anchor?: Marker): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
  }

  class LatLngBounds {
    constructor();
    extend(point: LatLng): void;
  }

  enum SymbolPath {
    CIRCLE = 0,
  }

  namespace places {
    class PlacesService {
      constructor(map: Map);
      nearbySearch(
        request: any,
        callback: (results: any[] | null, status: PlacesServiceStatus) => void
      ): void;
      getDetails(
        request: any,
        callback: (result: any | null, status: PlacesServiceStatus) => void
      ): void;
    }

    enum PlacesServiceStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      ERROR = 'ERROR',
      INVALID_REQUEST = 'INVALID_REQUEST',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    }
  }

  interface MapOptions {
    center: { lat: number; lng: number };
    zoom: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
  }

  interface MarkerOptions {
    position: { lat: number; lng: number };
    map: Map;
    title?: string;
    icon?: any;
  }

  interface InfoWindowOptions {
    content: string;
  }
}