"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Ponto {
  latitude: number;
  longitude: number;
}

interface MapTrechoProps {
  pontos: Ponto[];
  localUsuario: [number, number];
  localCaminhao: [number, number];
}

// Atualiza o bounds do mapa para incluir todos os pontos
function AjustarBounds({
  pontos,
  localUsuario,
  localCaminhao,
}: MapTrechoProps) {
  const map = useMap();

  useEffect(() => {
    const coords = [
      ...pontos.map((p) => [p.latitude, p.longitude]),
      localUsuario,
      localCaminhao,
    ].filter(Boolean) as [number, number][];
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, pontos, localUsuario, localCaminhao]);

  return null;
}

const iconUsuario = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconCaminhao = L.divIcon({
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

export default function MapTrecho({
  pontos,
  localUsuario,
  localCaminhao,
}: MapTrechoProps) {
  if (!pontos.length) return <div>Nenhum ponto para exibir.</div>;

  const positions = pontos.map(
    (p) => [p.latitude, p.longitude] as [number, number]
  );

  return (
    <MapContainer
      center={localUsuario}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={positions} color="blue" />
      <Marker position={localUsuario} icon={iconUsuario} />
      <Marker position={localCaminhao} icon={iconCaminhao} />
      <AjustarBounds
        pontos={pontos}
        localUsuario={localUsuario}
        localCaminhao={localCaminhao}
      />
    </MapContainer>
  );
}
