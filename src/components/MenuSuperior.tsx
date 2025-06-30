import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";

export function MenuSuperior() {
  const router = useRouter();

  const botoes = [
    { label: "Acompanhamento", path: "/acompanhamento" },
    { label: "Coletando", path: "/coletando" },
    { label: "Acompanhar", path: "/acompanhar" },
    { label: "Mapa", path: "/mapa" },
    { label: "Registrar Rota", path: "/registrar-rota" },
    { label: "Visualizar Rota", path: "/visualizar-rota" },
    { label: "Dados da Rota", path: "/calculo-rota" },
    { label: "Motorista Rotas", path: "/rota-motorista" },
    { label: "Estimativa", path: "/estimativa" },
  ];

  return (
    <header className="h-16 bg-gray-800 text-white flex items-center justify-between px-4">
      <h1
        className="text-xl font-semibold hover:cursor-pointer"
        onClick={() => router.push("/")}
      >
        Sistema de Rotas
      </h1>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-gray-700"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-64 bg-white p-4 z-[9999]">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col space-y-4 mt-4">
            {botoes.map((botao) => (
              <Button
                key={botao.path}
                onClick={() => router.push(botao.path)}
                variant="outline"
                className="justify-start hover:cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
              >
                {botao.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
