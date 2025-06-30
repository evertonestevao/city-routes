"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "@/lib/supabase";

const iconCaminhao = new L.Icon({
  iconUrl: "/truck-icon.png",
  iconSize: [32, 32],
  iconAnchor: [16, 24],
});

type Posicao = [number, number];

interface Props {
  rotaId: string;
  centroInicial: Posicao;
}

export default function MapGravacao({ rotaId, centroInicial }: Props) {
  const [posicaoAtual, setPosicaoAtual] = useState<Posicao | null>(null);
  const [pontos, setPontos] = useState<Posicao[]>([]);
  const pontosRef = useRef<Posicao[]>([]);
  const ordemRef = useRef(1);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("GPS indisponível");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const nova: Posicao = [pos.coords.latitude, pos.coords.longitude];
        const velocidade = pos.coords.speed || 0;

        const pontosAtuais = pontosRef.current;
        const ultimoPonto = pontosAtuais[pontosAtuais.length - 1];

        if (ultimoPonto) {
          const dist = calcularDistancia(ultimoPonto, nova);
          if (dist < 10) {
            console.log("Ponto muito próximo – não será gravado");
            return;
          }
        }

        await supabase.from("pontos_rota").insert({
          rota_id: rotaId,
          ordem: ordemRef.current,
          latitude: nova[0],
          longitude: nova[1],
          timestamp: new Date().toISOString(),
          velocidade,
        });

        ordemRef.current += 1;
        pontosRef.current = [...pontosRef.current, nova];
        setPontos(pontosRef.current);
        setPosicaoAtual(nova);
      },
      (err) => {
        console.error("Erro no GPS:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [rotaId]);

  return (
    <MapContainer
      center={posicaoAtual || centroInicial}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {posicaoAtual && <Recentrar posicao={posicaoAtual} />}
      {pontos.length > 0 && <Polyline positions={pontos} color="blue" />}
      {posicaoAtual && <Marker position={posicaoAtual} icon={iconCaminhao} />}
    </MapContainer>
  );
}

function Recentrar({ posicao }: { posicao: Posicao }) {
  const map = useMap();
  useEffect(() => {
    map.setView(posicao, map.getZoom());
  }, [posicao]);
  return null;
}

function calcularDistancia([lat1, lon1]: Posicao, [lat2, lon2]: Posicao) {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
