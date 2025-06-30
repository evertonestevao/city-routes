"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MenuSuperior } from "@/components/MenuSuperior";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

const MapGravacao = dynamic(() => import("@/components/MapGravacao"), {
  ssr: false,
});
const MapVisualizacao = dynamic(
  () => import("@/components/MapVisualizacaoRota"),
  { ssr: false }
);

type Posicao = [number, number];

interface Rota {
  id: string;
  nome: string;
  descricao?: string;
  data_criacao?: string;
}

export default function AdministrarRotasPage() {
  const [tab, setTab] = useState("registrar");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [rotaId, setRotaId] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [posicaoInicial, setPosicaoInicial] = useState<Posicao>([
    -21.625874427846078, -49.79055415083361,
  ]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaVisualizarId, setRotaVisualizarId] = useState<string | null>(null);
  const [rotaParaExcluir, setRotaParaExcluir] = useState<Rota | null>(null);

  useEffect(() => {
    carregarRotas();
  }, []);

  const carregarRotas = async () => {
    const { data } = await supabase
      .from("rotas")
      .select("id, nome, descricao")
      .order("data_criacao", { ascending: false });

    if (data) setRotas(data);
  };

  const iniciarGravacao = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome da rota");
      return;
    }

    const { data, error } = await supabase
      .from("rotas")
      .insert({ nome, descricao })
      .select()
      .single();

    if (error || !data?.id) {
      toast.error("Erro ao criar rota");
      return;
    }

    setRotaId(data.id);
    setGravando(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPosicaoInicial([
            position.coords.latitude,
            position.coords.longitude,
          ]);
        },
        () => toast.warning("Não foi possível obter sua localização.")
      );
    } else {
      toast.warning("Geolocalização não suportada.");
    }

    toast.success("Gravação iniciada");
  };

  const pararGravacao = () => {
    setGravando(false);
    setRotaId(null);
    toast.success("Gravação encerrada");
    setNome("");
    setDescricao("");
    carregarRotas();
  };

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />

      <header className="h-16 bg-green-600 text-white p-4 text-xl font-bold">
        Administrar Rotas
      </header>

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1">
        <TabsList className="bg-gray-100 p-2 border-b w-full">
          <TabsTrigger value="registrar" className="hover:cursor-pointer m-4">
            Registrar
          </TabsTrigger>
          <TabsTrigger value="visualizar" className="hover:cursor-pointer m-4">
            Visualizar
          </TabsTrigger>
        </TabsList>

        {/* Registrar */}
        <TabsContent value="registrar" className="flex flex-col flex-1">
          {!gravando && (
            <div className="p-4 max-w-3xl space-y-4">
              <Input
                placeholder="Nome da rota"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <Textarea
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
              <Button onClick={iniciarGravacao}>Iniciar gravação</Button>
            </div>
          )}

          {gravando && (
            <div className="p-4 bg-yellow-100 flex items-center justify-between">
              <div className="text-red-600 font-medium animate-pulse">
                ● Gravando...
              </div>
              <Button variant="destructive" onClick={pararGravacao}>
                Parar gravação
              </Button>
            </div>
          )}

          <div className="flex-grow">
            {gravando && rotaId && (
              <MapGravacao rotaId={rotaId} centroInicial={posicaoInicial} />
            )}
          </div>
        </TabsContent>

        {/* Visualizar */}
        <TabsContent
          value="visualizar"
          className="flex flex-col flex-1 overflow-y-auto"
        >
          <div className="p-4">
            <ul className="space-y-2">
              {rotas.map((rota) => (
                <li
                  key={rota.id}
                  className="flex flex-col gap-2 bg-white p-4 rounded shadow"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <strong>{rota.nome}</strong>
                      <p className="text-sm text-gray-500">{rota.descricao}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setRotaVisualizarId(
                            rotaVisualizarId === rota.id ? null : rota.id
                          )
                        }
                      >
                        {rotaVisualizarId === rota.id
                          ? "Ocultar rota"
                          : "Ver rota"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setRotaParaExcluir(rota)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>

                  {rotaVisualizarId === rota.id && (
                    <div className="h-72 mt-4">
                      <MapVisualizacao rotaId={rota.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* <div className="flex-grow">
            {rotaVisualizarId && <MapVisualizacao rotaId={rotaVisualizarId} />}
          </div> */}
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação */}
      {rotaParaExcluir && (
        <Dialog
          open={!!rotaParaExcluir}
          onOpenChange={(open) => !open && setRotaParaExcluir(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Rota</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a rota{" "}
                <strong>{rotaParaExcluir.nome}</strong>?<br />
                Essa ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setRotaParaExcluir(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await supabase
                    .from("pontos_rota")
                    .delete()
                    .eq("rota_id", rotaParaExcluir.id);
                  const { error } = await supabase
                    .from("rotas")
                    .delete()
                    .eq("id", rotaParaExcluir.id);

                  if (error) {
                    toast.error("Erro ao excluir rota");
                  } else {
                    toast.success("Rota excluída com sucesso");
                    carregarRotas();
                    if (rotaVisualizarId === rotaParaExcluir.id) {
                      setRotaVisualizarId(null);
                    }
                  }

                  setRotaParaExcluir(null);
                }}
              >
                Confirmar exclusão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
