"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type PosicaoCaminhao = {
  latitude: number;
  longitude: number;
};

type Payload = {
  new: PosicaoCaminhao;
};

interface PosicaoRealtimeProps {
  rotaId: string;
}

export default function PosicaoRealtime({ rotaId }: PosicaoRealtimeProps) {
  const [posicao, setPosicao] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosicaoInicial = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("posicao_caminhao")
        .select("latitude, longitude")
        .eq("rota_id", rotaId)
        .order("atualizado_em", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        setErro("Erro ao buscar posição inicial do caminhão.");
        setLoading(false);
        return;
      }

      if (data) {
        setPosicao([data.latitude, data.longitude]);
      }
      setLoading(false);
    };

    fetchPosicaoInicial();

    const channel = supabase
      .channel("posicao_caminhao_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posicao_caminhao",
          filter: `rota_id=eq.${rotaId}`,
        },
        (payload: Payload) => {
          const novaPos = payload.new;
          if (novaPos?.latitude && novaPos?.longitude) {
            setPosicao([novaPos.latitude, novaPos.longitude]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rotaId]);

  if (loading) return <p>Carregando posição do caminhão...</p>;
  if (erro) return <p className="text-red-600">{erro}</p>;
  if (!posicao) return <p>Posição do caminhão não disponível.</p>;

  return (
    <p>
      Posição atual do caminhão: Latitude {posicao[0].toFixed(6)}, Longitude{" "}
      {posicao[1].toFixed(6)}
    </p>
  );
}
