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
import { supabase } from "@/lib/supabase";

export function MenuSuperior() {
  const router = useRouter();

  const botoes = [
    { label: "Acompanhamento", path: "/acompanhamento" },
    { label: "Administrar Rotas", path: "/administrar-rotas" },
    { label: "Iniciar Rota", path: "/iniciar-rota" },
  ];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/login");
    } else {
      alert("Erro ao fazer logout");
    }
  };

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
            className="text-white hover:bg-gray-700 hover:cursor-pointer"
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
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="justify-start hover:cursor-pointer"
            >
              Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
