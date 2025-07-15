"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

// Textos dinâmicos que vão digitar e apagar
const textos = [
  "Cria rotas",
  "Acompanha veículos em tempo real",
  "Otimiza rotas",
];

// Componente do texto com efeito máquina de escrever
function TextoMaquina() {
  const [indexTexto, setIndexTexto] = useState(0);
  const [subTexto, setSubTexto] = useState("");
  const [digitando, setDigitando] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (digitando) {
      if (subTexto.length < textos[indexTexto].length) {
        timeout = setTimeout(() => {
          setSubTexto(textos[indexTexto].slice(0, subTexto.length + 1));
        }, 150);
      } else {
        timeout = setTimeout(() => setDigitando(false), 1500);
      }
    } else {
      if (subTexto.length > 0) {
        timeout = setTimeout(() => {
          setSubTexto(subTexto.slice(0, -1));
        }, 100);
      } else {
        setDigitando(true);
        setIndexTexto((prev) => (prev + 1) % textos.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [subTexto, digitando, indexTexto]);

  return <>{subTexto || "\u00A0"}</>;
}

// Página principal de login
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const senhaRef = useRef<HTMLInputElement>(null);

  const handleLogin = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setLoading(false);

    if (error) {
      toast.error("E-mail ou senha inválidos");
    } else {
      toast.success("Login realizado com sucesso");
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Lado esquerdo: login */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-100 p-8">
        <div className="bg-white shadow-md p-8 rounded w-full max-w-sm space-y-6">
          <Image
            src="/truck-icon.png"
            alt="Logo"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-center text-gray-800">
            Sistema de Rotas
          </h1>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  senhaRef.current?.focus();
                }
              }}
            />
            <Input
              ref={senhaRef}
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Lado direito: imagem com overlay escuro e texto animado */}
      <div className="hidden md:block w-1/2 relative">
        {/* Imagem otimizada */}
        <Image
          src="/fundo.jpeg"
          alt="Login visual"
          fill
          className="object-cover"
          priority
        />

        {/* Camada escura com blur */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10" />

        {/* Texto sobre a imagem */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-white font-mono text-center select-none">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">
            Aqui você consegue:
          </h2>
          <h3
            className="text-3xl md:text-4xl border-r-4 border-white pr-4  overflow-hidden drop-shadow-lg"
            style={{ minHeight: "3rem" }}
          >
            <TextoMaquina />
          </h3>
        </div>
      </div>
    </div>
  );
}
