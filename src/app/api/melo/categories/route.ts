import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';

interface CustomCategory {
  id: string;
  name: string;   // chave UPPERCASE — ex: "TRANSPORTE"
  label: string;  // nome de exibição — ex: "Transporte"
  color: string;  // hex — ex: "#10B981"
  createdAt: string;
}

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const cats = await readDb<CustomCategory[]>('expense_categories', []);
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { label, color } = await req.json();
  if (!label || !color) return NextResponse.json({ error: 'label e color obrigatórios' }, { status: 400 });

  const name = label.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '_');

  const cats = await readDb<CustomCategory[]>('expense_categories', []);
  if (cats.find(c => c.name === name)) {
    return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 });
  }

  const newCat: CustomCategory = {
    id: crypto.randomUUID(), name, label: label.trim(), color, createdAt: new Date().toISOString(),
  };
  cats.push(newCat);
  await writeDb('expense_categories', cats);
  return NextResponse.json(newCat, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const cats = await readDb<CustomCategory[]>('expense_categories', []);
  await writeDb('expense_categories', cats.filter(c => c.id !== id));
  return NextResponse.json({ ok: true });
}
