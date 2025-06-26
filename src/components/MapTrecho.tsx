"use client";

import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Ponto {
  latitude: number;
  longitude: number;
}

interface MapTrechoProps {
  pontos: Ponto[];
}

export default function MapTrecho({ pontos }: MapTrechoProps) {
  if (pontos.length === 0) return <div>Nenhum ponto para exibir.</div>;

  const center = [pontos[0].latitude, pontos[0].longitude] as [number, number];
  const positions = pontos.map((p) => [p.latitude, p.longitude]) as [
    number,
    number
  ][];

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={positions} color="blue" />
    </MapContainer>
  );
}
