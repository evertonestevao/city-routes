"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { MenuSuperior } from "@/components/MenuSuperior";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

const Map = dynamic(() => import("../../components/MapRota"), { ssr: false });

interface Rota {
  id: string;
  nome: string;
}

interface Ponto {
  id: string;
  latitude: number;
  longitude: number;
  ordem: number;
  timestamp?: string;
  velocidade?: number;
}

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

export default function VisualizarRotaPage() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState<string | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [tempoTotal, setTempoTotal] = useState("--");
  const [velocidadeMedia, setVelocidadeMedia] = useState("--");

  const router = useRouter();

  useEffect(() => {
    supabase
      .from("rotas")
      .select("id, nome")
      .order("data_criacao", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Erro ao buscar rotas:", error.message);
        else setRotas(data || []);
      });
  }, []);

  useEffect(() => {
    if (!rotaSelecionada) {
      setPontos([]);
      return;
    }

    supabase
      .from("pontos_rota")
      .select("id, latitude, longitude, ordem, timestamp, velocidade")
      .eq("rota_id", rotaSelecionada)
      .order("ordem", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao buscar pontos:", error.message);
          return;
        }
        if (data && data.length >= 2) {
          const totalDistancia = data.reduce((acc, curr, idx, arr) => {
            if (idx === 0) return 0;
            const anterior = arr[idx - 1];
            return (
              acc +
              calcularDistanciaM(
                anterior.latitude,
                anterior.longitude,
                curr.latitude,
                curr.longitude
              )
            );
          }, 0);
          const primeiroTempo = new Date(data[0].timestamp!).getTime();
          const ultimoTempo = new Date(
            data[data.length - 1].timestamp!
          ).getTime();
          const duracaoSegundos = (ultimoTempo - primeiroTempo) / 1000;
          const velocidadeMediaKMH = (totalDistancia / duracaoSegundos) * 3.6;
          const minutos = Math.floor(duracaoSegundos / 60);
          const segundos = Math.floor(duracaoSegundos % 60);
          setTempoTotal(`${minutos}m ${segundos}s`);
          setVelocidadeMedia(`${velocidadeMediaKMH.toFixed(1)} km/h`);
        }
        setPontos(data || []);
      });
  }, [rotaSelecionada]);

  async function excluirPonto(id: string) {
    const index = pontos.findIndex((p) => p.id === id);
    if (index === 0 || index === pontos.length - 1) {
      alert("Não é permitido excluir o início ou o fim da rota.");
      return;
    }

    const { error } = await supabase.from("pontos_rota").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir ponto: " + error.message);
      return;
    }

    const novosPontos = pontos.filter((p) => p.id !== id);
    const pontosReordenados = novosPontos.map((ponto, idx) => ({
      ...ponto,
      ordem: idx,
    }));
    setPontos(pontosReordenados);
  }

  async function excluirRotaCompleta() {
    if (!rotaSelecionada) return;
    const { error: erroPontos } = await supabase
      .from("pontos_rota")
      .delete()
      .eq("rota_id", rotaSelecionada);
    if (erroPontos)
      return alert("Erro ao excluir pontos: " + erroPontos.message);
    const { error: erroRota } = await supabase
      .from("rotas")
      .delete()
      .eq("id", rotaSelecionada);
    if (erroRota) return alert("Erro ao excluir rota: " + erroRota.message);

    setRotaSelecionada(null);
    setPontos([]);
    setTempoTotal("--");
    setVelocidadeMedia("--");

    const { data: novasRotas } = await supabase
      .from("rotas")
      .select("id, nome")
      .order("data_criacao", { ascending: false });
    setRotas(novasRotas || []);
  }

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />
      <header className="h-16 bg-gray-800 text-white flex items-center justify-between px-4">
        <button
          onClick={() => router.back()}
          className="text-white hover:text-gray-300 text-sm"
        >
          ← Voltar
        </button>
        <span className="text-lg font-semibold">Visualizar Rota</span>
      </header>

      <main className="flex-1 flex flex-col">
        <div className="p-4">
          <select
            className="w-full p-2 border rounded"
            value={rotaSelecionada || ""}
            onChange={(e) => setRotaSelecionada(e.target.value)}
          >
            <option value="">Selecione uma rota</option>
            {rotas.map((rota) => (
              <option key={rota.id} value={rota.id}>
                {rota.nome}
              </option>
            ))}
          </select>

          {pontos.length > 1 && (
            <div className="flex items-start justify-between gap-4 mt-4">
              <div className="text-sm text-gray-700">
                <p>
                  <strong>Duração estimada:</strong> {tempoTotal}
                </p>
                <p>
                  <strong>Velocidade média:</strong> {velocidadeMedia}
                </p>
              </div>

              {rotaSelecionada && (
                <ConfirmDialog
                  title={`Excluir rota "${
                    rotas.find((r) => r.id === rotaSelecionada)?.nome
                  }"?`}
                  description="Essa ação é irreversível."
                  onConfirm={excluirRotaCompleta}
                >
                  <Button
                    variant="destructive"
                    className="hover:cursor-pointer"
                  >
                    Excluir Rota
                  </Button>
                </ConfirmDialog>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 border-t">
          <Map pontos={pontos} onExcluirPonto={excluirPonto} />
        </div>
      </main>
    </div>
  );
}
