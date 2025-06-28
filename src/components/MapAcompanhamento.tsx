"use client";

import { useEffect, useState, useRef } from "react";
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
import "leaflet.marker.slideto";

interface SlideToOptions {
  duration?: number;
  keepAtCenter?: boolean;
}

// Extensão do tipo Marker para incluir slideTo
interface MarkerWithSlideTo extends L.Marker {
  slideTo: (latlng: L.LatLngExpression, options?: SlideToOptions) => void;
}

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
  iconUrl: "https://cdn-icons-png.flaticon.com/512/25/25694.png",
  iconSize: [18, 18],
  iconAnchor: [16, 32],
});

export default function Map({
  center,
  pontosLinha = [],
  localUsuario = null,
}: Props) {
  const [mounted, setMounted] = useState(false);

  // Ref tipado para Marker com slideTo
  const markerRef = useRef<MarkerWithSlideTo | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.slideTo(center, {
        duration: 1000,
        keepAtCenter: false,
      });
    }
  }, [center]);

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

      <Marker
        position={center}
        icon={iconCaminhao}
        ref={(ref) => {
          if (ref && "instance" in ref) {
            // 'instance' é do tipo Marker padrão, mas fazemos cast para MarkerWithSlideTo
            markerRef.current = ref.instance as MarkerWithSlideTo;
          }
        }}
      />

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
