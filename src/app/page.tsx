"use client";

import { useRouter } from "next/navigation";
import { MenuSuperior } from "@/components/MenuSuperior";

export default function Home() {
  const router = useRouter();

  const botoes = [
    { label: "Acompanhamento", path: "/acompanhamento" },
    { label: "Administrar Rotas", path: "/administrar-rotas" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <MenuSuperior />
      <main className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
        {botoes.map((botao) => (
          <button
            key={botao.path}
            onClick={() => router.push(botao.path)}
            className="w-full max-w-sm hover:cursor-pointer bg-blue-600 text-white px-6 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
          >
            {botao.label}
          </button>
        ))}
      </main>
    </div>
  );
}
