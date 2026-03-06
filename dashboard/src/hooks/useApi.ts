import { useState, useEffect } from "react";
import type { PriorityRoad, Pothole, BusRoute } from "../types";

const DATA = "/dashboard_data";

export function usePriorityRoads() {
  const [data, setData] = useState<PriorityRoad[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${DATA}/priority_roads.json`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

export function usePotholes() {
  const [data, setData] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${DATA}/potholes.json`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

export function useRoadsGeoJSON() {
  const [data, setData] = useState<{ type: string; features: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${DATA}/roads_geojson.json`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

export function useBusRoutes() {
  const [data, setData] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${DATA}/bus_routes.json`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}
