"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { MenuSuperior } from "@/components/MenuSuperior";

const Map = dynamic(() => import("@/components/MapAcompanhamento"), {
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

export default function AcompanharPage() {
  const [posicaoCaminhao, setPosicaoCaminhao] = useState<Posicao | null>(null);
  const [posicaoUsuario, setPosicaoUsuario] = useState<Posicao | null>(null);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState<string>("");
  const [pontosRota, setPontosRota] = useState<PontoRota[]>([]);
  const [tempoEstimado, setTempoEstimado] = useState<string | null>(null);

  useEffect(() => {
    async function buscarRotas() {
      const { data } = await supabase
        .from("rotas")
        .select("id, nome")
        .order("data_criacao", { ascending: false });

      if (data) {
        setRotas(data);
      }
    }

    buscarRotas();
  }, []);

  useEffect(() => {
    if (!rotaSelecionada) {
      setPontosRota([]);
      setPosicaoCaminhao(null);
      setTempoEstimado(null);
      return;
    }

    async function buscarPontosDaRota() {
      const { data } = await supabase
        .from("pontos_rota")
        .select("*")
        .eq("rota_id", rotaSelecionada)
        .order("ordem", { ascending: true });

      if (data) {
        setPontosRota(data);
      }
    }

    buscarPontosDaRota();
  }, [rotaSelecionada]);

  useEffect(() => {
    if (!rotaSelecionada) return;

    async function buscarUltimaPosicaoDaRota() {
      const { data } = await supabase
        .from("rotas_realizadas")
        .select("latitude, longitude, registrada_em")
        .eq("rota_id", rotaSelecionada)
        .order("registrada_em", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setPosicaoCaminhao([data.latitude, data.longitude]);
        setTempoEstimado(null);
      } else {
        setPosicaoCaminhao(null);
        setTempoEstimado("gray|Sem coleta no momento");
      }
    }

    buscarUltimaPosicaoDaRota();

    const canal = supabase
      .channel(`rota-updates-${rotaSelecionada}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rotas_realizadas",
          filter: `rota_id=eq.${rotaSelecionada}`,
        },
        (payload) => {
          const novo = payload.new;
          if (novo.latitude && novo.longitude) {
            setPosicaoCaminhao([novo.latitude, novo.longitude]);
            setTempoEstimado(null);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rotas_realizadas",
          filter: `rota_id=eq.${rotaSelecionada}`,
        },
        (payload) => {
          const nova = payload.new;
          if (nova.latitude && nova.longitude) {
            setPosicaoCaminhao([nova.latitude, nova.longitude]);
            setTempoEstimado(null);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "rotas_realizadas",
          filter: `rota_id=eq.${rotaSelecionada}`,
        },
        async () => {
          // Verifica se ainda existe alguma coleta para a rota
          const { data } = await supabase
            .from("rotas_realizadas")
            .select("id")
            .eq("rota_id", rotaSelecionada)
            .limit(1);

          if (!data || data.length === 0) {
            setPosicaoCaminhao(null);
            setTempoEstimado("gray|Sem coleta no momento");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [rotaSelecionada]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPosicaoUsuario([
            position.coords.latitude,
            position.coords.longitude,
          ]);
        },
        (error) => {
          console.warn("Erro ao obter localização do usuário:", error.message);
        }
      );
    } else {
      console.warn("Geolocalização não suportada pelo navegador.");
    }
  }, []);

  const caminhãoPassou = useMemo(() => {
    if (!posicaoCaminhao || !posicaoUsuario || pontosRota.length === 0)
      return false;

    function distancia([lat1, lon1]: Posicao, [lat2, lon2]: Posicao) {
      return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
    }

    const pontoMaisProximoDoUsuario = pontosRota.reduce((prev, curr) =>
      distancia([curr.latitude, curr.longitude], posicaoUsuario) <
      distancia([prev.latitude, prev.longitude], posicaoUsuario)
        ? curr
        : prev
    );

    const pontoMaisProximoDoCaminhao = pontosRota.reduce((prev, curr) =>
      distancia([curr.latitude, curr.longitude], posicaoCaminhao) <
      distancia([prev.latitude, prev.longitude], posicaoCaminhao)
        ? curr
        : prev
    );

    const t1 = new Date(pontoMaisProximoDoCaminhao.timestamp).getTime();
    const t2 = new Date(pontoMaisProximoDoUsuario.timestamp).getTime();

    return t2 - t1 < 0;
  }, [posicaoCaminhao, posicaoUsuario, pontosRota]);

  useEffect(() => {
    if (
      !posicaoCaminhao ||
      !posicaoUsuario ||
      pontosRota.length === 0 ||
      tempoEstimado?.startsWith("gray")
    ) {
      if (!tempoEstimado?.startsWith("gray")) setTempoEstimado(null);
      return;
    }

    function distancia([lat1, lon1]: Posicao, [lat2, lon2]: Posicao) {
      return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
    }

    const pontoMaisProximoDoUsuario = pontosRota.reduce((prev, curr) =>
      distancia([curr.latitude, curr.longitude], posicaoUsuario) <
      distancia([prev.latitude, prev.longitude], posicaoUsuario)
        ? curr
        : prev
    );

    const pontoMaisProximoDoCaminhao = pontosRota.reduce((prev, curr) =>
      distancia([curr.latitude, curr.longitude], posicaoCaminhao) <
      distancia([prev.latitude, prev.longitude], posicaoCaminhao)
        ? curr
        : prev
    );

    const t1 = new Date(pontoMaisProximoDoCaminhao.timestamp).getTime();
    const t2 = new Date(pontoMaisProximoDoUsuario.timestamp).getTime();
    const diffMin = Math.round((t2 - t1) / 60000);

    if (diffMin < 0) {
      setTempoEstimado("green|O caminhão já passou");
    } else if (diffMin === 0) {
      setTempoEstimado("red|O caminhão está muito próximo");
    } else {
      setTempoEstimado(`blue|Tempo estimado: ${diffMin} minuto(s)`);
    }
  }, [posicaoCaminhao, posicaoUsuario, pontosRota]);

  const pontosLinhaLimitada = useMemo(() => {
    if (!posicaoCaminhao || !posicaoUsuario || pontosRota.length === 0)
      return [];

    function distancia([lat1, lon1]: Posicao, [lat2, lon2]: Posicao) {
      return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
    }

    const pontoMaisProximoDoUsuario = pontosRota.reduce((prev, curr) =>
      distancia([curr.latitude, curr.longitude], posicaoUsuario) <
      distancia([prev.latitude, prev.longitude], posicaoUsuario)
        ? curr
        : prev
    );

    const pontoMaisProximoDoCaminhao = pontosRota.reduce((prev, curr) =>
      distancia([curr.latitude, curr.longitude], posicaoCaminhao) <
      distancia([prev.latitude, prev.longitude], posicaoCaminhao)
        ? curr
        : prev
    );

    const idxUsuario = pontosRota.findIndex(
      (p) => p.id === pontoMaisProximoDoUsuario.id
    );
    const idxCaminhao = pontosRota.findIndex(
      (p) => p.id === pontoMaisProximoDoCaminhao.id
    );

    const startIdx = Math.min(idxUsuario, idxCaminhao);
    const endIdx = Math.max(idxUsuario, idxCaminhao);

    return pontosRota
      .slice(startIdx, endIdx + 1)
      .map((p) => [p.latitude, p.longitude] as Posicao);
  }, [posicaoCaminhao, posicaoUsuario, pontosRota]);

  const corTexto = tempoEstimado?.split("|")[0];
  const textoTempo = tempoEstimado?.split("|")[1];

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />
      <header className="h-16 bg-green-600 text-white p-4 text-xl font-bold">
        Caminhão em tempo real
      </header>

      <div className="p-4 bg-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Selecione a rota:
        </label>
        <select
          className="border rounded p-2 w-full max-w-md"
          value={rotaSelecionada}
          onChange={(e) => setRotaSelecionada(e.target.value)}
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

      {textoTempo && (
        <div
          className={`text-white text-lg font-semibold px-4 py-3 ${
            corTexto === "green"
              ? "bg-green-600"
              : corTexto === "red"
              ? "bg-orange-600"
              : corTexto === "blue"
              ? "bg-blue-600"
              : "bg-gray-500"
          }`}
        >
          {textoTempo}
        </div>
      )}

      <main className="flex-grow flex items-center justify-center">
        {rotaSelecionada === "" ? (
          <p className="text-center mt-10 text-gray-600">
            Por favor, selecione uma rota para acompanhar.
          </p>
        ) : tempoEstimado?.startsWith("gray") ? (
          <div className="flex flex-col items-center gap-4 text-gray-700">
            <Image
              src="/truck-icon.png"
              alt="Ícone de caminhão"
              width={64}
              height={64}
              priority
            />
            <p className="text-xl font-medium">Sem coleta no momento</p>
          </div>
        ) : posicaoCaminhao ? (
          <Map
            center={posicaoCaminhao}
            localUsuario={posicaoUsuario}
            pontosLinha={caminhãoPassou ? [] : pontosLinhaLimitada}
          />
        ) : (
          <p className="text-center mt-10">Carregando posição do caminhão...</p>
        )}
      </main>
    </div>
  );
}
