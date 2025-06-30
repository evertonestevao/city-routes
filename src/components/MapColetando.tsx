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
}

const pulseIcon = L.divIcon({
  className: "pulse-icon",
  html: `
    <div class="pulse-wrapper">
      <div class="pulse"></div>
      <div class="core"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Componente para atualizar a view do mapa
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 17);
  }, [center, map]);

  return null;
}

export default function MapColetando({ center, pontosLinha = [] }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-full w-full" />;

  return (
    <>
      <style>{`
        .pulse-wrapper {
          position: relative;
          width: 24px;
          height: 24px;
        }
        .pulse {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          margin: auto;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 0, 0, 0.4);
          animation: pulse-animation 2s infinite;
          transform-origin: center;
        }
        .core {
          position: absolute;
          top: 6px;
          left: 6px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: red;
          box-shadow: 0 0 8px 2px rgba(255, 0, 0, 0.8);
        }
        @keyframes pulse-animation {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          70% {
            transform: scale(1.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={17}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Linha azul da rota */}
        {pontosLinha.length > 1 && (
          <Polyline positions={pontosLinha} color="blue" />
        )}

        <Marker position={center} icon={pulseIcon} />

        <ChangeView center={center} />
      </MapContainer>
    </>
  );
}
