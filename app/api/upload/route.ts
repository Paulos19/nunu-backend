import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Envia para o Vercel Blob
    // O nome do arquivo será único automaticamente
    const blob = await put(file.name, file, {
      access: "public",
    });

    // Retorna a URL pública da imagem
    return NextResponse.json({ url: blob.url });

  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json({ error: "Erro ao processar upload" }, { status: 500 });
  }
}