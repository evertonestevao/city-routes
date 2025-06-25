"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRastreamentoAtivo } from "@/components/useRastreamento";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function PaginaMapa() {
  useRastreamentoAtivo();
  const [posicao, setPosicao] = useState<[number, number] | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosicao([latitude, longitude]);
      },
      (err) => {
        alert("Erro ao obter localização: " + err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // aceita posição com até 5s de cache
        timeout: 10000, // timeout para obter nova posição
      }
    );

    // Cleanup ao desmontar componente: para de ouvir localização
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <header className="h-16 bg-gray-800 text-white p-4">Menu</header>
      <main className="flex-grow">
        {posicao ? (
          <Map center={posicao} />
        ) : (
          <p className="text-center mt-10">Obtendo localização...</p>
        )}
      </main>
    </div>
  );
}
