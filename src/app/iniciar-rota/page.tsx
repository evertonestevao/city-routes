"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { MenuSuperior } from "@/components/MenuSuperior";

const MapIniciarRota = dynamic(() => import("@/components/MapIniciarRota"), {
  ssr: false,
});

type Posicao = [number, number];

interface Rota {
  id: string;
  nome: string;
}

interface PontoRota {
  id: string;
  rota_id: string;
  ordem: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface RotaRealizada {
  id: string;
  rota_id: string;
  latitude: number;
  longitude: number;
  registrada_em: string;
}

function calcularDistanciaMetros([lat1, lon1]: Posicao, [lat2, lon2]: Posicao) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function encontrarPontoMaisProximo(
  posicaoAtual: Posicao,
  pontos: Posicao[]
): { ponto: Posicao; indice: number } {
  let menorDistancia = Infinity;
  let pontoMaisProximo: Posicao = pontos[0];
  let indiceMaisProximo = 0;

  pontos.forEach((ponto, index) => {
    const distancia = calcularDistanciaMetros(posicaoAtual, ponto);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      pontoMaisProximo = ponto;
      indiceMaisProximo = index;
    }
  });

  return { ponto: pontoMaisProximo, indice: indiceMaisProximo };
}

export default function IniciarRotaPage() {
  const [posicaoUsuario, setPosicaoUsuario] = useState<Posicao | null>(null);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState<string>("");
  const [pontosRota, setPontosRota] = useState<PontoRota[]>([]);
  const [rotaAtiva, setRotaAtiva] = useState<RotaRealizada | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const ultimaPosicaoRef = useRef<Posicao | null>(null);

  useEffect(() => {
    async function buscarRotas() {
      const { data, error } = await supabase
        .from("rotas")
        .select("id, nome")
        .order("data_criacao", { ascending: false });
      if (!error && data) setRotas(data);
    }
    buscarRotas();
  }, []);

  useEffect(() => {
    if (!rotaSelecionada) {
      setPontosRota([]);
      setRotaAtiva(null);
      return;
    }

    async function buscarPontos() {
      const { data, error } = await supabase
        .from("pontos_rota")
        .select("*")
        .eq("rota_id", rotaSelecionada)
        .order("ordem", { ascending: true });
      if (!error && data) setPontosRota(data);
    }

    async function verificarRotaAtiva() {
      const { data, error } = await supabase
        .from("rotas_realizadas")
        .select("*")
        .eq("rota_id", rotaSelecionada)
        .limit(1)
        .single();

      if (!error && data) {
        setRotaAtiva(data);
        ultimaPosicaoRef.current = [data.latitude, data.longitude];
        setPosicaoUsuario([data.latitude, data.longitude]);
      } else {
        setRotaAtiva(null);
      }
    }

    buscarPontos();
    verificarRotaAtiva();
  }, [rotaSelecionada]);

  useEffect(() => {
    if (rotaAtiva) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos: Posicao = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setPosicaoUsuario(pos);
        ultimaPosicaoRef.current = pos;
      });
    }
  }, [rotaAtiva]);

  async function iniciarRota() {
    if (!rotaSelecionada || !posicaoUsuario) return;

    const { data: existente, error } = await supabase
      .from("rotas_realizadas")
      .select("*")
      .eq("rota_id", rotaSelecionada)
      .limit(1)
      .single();

    if (!error && existente) {
      alert("Já existe uma rota ativa.");
      setRotaAtiva(existente);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("rotas_realizadas")
      .insert({
        rota_id: rotaSelecionada,
        latitude: posicaoUsuario[0],
        longitude: posicaoUsuario[1],
        registrada_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (!insertError && data) {
      setRotaAtiva(data);
      ultimaPosicaoRef.current = posicaoUsuario;
    }
  }

  async function atualizarPosicao(pos: Posicao) {
    if (!rotaAtiva) return;
    if (!ultimaPosicaoRef.current) ultimaPosicaoRef.current = pos;

    const distancia = calcularDistanciaMetros(pos, ultimaPosicaoRef.current);
    if (distancia < 30) return;

    const { error } = await supabase
      .from("rotas_realizadas")
      .update({
        latitude: pos[0],
        longitude: pos[1],
        registrada_em: new Date().toISOString(),
      })
      .eq("id", rotaAtiva.id);

    if (!error) {
      ultimaPosicaoRef.current = pos;
      setRotaAtiva((old) =>
        old
          ? {
              ...old,
              latitude: pos[0],
              longitude: pos[1],
              registrada_em: new Date().toISOString(),
            }
          : null
      );
    }
  }

  function iniciarMonitoramentoPosicao() {
    if (!navigator.geolocation || watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const novaPos: Posicao = [pos.coords.latitude, pos.coords.longitude];
        setPosicaoUsuario(novaPos);
        atualizarPosicao(novaPos);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  }

  function pararMonitoramentoPosicao() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  useEffect(() => {
    if (rotaAtiva) iniciarMonitoramentoPosicao();
    else pararMonitoramentoPosicao();
    return () => pararMonitoramentoPosicao();
  }, [rotaAtiva]);

  async function encerrarRota() {
    if (!rotaAtiva) return;
    const { error } = await supabase
      .from("rotas_realizadas")
      .delete()
      .eq("id", rotaAtiva.id);
    if (!error) {
      setRotaAtiva(null);
      setPosicaoUsuario(null);
      setRotaSelecionada("");
      setPontosRota([]);
      ultimaPosicaoRef.current = null;
    }
  }

  const todosPontos: Posicao[] = pontosRota.map((p) => [
    p.latitude,
    p.longitude,
  ]);
  let pontosRestantes: Posicao[] = todosPontos;
  if (posicaoUsuario && todosPontos.length > 0) {
    const { indice } = encontrarPontoMaisProximo(posicaoUsuario, todosPontos);
    pontosRestantes = todosPontos.slice(indice);
  }

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />
      <header className="h-16 bg-green-600 text-white p-4 text-xl font-bold">
        Iniciar Rota
      </header>

      <div className="p-4 bg-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Selecione a rota:
        </label>
        <select
          className="border rounded p-2 w-full max-w-md"
          value={rotaSelecionada}
          onChange={(e) => setRotaSelecionada(e.target.value)}
          disabled={!!rotaAtiva}
        >
          <option value="" disabled>
            Escolha...
          </option>
          {rotas.map((rota) => (
            <option key={rota.id} value={rota.id}>
              {rota.nome}
            </option>
          ))}
        </select>
      </div>

      <main className="flex-grow flex flex-col items-center justify-start">
        {rotaSelecionada && pontosRestantes.length > 0 && posicaoUsuario ? (
          <div className="w-full max-w-4xl h-96 border rounded overflow-hidden">
            <MapIniciarRota
              center={posicaoUsuario}
              localUsuario={posicaoUsuario}
              pontosLinha={pontosRestantes}
              marcadorCaminhao={pontosRestantes[0]}
            />
          </div>
        ) : (
          <p className="text-gray-600 mt-12">
            Selecione uma rota para iniciar.
          </p>
        )}

        {rotaSelecionada &&
          (rotaAtiva ? (
            <button
              onClick={encerrarRota}
              className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 mt-4"
            >
              Encerrar trajeto
            </button>
          ) : (
            <button
              onClick={iniciarRota}
              className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 mt-4"
              disabled={!posicaoUsuario}
            >
              Iniciar rota
            </button>
          ))}
      </main>
    </div>
  );
}
