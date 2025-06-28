"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { MenuSuperior } from "@/components/MenuSuperior";

const Map = dynamic(() => import("@/components/MapAcompanhamento"), {
  ssr: false,
});

type Posicao = [number, number];

export default function AcompanharPage() {
  const [posicaoCaminhao, setPosicaoCaminhao] = useState<Posicao | null>(null);
  const [posicaoUsuario, setPosicaoUsuario] = useState<Posicao | null>(null);

  useEffect(() => {
    // Posição inicial do caminhão
    async function buscarUltimaPosicao() {
      const { data, error } = await supabase
        .from("rotas_realizadas")
        .select("latitude, longitude")
        .order("registrada_em", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Erro ao buscar posição:", error.message);
        return;
      }

      if (data) {
        setPosicaoCaminhao([data.latitude, data.longitude]);
      }
    }

    buscarUltimaPosicao();

    // Escuta em tempo real no Supabase
    const canal = supabase
      .channel("rota-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE", // também pode usar INSERT dependendo do fluxo
          schema: "public",
          table: "rotas_realizadas",
        },
        (payload) => {
          const nova = payload.new;
          if (nova.latitude && nova.longitude) {
            setPosicaoCaminhao([nova.latitude, nova.longitude]);
          }
        }
      )
      .subscribe();

    // Geolocalização do usuário
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

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />
      <header className="h-16 bg-green-600 text-white p-4 text-xl font-bold">
        Caminhão em tempo real
      </header>
      <main className="flex-grow">
        {posicaoCaminhao ? (
          <Map center={posicaoCaminhao} localUsuario={posicaoUsuario} />
        ) : (
          <p className="text-center mt-10">Carregando posição do caminhão...</p>
        )}
      </main>
    </div>
  );
}
