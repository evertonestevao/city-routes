"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useRastreamentoAtivo() {
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const { error } = await supabase.from("rotas_realizadas").insert({
            latitude,
            longitude,
          });

          if (error) {
            console.error("Erro ao salvar no Supabase:", error.message);
          }
        } catch (err: unknown) {
          if (err instanceof TypeError) {
            // Erro de rede (sem conexão), não faz nada
            console.warn(
              "Conexão perdida. Tentará novamente na próxima posição."
            );
          } else {
            console.error("Erro inesperado:", err);
          }
        }
      },
      (err) => {
        console.error("Erro ao obter localização:", err.message);
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
