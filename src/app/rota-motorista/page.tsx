"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { calcularDistanciaM } from "@/lib/utils";
import { MenuSuperior } from "@/components/MenuSuperior";

const MapMotorista = dynamic(() => import("@/components/MapMotorista"), {
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
  timestamp?: string;
}

export default function IniciarRotaPage() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState<string | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [posicao, setPosicao] = useState<[number, number] | null>(null);
  const [estimativa, setEstimativa] = useState<string>("--");
  const [rotaAtiva, setRotaAtiva] = useState<boolean>(false);
  const ultimaPosicao = useRef<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const estimativaRef = useRef<NodeJS.Timeout | null>(null);
  const idRegistroRef = useRef<string | null>(null);

  useEffect(() => {
    supabase
      .from("rotas")
      .select("id, nome")
      .order("data_criacao", { ascending: false })
      .then(({ data }) => setRotas(data || []));
  }, []);

  useEffect(() => {
    if (!rotaSelecionada) return;

    supabase
      .from("pontos_rota")
      .select("latitude, longitude, ordem, timestamp")
      .eq("rota_id", rotaSelecionada)
      .order("ordem", { ascending: true })
      .then(({ data }) => setPontos(data || []));
  }, [rotaSelecionada]);

  const iniciarRota = async () => {
    if (!rotaSelecionada) return;
    setRotaAtiva(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const atual: [number, number] = [latitude, longitude];
        setPosicao(atual);
        ultimaPosicao.current = atual;

        // Inserir primeiro registro e salvar id
        const { data } = await supabase
          .from("rotas_realizadas")
          .insert({
            latitude,
            longitude,
            registrada_em: new Date().toISOString(),
            rota_id: rotaSelecionada,
          })
          .select("id")
          .single();

        if (data?.id) idRegistroRef.current = data.id;

        intervaloRef.current = setInterval(async () => {
          if (!ultimaPosicao.current || !posicao || !idRegistroRef.current)
            return;

          const [latAnt, lngAnt] = ultimaPosicao.current;
          const [lat, lng] = posicao;
          const dist = calcularDistanciaM(latAnt, lngAnt, lat, lng);
          if (dist < 10) return;

          ultimaPosicao.current = [lat, lng];

          await supabase
            .from("rotas_realizadas")
            .update({
              latitude: lat,
              longitude: lng,
              registrada_em: new Date().toISOString(),
            })
            .eq("id", idRegistroRef.current);
        }, 20000);

        estimativaRef.current = setInterval(
          () => calcularEstimativa(latitude, longitude),
          60000
        );
      },
      (err) => alert("Erro ao obter localização: " + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const finalizarRota = () => {
    setRotaAtiva(false);
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    if (estimativaRef.current) clearInterval(estimativaRef.current);
  };

  const calcularEstimativa = (latitude: number, longitude: number) => {
    if (pontos.length < 2) return;

    const pontoMaisProximo = pontos.reduce((maisProx, atual) => {
      const distAtual = calcularDistanciaM(
        atual.latitude,
        atual.longitude,
        latitude,
        longitude
      );
      const distMaisProx = calcularDistanciaM(
        maisProx.latitude,
        maisProx.longitude,
        latitude,
        longitude
      );
      return distAtual < distMaisProx ? atual : maisProx;
    });

    const index = pontos.findIndex((p) => p === pontoMaisProximo);
    const restante = pontos.slice(index);

    let distanciaTotal = 0;
    for (let i = 1; i < restante.length; i++) {
      distanciaTotal += calcularDistanciaM(
        restante[i - 1].latitude,
        restante[i - 1].longitude,
        restante[i].latitude,
        restante[i].longitude
      );
    }

    const tInicio = new Date(pontos[0].timestamp ?? 0).getTime();
    const tFim = new Date(pontos[pontos.length - 1].timestamp ?? 0).getTime();
    if (!tInicio || !tFim) return;
    const tempoTotalSegundos = (tFim - tInicio) / 1000;
    let distanciaRota = 0;
    for (let i = 1; i < pontos.length; i++) {
      distanciaRota += calcularDistanciaM(
        pontos[i - 1].latitude,
        pontos[i - 1].longitude,
        pontos[i].latitude,
        pontos[i].longitude
      );
    }

    const velocidadeMedia = distanciaRota / tempoTotalSegundos;
    if (velocidadeMedia > 0) {
      const minutosRestantes = Math.ceil(distanciaTotal / velocidadeMedia / 60);
      setEstimativa(`${minutosRestantes} min`);
    }
  };

  useEffect(() => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosicao([latitude, longitude]);
      },
      (err) => console.error("Erro GPS:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current)
        navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      if (estimativaRef.current) clearInterval(estimativaRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />
      <header className="h-16 bg-gray-800 text-white flex items-center justify-between px-4">
        <span className="text-lg font-semibold">Iniciar Rota</span>
        {rotaAtiva && (
          <span className="text-sm text-gray-300">
            Tempo estimado: {estimativa}
          </span>
        )}
      </header>
      <main className="flex-grow">
        <div className="p-4 flex gap-4 items-center">
          <select
            className="p-2 border rounded flex-1"
            value={rotaSelecionada ?? ""}
            onChange={(e) => setRotaSelecionada(e.target.value)}
            disabled={rotaAtiva}
          >
            <option value="">Selecione uma rota</option>
            {rotas.map((rota) => (
              <option key={rota.id} value={rota.id}>
                {rota.nome}
              </option>
            ))}
          </select>

          {!rotaAtiva ? (
            <button
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={iniciarRota}
              disabled={!rotaSelecionada}
            >
              Iniciar Rota
            </button>
          ) : (
            <button
              className="bg-yellow-600 text-white px-4 py-2 rounded"
              onClick={finalizarRota}
            >
              Encerrar Rota
            </button>
          )}
        </div>

        {rotaAtiva && posicao && (
          <MapMotorista
            center={posicao}
            pontosLinha={pontos.map((p) => [p.latitude, p.longitude])}
            inicio={pontos[0]}
            fim={pontos[pontos.length - 1]}
          />
        )}
      </main>
    </div>
  );
}
