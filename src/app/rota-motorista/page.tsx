"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { calcularDistanciaM } from "@/lib/utils";
import { MenuSuperior } from "@/components/MenuSuperior";

const MapTrecho = dynamic(() => import("@/components/MapTrecho"), {
  ssr: false,
});

interface Rota {
  id: string;
  nome: string;
}

interface Ponto {
  latitude: number;
  longitude: number;
  ordem: number;
  registrada_em: string;
}

export default function EstimarChegadaPage() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState("");
  const [localUsuario, setLocalUsuario] = useState<[number, number] | null>(null);
  const [localCaminhao, setLocalCaminhao] = useState<[number, number] | null>(null);
  const [tempoEstimado, setTempoEstimado] = useState<string | null>(null);
  const [trecho, setTrecho] = useState<Ponto[]>([]);
  const [latManual, setLatManual] = useState("");
  const [lngManual, setLngManual] = useState("");

  useEffect(() => {
    supabase
      .from("rotas")
      .select("id, nome")
      .order("data_criacao", { ascending: false })
      .then(({ data }) => setRotas(data || []));
  }, []);

  useEffect(() => {
    if (!rotaSelecionada) return;

    const interval = setInterval(atualizarTudo, 20000);
    atualizarTudo();

    async function atualizarTudo() {
      const { data: pontosData } = await supabase
        .from("pontos_rota")
        .select("latitude, longitude, ordem, registrada_em")
        .eq("rota_id", rotaSelecionada)
        .order("ordem");

      if (!pontosData?.length) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => setLocalUsuario([pos.coords.latitude, pos.coords.longitude]),
      );

      const usuario = localUsuario!;
      const pontoDestino = encontrarMaisProximo(usuario[0], usuario[1], pontosData);

      const { data: caminhaoData } = await supabase
        .from("rotas_realizadas")
        .select("latitude, longitude, registrada_em")
        .eq("rota_id", rotaSelecionada)
        .order("registrada_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!caminhaoData) {
        setTempoEstimado("Não está acontecendo coleta");
        setLocalCaminhao(null);
        setTrecho([]);
        return;
      }

      const origem = encontrarMaisProximo(caminhaoData.latitude, caminhaoData.longitude, pontosData);

      const selecionados = pontosData.filter(p =>
        p.ordem >= Math.min(origem.ordem, pontoDestino.ordem) &&
        p.ordem <= Math.max(origem.ordem, pontoDestino.ordem)
      );

      setTrecho(selecionados);
      setLocalCaminhao([caminhaoData.latitude, caminhaoData.longitude]);

      // cálculo estimado
      let distRest = calcularDistanciaM(
        caminhaoData.latitude,
        caminhaoData.longitude,
        pontoDestino.latitude,
        pontoDestino.longitude
      );

      const { registrada_em: start, registrada_em: end } = pontosData[0], pontosData[pontosData.length - 1];
      const mediaVel = distRest / ((new Date(end).getTime() - new Date(start).getTime()) / 1000);
      const minutos = Math.floor(distRest / mediaVel / 60);

      if (origem.ordem > pontoDestino.ordem) {
        setTempoEstimado("O caminhão de coleta já passou");
      } else if (minutos < 1) {
        setTempoEstimado("Falta menos de 1 minuto");
      } else {
        setTempoEstimado(`${minutos} min`);
      }
    }

    return () => clearInterval(interval);
  }, [rotaSelecionada, localUsuario]);

  const encontrarMaisProximo = (lat: number, lng: number, lista: Ponto[]): Ponto =>
    lista.reduce((mp, c) => {
      return calcularDistanciaM(lat, lng, c.latitude, c.longitude) <
        calcularDistanciaM(lat, lng, mp.latitude, mp.longitude)
        ? c
        : mp;
    }, lista[0]);

  const aplicarLatLngManual = () => {
    const lat = parseFloat(latManual);
    const lng = parseFloat(lngManual);
    if (!isNaN(lat) && !isNaN(lng)) setLocalUsuario([lat, lng]);
    else alert("Latitude ou longitude inválida");
  };

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />

      <div className="p-4 space-y-4">
        <h1 className="text-lg font-bold">Estimativa de Chegada do Caminhão</h1>

        <select
          value={rotaSelecionada}
          onChange={(e) => setRotaSelecionada(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Selecione uma rota</option>
          {rotas.map(r => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>

        {localUsuario && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={latManual || localUsuario[0].toFixed(6)}
                onChange={e => setLatManual(e.target.value)}
                placeholder="Latitude"
                className="w-1/2 border p-2 rounded"
              />
              <input
                type="text"
                value={lngManual || localUsuario[1].toFixed(6)}
                onChange={e => setLngManual(e.target.value)}
                placeholder="Longitude"
                className="w-1/2 border p-2 rounded"
              />
            </div>
            <button
              onClick={aplicarLatLngManual}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
            >
              Atualizar localização
            </button>
          </>
        )}

        {tempoEstimado && (
          <div className={`font-medium ${tempoEstimado.includes("já passou") || tempoEstimado.includes("Não está") ? "text-red-600" : "text-green-700"}`}>
            {tempoEstimado}
          </div>
        )}
      </div>

      {localUsuario && localCaminhao && trecho.length > 1 && (
        <div className="flex-1">
          <MapTrecho
            pontos={trecho}
            localUsuario={localUsuario}
            localCaminhao={localCaminhao}
          />
        </div>
      )}
    </div>
  );
}
