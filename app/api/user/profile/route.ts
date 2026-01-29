import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

// 1. Schema de Validação Unificado (Provider + Client)
const updateProfileSchema = z.object({
  // Campos Gerais (User)
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  
  // Campos Provider
  category: z.string().optional(),
  bio: z.string().optional(),
  basePrice: z.any().optional(),
  
  // Campos Client (NOVOS)
  eventType: z.string().optional(),
  lookingFor: z.string().optional(),
  eventDate: z.string().optional(),
  
  // Compartilhado (Provider usa em 'city', Client usa em 'city')
  city: z.string().optional(),
});

export async function PATCH(request: Request) {
  try {
    // 2. Validar Token
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

    const price = data.basePrice ? Number(data.basePrice) : undefined;

    // 4. Transação no Banco
    await prisma.$transaction(async (tx) => {
      
      // A: Atualiza dados do USUÁRIO (Comum)
      if (data.phone || data.avatarUrl) {
        await tx.user.update({
          where: { id: userId },
          data: { 
            phone: data.phone,
            avatarUrl: data.avatarUrl 
          }
        });
      }

      // B: Atualiza/Cria PERFIL DO PROFISSIONAL (Se houver dados relevantes)
      if (data.category || data.bio || price || (data.city && !data.eventType)) {
        // Nota: City é ambíguo, aqui assumimos que se não tem eventType, pode ser update de provider
        // O ideal é o frontend sempre mandar o contexto, mas a lógica 'upsert' protege.
        
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

      // C: Atualiza/Cria PERFIL DO CLIENTE (Se houver dados relevantes)
      if (data.eventType || data.lookingFor || data.eventDate || (data.city && data.eventType)) {
        await tx.clientProfile.upsert({
          where: { userId: userId },
          create: {
            userId: userId,
            eventType: data.eventType,
            lookingFor: data.lookingFor,
            city: data.city,
            eventDate: data.eventDate
          },
          update: {
            eventType: data.eventType,
            lookingFor: data.lookingFor,
            city: data.city,
            eventDate: data.eventDate
          }
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Erro no update de perfil:", error);
    // Retorna erro genérico para não vazar detalhes do banco
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}