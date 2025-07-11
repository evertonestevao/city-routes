"use client";

import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import React from "react";

type Posicao = [number, number];

interface MapIniciarRotaProps {
  center: Posicao;
  localUsuario: Posicao | null;
  pontosLinha: Posicao[];
  marcadorCaminhao: Posicao | null;
}

const iconeCaminhao = new Icon({
  iconUrl: "/truck-icon.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40], // ponto do ícone que fica na coordenada (centro base)
});

export default function MapIniciarRota({
  center,
  pontosLinha,
  marcadorCaminhao,
}: MapIniciarRotaProps) {
  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Linha do trajeto */}
      {pontosLinha.length > 0 && (
        <Polyline positions={pontosLinha} color="blue" weight={5} />
      )}

      {/* Marcador da posição do caminhão/usuário */}
      {marcadorCaminhao && (
        <Marker position={marcadorCaminhao} icon={iconeCaminhao} />
      )}
    </MapContainer>
  );
}
