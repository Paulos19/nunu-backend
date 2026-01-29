import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Filtros opcionais vindos da URL
  const city = searchParams.get('city');
  const category = searchParams.get('category');

  try {
    const whereClause: any = {};

    // Filtro de Cidade (Case insensitive)
    if (city && city !== 'Brasil') {
      whereClause.city = {
        contains: city,
        mode: 'insensitive', // "são paulo" acha "São Paulo"
      };
    }

    // Filtro de Categoria (ex: "DJ" acha "DJ de Casamento")
    if (category) {
      whereClause.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    const providers = await prisma.providerProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
            email: true, // Útil se quiser usar o email do gravatar como fallback
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Mais recentes primeiro
      }
    });

    return NextResponse.json(providers);

  } catch (error) {
    console.error("Erro ao buscar providers:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}