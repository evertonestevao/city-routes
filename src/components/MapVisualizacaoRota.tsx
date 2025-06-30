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
import { supabase } from "@/lib/supabase";

type Posicao = [number, number];

interface Props {
  rotaId: string;
}

interface PontoRota {
  id: string;
  ordem: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

const iconInicio = new L.DivIcon({
  html: `<div style="font-size: 24px; color: green; transform: translate(-50%, -100%);">📍</div>`,
  className: "",
  iconAnchor: [12, 24],
});

const iconFim = new L.DivIcon({
  html: `<div style="font-size: 24px; color: red; transform: translate(-50%, -100%);">📍</div>`,
  className: "",
  iconAnchor: [12, 24],
});

export default function MapVisualizacaoRota({ rotaId }: Props) {
  const [pontos, setPontos] = useState<PontoRota[]>([]);
  const [centro, setCentro] = useState<Posicao>([
    -21.625874427846078, -49.79055415083361,
  ]);

  useEffect(() => {
    async function buscarPontos() {
      const { data, error } = await supabase
        .from("pontos_rota")
        .select("*")
        .eq("rota_id", rotaId)
        .order("ordem", { ascending: true });

      if (error || !data) return;

      setPontos(data);
      if (data.length > 0) {
        setCentro([data[0].latitude, data[0].longitude]);
      }
    }

    buscarPontos();
  }, [rotaId]);

  const path: Posicao[] = pontos.map((p) => [p.latitude, p.longitude]);
  const inicio = path[0];
  const fim = path[path.length - 1];

  return (
    <div className="w-full h-full">
      <MapContainer
        center={centro}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {path.length > 0 && (
          <>
            <FitBounds path={path} />
            <Polyline positions={path} color="green" />

            {inicio && <Marker position={inicio} icon={iconInicio} />}
            {fim && <Marker position={fim} icon={iconFim} />}
          </>
        )}
      </MapContainer>
    </div>
  );
}

function FitBounds({ path }: { path: Posicao[] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(path);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [path, map]);

  return null;
}
