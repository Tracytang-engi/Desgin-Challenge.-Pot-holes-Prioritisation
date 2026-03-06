import { useState, useEffect } from "react";
import type { PriorityRoad, Pothole, BusRoute } from "../types";

const API = "/api";

export function usePriorityRoads() {
  const [data, setData] = useState<PriorityRoad[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/priority-roads`)
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
    fetch(`${API}/potholes`)
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
    fetch(`${API}/roads-geojson`)
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
    fetch(`${API}/bus-routes`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}
