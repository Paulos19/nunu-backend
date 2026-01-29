import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma"; // Sua lib do Prisma

// Importante para evitar erros de build na Vercel
export const dynamic = 'force-dynamic';

// 1. Schema de Validação
const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    // 2. Recebe os dados
    const body = await request.json();
    const { email, password } = loginBodySchema.parse(body);

    // 3. Busca o usuário no banco
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 4. Segurança: Se não achar usuário, retorna erro genérico (evita enumerar e-mails)
    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // 5. Verifica a senha (Hash)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // 6. Gera o Token JWT
    // Pega o segredo do .env ou usa um fallback para dev (NUNCA use fallback em produção)
    const secret = process.env.JWT_SECRET || "nunu-secret-dev-key";

    const token = jwt.sign(
      { 
        sub: user.id, // Subject (Quem é o dono do token)
        role: user.role, // Guardamos a role no token para facilitar verificação no front
        name: user.name 
      }, 
      secret, 
      { expiresIn: '7d' } // Expira em 7 dias
    );

    // 7. Retorna os dados para o Mobile
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Login Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}