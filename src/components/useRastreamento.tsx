"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export function useRastreamentoAtivo() {
  const idRef = useRef<string | null>(null); // armazena o ID do registro salvo

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          // Se ainda não tem ID, insere e guarda o ID
          if (!idRef.current) {
            const { data, error } = await supabase
              .from("rotas_realizadas")
              .insert({ latitude, longitude })
              .select("id")
              .single();

            if (error) {
              console.error("Erro ao inserir no Supabase:", error.message);
            } else {
              idRef.current = data.id;
            }
          } else {
            // Atualiza a posição do mesmo registro
            const { error } = await supabase
              .from("rotas_realizadas")
              .update({ latitude, longitude })
              .eq("id", idRef.current);

            if (error) {
              console.error("Erro ao atualizar posição:", error.message);
            }
          }
        } catch (err) {
          console.error("Erro inesperado:", err);
        }
      },
      (err) => {
        console.log("Erro ao obter localização:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);
}
