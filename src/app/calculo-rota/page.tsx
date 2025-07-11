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
  id: string;
  latitude: number;
  longitude: number;
  ordem: number;
  velocidade?: number | null;
}

interface Coordenada {
  latitude: number;
  longitude: number;
}

export default function EstimarTrechoPage() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState<string>("");
  const [pontos, setPontos] = useState<Ponto[]>([]);

  const [origemLat, setOrigemLat] = useState("");
  const [origemLng, setOrigemLng] = useState("");
  const [destinoLat, setDestinoLat] = useState("");
  const [destinoLng, setDestinoLng] = useState("");

  const [trecho, setTrecho] = useState<Ponto[]>([]);
  const [tempoEstimado, setTempoEstimado] = useState<string | null>(null);

  const [localUsuario, setLocalUsuario] = useState<Coordenada | null>(null);
  const [localCaminhao, setLocalCaminhao] = useState<Coordenada | null>(null);

  useEffect(() => {
    // Pega a posição atual do usuário
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalUsuario({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // fallback: posição padrão se usuário não permitir
          setLocalUsuario({ latitude: -23.55052, longitude: -46.633308 });
        }
      );
    } else {
      // navegador não suporta geolocalização
      setLocalUsuario({ latitude: -23.55052, longitude: -46.633308 });
    }

    // Você pode trocar isso para a posição do caminhão real
    setLocalCaminhao({ latitude: -23.551, longitude: -46.634 });
  }, []);

  useEffect(() => {
    const carregarRotas = async () => {
      const { data, error } = await supabase
        .from("rotas")
        .select("id, nome")
        .order("data_criacao", { ascending: false });

      if (!error && data) setRotas(data);
    };
    carregarRotas();
  }, []);

  useEffect(() => {
    if (!rotaSelecionada) return;

    const carregarPontos = async () => {
      const { data, error } = await supabase
        .from("pontos_rota")
        .select("id, latitude, longitude, ordem, velocidade")
        .eq("rota_id", rotaSelecionada)
        .order("ordem");

      if (!error && data) setPontos(data);
    };
    carregarPontos();
  }, [rotaSelecionada]);

  const encontrarMaisProximo = (
    lat: number,
    lng: number,
    lista: Ponto[]
  ): Ponto | null => {
    if (lista.length === 0) return null;

    return lista.reduce((maisProximo, pontoAtual) => {
      const dAtual = calcularDistanciaM(
        lat,
        lng,
        pontoAtual.latitude,
        pontoAtual.longitude
      );
      const dMaisProx = calcularDistanciaM(
        lat,
        lng,
        maisProximo.latitude,
        maisProximo.longitude
      );
      return dAtual < dMaisProx ? pontoAtual : maisProximo;
    }, lista[0]);
  };

  const calcular = () => {
    const latA = parseFloat(origemLat);
    const lngA = parseFloat(origemLng);
    const latB = parseFloat(destinoLat);
    const lngB = parseFloat(destinoLng);

    if ([latA, lngA, latB, lngB].some(isNaN)) {
      alert("Preencha todas as coordenadas corretamente.");
      return;
    }

    const pontoA = encontrarMaisProximo(latA, lngA, pontos);
    const pontoB = encontrarMaisProximo(latB, lngB, pontos);

    if (!pontoA || !pontoB) {
      alert("Não foi possível encontrar pontos próximos.");
      return;
    }

    const idxA = pontoA.ordem;
    const idxB = pontoB.ordem;

    const selecionados = pontos.filter(
      (p) => p.ordem >= Math.min(idxA, idxB) && p.ordem <= Math.max(idxA, idxB)
    );

    setTrecho(selecionados);

    let distanciaTotal = 0;
    const velocidades: number[] = [];

    for (let i = 1; i < selecionados.length; i++) {
      const anterior = selecionados[i - 1];
      const atual = selecionados[i];
      distanciaTotal += calcularDistanciaM(
        anterior.latitude,
        anterior.longitude,
        atual.latitude,
        atual.longitude
      );
      if (atual.velocidade && atual.velocidade > 0) {
        velocidades.push(atual.velocidade);
      }
    }

    const mediaVel = velocidades.length
      ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length
      : 0;

    if (mediaVel > 0) {
      const tempoSeg = distanciaTotal / mediaVel;
      const minutos = Math.floor(tempoSeg / 60);
      const segundos = Math.floor(tempoSeg % 60);
      setTempoEstimado(`${minutos} min ${segundos} seg`);
    } else {
      setTempoEstimado("Velocidade média insuficiente");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <MenuSuperior />
      <h1 className="text-lg font-bold">Estimativa de Tempo Entre Pontos</h1>

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm block">Latitude de Origem</label>
          <input
            type="text"
            value={origemLat}
            onChange={(e) => setOrigemLat(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="text-sm block">Longitude de Origem</label>
          <input
            type="text"
            value={origemLng}
            onChange={(e) => setOrigemLng(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="text-sm block">Latitude de Destino</label>
          <input
            type="text"
            value={destinoLat}
            onChange={(e) => setDestinoLat(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="text-sm block">Longitude de Destino</label>
          <input
            type="text"
            value={destinoLng}
            onChange={(e) => setDestinoLng(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
      </div>

      <button
        onClick={calcular}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Calcular Tempo Estimado
      </button>

      {tempoEstimado && (
        <div className="text-green-700 font-medium mt-2">
          Tempo estimado: {tempoEstimado}
        </div>
      )}

      {trecho.length > 1 && localUsuario && localCaminhao && (
        <div className="h-96 mt-4">
          <MapTrecho
            pontos={trecho}
            localUsuario={[localUsuario.latitude, localUsuario.longitude]}
            localCaminhao={[localCaminhao.latitude, localCaminhao.longitude]}
          />
        </div>
      )}
    </div>
  );
}
