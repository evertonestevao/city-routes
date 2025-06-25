"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const Map = dynamic(() => import("../../components/MapRota"), { ssr: false });

interface Rota {
  id: string;
  nome: string;
}

interface Ponto {
  id: string; // id do ponto no BD
  latitude: number;
  longitude: number;
  ordem: number;
}

export default function VisualizarRotaPage() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState<string | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);

  // Busca rotas ao iniciar
  useEffect(() => {
    const fetchRotas = async () => {
      const { data, error } = await supabase
        .from("rotas")
        .select("id, nome")
        .order("data_criacao", { ascending: false });

      if (error) {
        console.error("Erro ao buscar rotas:", error.message);
      } else {
        setRotas(data || []);
      }
    };

    fetchRotas();
  }, []);

  const router = useRouter();

  // Busca pontos da rota selecionada
  useEffect(() => {
    if (!rotaSelecionada) {
      setPontos([]);
      return;
    }

    const fetchPontos = async () => {
      const { data, error } = await supabase
        .from("pontos_rota")
        .select("id, latitude, longitude, ordem")
        .eq("rota_id", rotaSelecionada)
        .order("ordem", { ascending: true });

      if (error) {
        console.error("Erro ao buscar pontos:", error.message);
      } else {
        setPontos(data || []);
      }
    };

    fetchPontos();
  }, [rotaSelecionada]);

  // Função para excluir ponto pelo id
  async function excluirPonto(id: string) {
    // Evita exclusão do primeiro e último ponto
    const index = pontos.findIndex((p) => p.id === id);
    if (index === 0 || index === pontos.length - 1) {
      alert("Não é permitido excluir o início ou o fim da rota.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este ponto?")) return;

    // Remove do banco
    const { error } = await supabase.from("pontos_rota").delete().eq("id", id);

    if (error) {
      alert("Erro ao excluir ponto: " + error.message);
      return;
    }

    // Remove localmente
    const novosPontos = pontos.filter((p) => p.id !== id);

    // Reordena a ordem localmente (ajuste opcional, pode ser tratado no backend)
    const pontosReordenados = novosPontos.map((ponto, idx) => ({
      ...ponto,
      ordem: idx,
    }));

    setPontos(pontosReordenados);
  }

  return (
    <div className="flex flex-col h-screen">
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
        </div>

        <div className="flex-1 border-t">
          <Map pontos={pontos} onExcluirPonto={excluirPonto} />
        </div>
      </main>
    </div>
  );
}
