export interface PriorityRoad {
  road_id: string;
  road_name: string;
  traffic: number;
  pothole_count: number;
  psi: number;
  priority_score: number;
}

export interface Pothole {
  latitude: number;
  longitude: number;
  severity: number;
  timestamp?: string;
  road_name?: string;
}

export interface RoadProperties {
  road_id: string;
  road_name: string;
  traffic: number;
  pothole_count: number;
  psi: number;
  priority_score: number;
  avg_severity?: number;
  has_bus_data?: boolean;
}

export interface BusRoute {
  route_id: string;
  route_name: string;
  start: [number, number];
  end: [number, number];
  coordinates?: [number, number][];
}
