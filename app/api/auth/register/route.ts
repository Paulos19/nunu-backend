import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// Instância singleton do Prisma (para evitar múltiplas conexões em dev)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 1. Schema de Validação (O mesmo do Mobile, para consistência)
const registerBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CLIENT", "PROVIDER"]),
});

export async function POST(request: Request) {
  try {
    // 2. Parse do Body
    const body = await request.json();
    const { name, email, password, role } = registerBodySchema.parse(body);

    // 3. Verifica se já existe
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return NextResponse.json(
        { error: "Este e-mail já está em uso." },
        { status: 409 } // Conflict
      );
    }

    // 4. Hash da senha (Segurança Sênior)
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Criação no Banco
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role, // O Prisma valida se bate com o Enum
      },
    });

    // 6. Retorno Limpo (Sem senha!)
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.format() }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}