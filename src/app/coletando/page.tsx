// ColetandoPage.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { MenuSuperior } from "@/components/MenuSuperior";

const MapColetando = dynamic(() => import("@/components/MapColetando"), {
  ssr: false,
});

interface Rota {
  id: string;
  nome: string;
}

type Posicao = [number, number];

interface PontoRota {
  id: string;
  rota_id: string;
  ordem: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export default function ColetandoPage() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState<string>("");
  const [posicaoUsuario, setPosicaoUsuario] = useState<Posicao | null>(null);
  const [pontosRota, setPontosRota] = useState<PontoRota[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar rotas disponíveis
  useEffect(() => {
    async function buscarRotas() {
      const { data, error } = await supabase
        .from("rotas")
        .select("id, nome")
        .order("data_criacao", { ascending: false });

      if (error) {
        console.error("Erro ao buscar rotas:", error.message);
        return;
      }

      if (data && data.length > 0) {
        setRotas(data);
        setRotaSelecionada(data[0].id);
      }
    }

    buscarRotas();
  }, []);

  // Buscar pontos da rota selecionada
  useEffect(() => {
    if (!rotaSelecionada) return;

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

  // Obter localização atual do usuário e salvar/atualizar registro no supabase
  useEffect(() => {
    if (!rotaSelecionada) return;
    if (!navigator.geolocation) {
      console.warn("Geolocalização não suportada pelo navegador.");
      return;
    }

    setLoading(true);

    const salvarPosicao = async (latitude: number, longitude: number) => {
      try {
        const { data: existingData, error: selectError } = await supabase
          .from("rotas_realizadas")
          .select("id")
          .eq("rota_id", rotaSelecionada)
          .limit(1)
          .single();

        const payload = {
          latitude,
          longitude,
          registrada_em: new Date().toISOString(),
          rota_id: rotaSelecionada,
        };

        if (selectError && selectError.code !== "PGRST116") {
          console.error(
            "Erro ao buscar registro existente:",
            selectError.message
          );
          setLoading(false);
          return;
        }

        if (existingData && existingData.id) {
          const { error: updateError } = await supabase
            .from("rotas_realizadas")
            .update(payload)
            .eq("id", existingData.id);

          if (updateError) {
            console.error("Erro ao atualizar posição:", updateError.message);
          }
        } else {
          const { error: insertError } = await supabase
            .from("rotas_realizadas")
            .insert(payload);

          if (insertError) {
            console.error("Erro ao inserir posição:", insertError.message);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setPosicaoUsuario([latitude, longitude]);
        salvarPosicao(latitude, longitude);
      },
      (error) => {
        console.warn("Erro ao obter localização:", error.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [rotaSelecionada]);

  const pontosLinha = useMemo(() => {
    return pontosRota.map((p) => [p.latitude, p.longitude] as Posicao);
  }, [pontosRota]);

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />

      <header className="h-16 bg-green-600 text-white p-4 text-xl font-bold flex items-center">
        <span>Coletando</span>
        <select
          className="ml-4 border rounded p-2"
          value={rotaSelecionada}
          onChange={(e) => setRotaSelecionada(e.target.value)}
        >
          {rotas.map((rota) => (
            <option key={rota.id} value={rota.id}>
              {rota.nome}
            </option>
          ))}
        </select>
      </header>

      <main className="flex-grow">
        {posicaoUsuario ? (
          <MapColetando center={posicaoUsuario} pontosLinha={pontosLinha} />
        ) : (
          <p className="text-center mt-10">
            Aguardando localização do usuário...
          </p>
        )}
      </main>

      {loading && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          Salvando localização...
        </div>
      )}
    </div>
  );
}
