"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Polyline,
  Tooltip,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  center: [number, number];
  pontosLinha?: [number, number][];
  localUsuario?: [number, number] | null;
}

type Position = [number, number];

function ChangeView({
  center,
  localUsuario,
}: {
  center: Position;
  localUsuario?: Position | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (localUsuario) {
      const bounds = L.latLngBounds([center, localUsuario]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center);
    }
  }, [center, localUsuario]);

  return null;
}

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

const iconUsuario = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/25/25694.png", // ícone de casinha
  iconSize: [18, 18],
  iconAnchor: [16, 32],
});

export default function Map({
  center,
  pontosLinha = [],
  localUsuario = null,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-full w-full" />;

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

      {/* Marcador do caminhão */}
      <Marker position={center} icon={iconCaminhao} />

      {/* Marcador do usuário */}
      {localUsuario && (
        <Marker position={localUsuario} icon={iconUsuario}>
          <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent>
            Minha casa
          </Tooltip>
        </Marker>
      )}

      <ChangeView center={center} localUsuario={localUsuario} />
    </MapContainer>
  );
}
