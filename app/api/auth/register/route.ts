// backend/src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma"; // <--- Importando da nossa lib Singleton

// ⚠️ OBRIGATÓRIO PARA VERCEL + DB
// Impede que o Next.js tente conectar no banco durante o "npm run build"
export const dynamic = 'force-dynamic';

const registerBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CLIENT", "PROVIDER"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = registerBodySchema.parse(body);

    // Verifica se já existe
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return NextResponse.json(
        { error: "Este e-mail já está em uso." },
        { status: 409 }
      );
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criação no Banco
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    });

    // Retorno de Sucesso
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }, { status: 201 });

  } catch (error) {
    console.error("Erro no registro:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}