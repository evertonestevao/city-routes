"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  center: [number, number];
  pontosLinha?: [number, number][];
}

type Position = [number, number];

// Atualiza a visualização do mapa ao mudar o centro
function ChangeView({ center }: { center: Position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center]);

  return null;
}

const icon = L.divIcon({
  className: "custom-pulse-icon",
  html: `
    <div class="pulse-wrapper">
      <div class="pulse"></div>
      <div class="core"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function Map({ center, pontosLinha = [] }: Props) {
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
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {pontosLinha.length > 1 && (
        <Polyline positions={pontosLinha} color="blue" />
      )}

      <Marker position={center} icon={icon} />
      <ChangeView center={center} />
    </MapContainer>
  );
}
