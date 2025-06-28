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

  const [localUsuario, setLocalUsuario] = useState<[number, number] | null>(
    null
  );
  const [localCaminhao, setLocalCaminhao] = useState<[number, number] | null>(
    null
  );
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

    let interval: NodeJS.Timeout;

    const carregarDados = async () => {
      const { data: pontosData } = await supabase
        .from("pontos_rota")
        .select("latitude, longitude, ordem, registrada_em")
        .eq("rota_id", rotaSelecionada)
        .order("ordem");

      if (!pontosData || pontosData.length === 0) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const atual: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          setLocalUsuario(atual);
          await atualizarDados(pontosData, atual);
          interval = setInterval(
            () => atualizarDados(pontosData, atual),
            20000
          );
        },
        () => {
          setTempoEstimado("Erro ao obter localização do usuário");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    const atualizarDados = async (
      pontos: Ponto[],
      usuario: [number, number]
    ) => {
      const pontoDestino = encontrarMaisProximo(usuario[0], usuario[1], pontos);

      const { data: caminhaoData } = await supabase
        .from("rotas_realizadas")
        .select("latitude, longitude")
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

      const origem = encontrarMaisProximo(
        caminhaoData.latitude,
        caminhaoData.longitude,
        pontos
      );

      const idxA = origem.ordem;
      const idxB = pontoDestino.ordem;

      const selecionados = pontos.filter(
        (p) =>
          p.ordem >= Math.min(idxA, idxB) && p.ordem <= Math.max(idxA, idxB)
      );

      setTrecho(selecionados);
      setLocalCaminhao([caminhaoData.latitude, caminhaoData.longitude]);

      let distanciaTotal = 0;
      let tempoTotalSeg = 0;

      for (let i = 1; i < selecionados.length; i++) {
        const a = selecionados[i - 1];
        const b = selecionados[i];
        const dist = calcularDistanciaM(
          a.latitude,
          a.longitude,
          b.latitude,
          b.longitude
        );
        const tempo =
          (new Date(b.registrada_em).getTime() -
            new Date(a.registrada_em).getTime()) /
          1000;
        if (tempo > 0) {
          distanciaTotal += dist;
          tempoTotalSeg += tempo;
        }
      }

      if (tempoTotalSeg > 0 && distanciaTotal > 0) {
        const velocidadeMedia = distanciaTotal / tempoTotalSeg;
        const tempoRestante = distanciaTotal / velocidadeMedia;
        const minutos = Math.floor(tempoRestante / 60);

        if (idxA > idxB) {
          setTempoEstimado("O caminhão de coleta já passou em seu endereço");
        } else if (minutos < 1) {
          setTempoEstimado("A coleta está muito próxima da sua localização");
        } else {
          setTempoEstimado(`${minutos} min`);
        }
      } else {
        setTempoEstimado("Não foi possível estimar o tempo");
      }
    };

    carregarDados();
    return () => interval && clearInterval(interval);
  }, [rotaSelecionada]);

  const encontrarMaisProximo = (
    lat: number,
    lng: number,
    lista: Ponto[]
  ): Ponto => {
    return lista.reduce((maisProximo, atual) => {
      const distAtual = calcularDistanciaM(
        lat,
        lng,
        atual.latitude,
        atual.longitude
      );
      const distMaisProx = calcularDistanciaM(
        lat,
        lng,
        maisProximo.latitude,
        maisProximo.longitude
      );
      return distAtual < distMaisProx ? atual : maisProximo;
    }, lista[0]);
  };

  const aplicarLatLngManual = () => {
    const lat = parseFloat(latManual);
    const lng = parseFloat(lngManual);
    if (!isNaN(lat) && !isNaN(lng)) {
      setLocalUsuario([lat, lng]);
    } else {
      alert("Latitude ou longitude inválida");
    }
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
          {rotas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>

        {localUsuario && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={latManual || localUsuario[0].toFixed(6)}
                onChange={(e) => setLatManual(e.target.value)}
                placeholder="Latitude"
                className="w-1/2 border p-2 rounded"
              />
              <input
                type="text"
                value={lngManual || localUsuario[1].toFixed(6)}
                onChange={(e) => setLngManual(e.target.value)}
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
          <div
            className={`font-medium ${
              tempoEstimado.includes("passou") || tempoEstimado.includes("não")
                ? "text-red-600"
                : "text-green-700"
            }`}
          >
            {tempoEstimado}
          </div>
        )}
      </div>

      {localUsuario && localCaminhao && trecho.length > 1 && (
        <div className="flex-1 min-h-[400px]">
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
