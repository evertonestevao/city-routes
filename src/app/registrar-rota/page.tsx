"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { MenuSuperior } from "@/components/MenuSuperior";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

// Função para calcular distância em metros
function calcularDistanciaM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (grau: number) => (grau * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function RegistrarRotaPage() {
  const [nomeRota, setNomeRota] = useState("");
  const [descricao, setDescricao] = useState("");
  const [gravando, setGravando] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(
    "Nenhuma atualização ainda"
  );
  const [posicaoAtual, setPosicaoAtual] = useState<[number, number] | null>(
    null
  );
  const [pontosLinha, setPontosLinha] = useState<[number, number][]>([]);

  const ordemRef = useRef(0);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const ultimoPontoRef = useRef<[number, number] | null>(null);
  const rotaIdRef = useRef<string | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosicaoAtual([pos.coords.latitude, pos.coords.longitude]),
      (err) => alert("Erro ao obter localização inicial: " + err.message)
    );
  }, []);

  const iniciarGravacao = async () => {
    if (!nomeRota || !descricao) {
      alert("Informe o nome e a descrição da rota.");
      return;
    }

    const novaRotaId = uuidv4();
    rotaIdRef.current = novaRotaId;

    const { error: erroCriarRota } = await supabase.from("rotas").insert({
      id: novaRotaId,
      nome: nomeRota,
      descricao,
      data_criacao: new Date().toISOString(),
    });

    if (erroCriarRota) {
      console.error("Erro ao criar rota:", erroCriarRota);
      alert("Erro ao criar rota: " + erroCriarRota.message);
      return;
    }

    setGravando(true);

    intervaloRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude, speed } = pos.coords;
          const anterior = ultimoPontoRef.current;

          if (anterior) {
            const distancia = calcularDistanciaM(
              anterior[0],
              anterior[1],
              latitude,
              longitude
            );
            if (distancia < 10) return;
          }

          const ordem = ordemRef.current++;
          const timestamp = new Date().toISOString();

          setUltimaAtualizacao(
            `Último ponto registrado: ${new Date(
              timestamp
            ).toLocaleTimeString()}`
          );

          const { error: pontoErro } = await supabase
            .from("pontos_rota")
            .insert({
              rota_id: novaRotaId,
              ordem,
              latitude,
              longitude,
              timestamp,
              velocidade: speed ?? null,
            });

          if (pontoErro) {
            console.error("Erro ao salvar ponto:", pontoErro.message);
            return;
          }

          setPosicaoAtual([latitude, longitude]);
          setPontosLinha((prev) => [...prev, [latitude, longitude]]);
          ultimoPontoRef.current = [latitude, longitude];
        },
        (err) => console.error("Erro ao obter posição:", err.message),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }, 5000);
  };

  const finalizarGravacao = () => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
    setGravando(false);
    alert("Gravação finalizada.");
  };

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />
      <header className="h-16 bg-gray-800 text-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Registro de Rota</span>
          {gravando && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
          )}
        </div>
        {gravando && (
          <button
            onClick={finalizarGravacao}
            className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
          >
            Finalizar
          </button>
        )}
      </header>

      <main
        className="flex-grow"
        style={{ minHeight: "calc(100vh - 64px - 48px)" }}
      >
        {!gravando ? (
          <div className="p-4 space-y-3 h-full">
            <input
              type="text"
              placeholder="Nome da rota"
              value={nomeRota}
              onChange={(e) => setNomeRota(e.target.value)}
              className="w-full border rounded p-2"
            />
            <textarea
              placeholder="Descrição da rota"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full border rounded p-2"
            />
            <button
              onClick={iniciarGravacao}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Iniciar Gravação
            </button>
          </div>
        ) : posicaoAtual ? (
          <div className="w-full h-full">
            <Map center={posicaoAtual} pontosLinha={pontosLinha} />
          </div>
        ) : (
          <p className="text-center mt-10 text-gray-500">
            Obtendo localização...
          </p>
        )}
      </main>

      {gravando && (
        <footer className="h-12 bg-gray-100 text-center flex items-center justify-center text-sm text-gray-600 fixed bottom-0 left-0 right-0">
          {ultimaAtualizacao}
        </footer>
      )}
    </div>
  );
}
