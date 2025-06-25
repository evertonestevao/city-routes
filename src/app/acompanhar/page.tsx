"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

type Posicao = [number, number];

export default function AcompanharPage() {
  const [posicao, setPosicao] = useState<Posicao | null>(null);

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
      setPosicao([data.latitude, data.longitude]);
    }
  }

  useEffect(() => {
    buscarUltimaPosicao();
    const intervalo = setInterval(buscarUltimaPosicao, 2000); // atualiza a cada 60s
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <header className="h-16 bg-green-600 text-white p-4 text-xl font-bold">
        Caminhão em tempo real
      </header>
      <main className="flex-grow">
        {posicao ? (
          <Map center={posicao} />
        ) : (
          <p className="text-center mt-10">Carregando posição...</p>
        )}
      </main>
    </div>
  );
}
