import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

// 1. Schema de Validação (Agora com avatarUrl)
const updateProfileSchema = z.object({
  category: z.string().min(2).optional(),
  bio: z.string().optional(),
  basePrice: z.any().optional(), // Aceita number ou string (conversão feita abaixo)
  city: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(), // <--- CAMPO IMPORTANTE
});

export async function PATCH(request: Request) {
  try {
    // 2. Validar Token (Segurança Manual)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "nunu-secret-dev-key";
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const userId = decoded.sub;

    // 3. Parse do Body
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    // Ajuste de Preço (Garante que é número para o Decimal do Prisma)
    const price = data.basePrice ? Number(data.basePrice) : undefined;

    // 4. Transação no Banco
    await prisma.$transaction(async (tx) => {
      
      // A: Atualiza dados do USUÁRIO (Avatar + Telefone)
      // Só executa se houver dados para atualizar
      if (data.phone || data.avatarUrl) {
        await tx.user.update({
          where: { id: userId },
          data: { 
            phone: data.phone,
            avatarUrl: data.avatarUrl 
          }
        });
      }

      // B: Atualiza ou Cria o PERFIL DO PROFISSIONAL
      if (data.category || data.bio || price || data.city) {
        await tx.providerProfile.upsert({
          where: { userId: userId },
          create: {
            userId: userId,
            category: data.category || "Geral",
            bio: data.bio,
            city: data.city,
            basePrice: price,
          },
          update: {
            category: data.category,
            bio: data.bio,
            city: data.city,
            basePrice: price,
          }
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Erro no update de perfil:", error);
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}