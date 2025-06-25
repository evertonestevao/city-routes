"use client";

import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

interface Props {
  pontos: {
    id: string;
    latitude: number;
    longitude: number;
  }[];
  onExcluirPonto: (id: string) => void;
}

function AjustarZoom({
  pontos,
}: {
  pontos: { latitude: number; longitude: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (pontos.length > 0) {
      const latLngs = pontos.map(
        (p) => [p.latitude, p.longitude] as [number, number]
      );
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [pontos, map]);

  return null;
}

// Ícones personalizados para início, fim e intermediário (default)
const iconInicio = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [0, -40],
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

const iconFim = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [0, -40],
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

// Ícone pequeno azul para pontos intermediários
const iconIntermediario = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconSize: [8, 12],
  iconAnchor: [7, 24],
  popupAnchor: [0, -20],
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

export default function MapRota({ pontos, onExcluirPonto }: Props) {
  return (
    <MapContainer
      center={[-21.628535, -49.787305]}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {pontos.length > 1 && (
        <Polyline
          positions={pontos.map(
            (p) => [p.latitude, p.longitude] as [number, number]
          )}
          color="blue"
        />
      )}

      {pontos.map((ponto, idx) => (
        <Marker
          key={ponto.id}
          position={[ponto.latitude, ponto.longitude]}
          icon={
            idx === 0
              ? iconInicio
              : idx === pontos.length - 1
              ? iconFim
              : iconIntermediario
          }
        >
          <Popup>
            <div className="flex flex-col items-center">
              <span>
                {idx === 0
                  ? "Início"
                  : idx === pontos.length - 1
                  ? "Fim"
                  : `Ponto ${idx + 1}`}
              </span>
              {idx !== 0 && idx !== pontos.length - 1 && (
                <button
                  className="mt-2 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  onClick={() => onExcluirPonto(ponto.id)}
                >
                  Excluir
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      <AjustarZoom pontos={pontos} />
    </MapContainer>
  );
}
