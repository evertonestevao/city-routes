"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MenuSuperior } from "@/components/MenuSuperior";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const MapImportacao = dynamic(() => import("@/components/MapImportacao"), {
  ssr: false,
});

interface PontoImportado {
  identificacao: string;
  latitude: number;
  longitude: number;
  contato?: string;
}

export default function RotasInteligentesPage() {
  const [nomeRota, setNomeRota] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pontos, setPontos] = useState<PontoImportado[]>([]);
  const [rotaCalculada, setRotaCalculada] = useState<PontoImportado[]>([]);
  const [tipoRota, setTipoRota] = useState<"otimizada" | "excel" | "manual">(
    "otimizada"
  );

  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<
        string,
        string | number
      >[];

      const parsed = json.map((linha) => ({
        identificacao: String(linha["Identificação"] || ""),
        latitude: Number(linha["Latitude"]),
        longitude: Number(linha["Longitude"]),
        contato: String(linha["Contato"] || ""),
      }));

      setPontos(parsed);
      toast.success("Arquivo processado com sucesso");
    };
    reader.readAsArrayBuffer(file);
  };

  const salvarRota = async () => {
    if (!nomeRota.trim()) {
      toast.error("Informe o nome da rota");
      return;
    }
    if (rotaCalculada.length === 0) {
      toast.error("Nenhuma rota calculada");
      return;
    }

    const { data: rota, error } = await supabase
      .from("rotas")
      .insert({ nome: nomeRota, descricao })
      .select()
      .single();

    if (error || !rota?.id) {
      toast.error("Erro ao salvar rota");
      return;
    }

    const pontosParaInserir = rotaCalculada.map((p, idx) => ({
      rota_id: rota.id,
      latitude: p.latitude,
      longitude: p.longitude,
      ordem: idx + 1,
    }));

    const { error: pontosErro } = await supabase
      .from("pontos_rota")
      .insert(pontosParaInserir);

    if (pontosErro) {
      toast.error("Erro ao salvar pontos");
    } else {
      toast.success("Rota criada com sucesso");

      // Resetar tudo
      setNomeRota("");
      setDescricao("");
      setPontos([]);
      setRotaCalculada([]);
      setTipoRota("otimizada");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <MenuSuperior />
      <header className="h-16 bg-green-700 text-white p-4 text-xl font-bold">
        Rota Inteligente
      </header>

      <Tabs defaultValue="importar" className="flex flex-col flex-1">
        <TabsList className="bg-gray-100 p-2 border-b w-full m-2">
          <TabsTrigger value="importar" className="m-4">
            Importar do Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="flex flex-col flex-1">
          <div className="p-4 max-w-3xl space-y-4">
            <Input
              hidden
              placeholder="Nome da rota"
              value={nomeRota}
              onChange={(e) => setNomeRota(e.target.value)}
            />
            <Textarea
              hidden
              placeholder="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
            <Input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleUploadExcel}
              className="hover:cursor-pointer"
            />

            {pontos.length > 0 && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tipoRota"
                    value="otimizada"
                    checked={tipoRota === "otimizada"}
                    onChange={() => setTipoRota("otimizada")}
                  />
                  Rota otimizada ORS
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tipoRota"
                    value="excel"
                    checked={tipoRota === "excel"}
                    onChange={() => setTipoRota("excel")}
                  />
                  Rota original (excel)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tipoRota"
                    value="manual"
                    checked={tipoRota === "manual"}
                    onChange={() => {
                      setTipoRota("manual");
                      setRotaCalculada(pontos); // simplesmente liga os pontos
                    }}
                  />
                  Rota sem ORS
                </label>
              </div>
            )}

            <Button
              onClick={salvarRota}
              disabled={rotaCalculada.length === 0}
              hidden
              className="mt-4"
            >
              Salvar Rota
            </Button>
          </div>

          <div className="flex-grow mt-4">
            {pontos.length > 0 && (
              <MapImportacao
                pontos={pontos}
                tipoRota={tipoRota}
                setRotaCalculada={setRotaCalculada}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
