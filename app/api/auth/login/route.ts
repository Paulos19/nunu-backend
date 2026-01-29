import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginBodySchema.parse(body);

    // INCLUIR O PERFIL NA RESPOSTA
    const user = await prisma.user.findUnique({
      where: { email },
      include: { providerProfile: true, clientProfile: true } // <--- IMPORTANTE
    });

    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET || "nunu-secret-dev-key";

    const token = jwt.sign(
      { 
        sub: user.id, 
        role: user.role, 
        name: user.name 
      }, 
      secret, 
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        providerProfile: user.providerProfile,
        clientProfile: user.clientProfile,
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