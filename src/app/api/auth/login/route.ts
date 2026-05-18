import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserByEmail, seedOperatorIfEmpty } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  await seedOperatorIfEmpty().catch(() => {});

  const { email, password } = await req.json();

  const user = await getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role as "operator" | "client";
  session.name = user.name;
  await session.save();

  return NextResponse.json({ role: user.role });
}
