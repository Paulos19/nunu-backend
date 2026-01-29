import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Garante que a rota seja dinâmica no Vercel/Next.js
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Filtros opcionais vindos da URL (?city=Sp&category=DJ)
  const city = searchParams.get('city');
  const category = searchParams.get('category');

  try {
    const whereClause: any = {};

    // Filtro de Cidade (Case insensitive - ignora maiúsculas/minúsculas)
    if (city && city !== 'Brasil') {
      whereClause.city = {
        contains: city,
        mode: 'insensitive', 
      };
    }

    // Filtro de Categoria
    if (category) {
      whereClause.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    // Busca no banco
    const providers = await prisma.providerProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
            // Não retornamos email/senha por segurança
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Mostra os mais novos primeiro
      }
    });

    return NextResponse.json(providers);

  } catch (error) {
    console.error("Erro ao buscar providers:", error);
    return NextResponse.json({ error: "Erro interno ao buscar profissionais" }, { status: 500 });
  }
}