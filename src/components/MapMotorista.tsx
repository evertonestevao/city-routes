"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  center: [number, number];
  pontosLinha?: [number, number][];
  inicio?: { latitude: number; longitude: number };
  fim?: { latitude: number; longitude: number };
}

type Position = [number, number];

function ChangeView({ center }: { center: Position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center]);

  return null;
}

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const inicioIcon = L.divIcon({
  className: "inicio-icon",
  html: '<div style="background:#22c55e;border-radius:50%;width:20px;height:20px;border:2px solid white"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const fimIcon = L.divIcon({
  className: "fim-icon",
  html: '<div style="background:#ef4444;border-radius:50%;width:20px;height:20px;border:2px solid white"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function MapMotorista({
  center,
  pontosLinha,
  inicio,
  fim,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full" />;
  }

  return (
    <MapContainer
      center={center}
      zoom={17}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center} icon={icon} />
      {pontosLinha && <Polyline positions={pontosLinha} color="blue" />}
      {inicio && (
        <Marker
          position={[inicio.latitude, inicio.longitude]}
          icon={inicioIcon}
        />
      )}
      {fim && (
        <Marker position={[fim.latitude, fim.longitude]} icon={fimIcon} />
      )}
      <ChangeView center={center} />
    </MapContainer>
  );
}
