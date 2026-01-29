import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

// Schema de Validação
const updateProfileSchema = z.object({
  category: z.string().min(2).optional(),
  bio: z.string().optional(),
  basePrice: z.number().optional(), // Recebe number, converte pra Decimal
  city: z.string().optional(),
  phone: z.string().optional(), // Atualiza no User
});

export async function PATCH(request: Request) {
  try {
    // 1. Validar Token (Segurança Manual Simples)
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

    // 2. Parse do Body
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    // 3. Atualizar no Banco (Transação para garantir integridade)
    // Atualizamos User (phone) e ProviderProfile (resto) juntos
    await prisma.$transaction(async (tx) => {
      
      // Atualiza telefone no User
      if (data.phone) {
        await tx.user.update({
          where: { id: userId },
          data: { phone: data.phone }
        });
      }

      // Atualiza ou Cria o Perfil do Profissional
      // (Apenas se tiver dados de perfil para atualizar)
      if (data.category || data.bio || data.basePrice || data.city) {
        await tx.providerProfile.upsert({
          where: { userId: userId },
          create: {
            userId: userId,
            category: data.category || "Geral",
            bio: data.bio,
            city: data.city,
            basePrice: data.basePrice,
          },
          update: {
            category: data.category,
            bio: data.bio,
            city: data.city,
            basePrice: data.basePrice,
          }
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}