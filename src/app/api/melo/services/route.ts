import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { Service, FinanceEntry } from '@/lib/melo/types';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

/** Cria entradas de receita/a-receber em finanças para um serviço */
async function syncServiceFinances(service: Service) {
  const finances  = await readDb<FinanceEntry[]>('finances', []);
  const today     = new Date().toISOString().split('T')[0];

  // Remove entradas antigas vinculadas a este serviço (recria do zero)
  const clean = finances.filter(f => f.serviceId !== service.id);

  if (service.paymentType === 'total' && service.value > 0) {
    clean.push({
      id:          crypto.randomUUID(),
      type:        'income',
      amount:      service.value,
      category:    'RECEITA_SERVICO',
      description: service.name,
      date:        service.startDate || today,
      client:      service.client,
      createdAt:   new Date().toISOString(),
      source:      'service',
      serviceId:   service.id,
      isPending:   false,
    });
  }

  if (service.paymentType === 'sinal') {
    if (service.signalValue && service.signalValue > 0) {
      clean.push({
        id:          crypto.randomUUID(),
        type:        'income',
        amount:      service.signalValue,
        category:    'RECEITA_SERVICO',
        description: `Sinal — ${service.name}`,
        date:        service.signalDate || service.startDate || today,
        client:      service.client,
        createdAt:   new Date().toISOString(),
        source:      'service',
        serviceId:   service.id,
        isPending:   false,
      });
    }

    if (service.remainingValue && service.remainingValue > 0) {
      // Verifica se o restante já foi confirmado
      if (service.remainingReceived && service.remainingReceivedDate) {
        clean.push({
          id:          crypto.randomUUID(),
          type:        'income',
          amount:      service.remainingValue,
          category:    'RECEITA_SERVICO',
          description: `Restante — ${service.name}`,
          date:        service.remainingReceivedDate,
          client:      service.client,
          createdAt:   new Date().toISOString(),
          source:      'service',
          serviceId:   service.id,
          isPending:   false,
        });
      } else {
        clean.push({
          id:          crypto.randomUUID(),
          type:        'income',
          amount:      service.remainingValue,
          category:    'A_RECEBER',
          description: `A Receber — ${service.name}`,
          date:        service.remainingDate || service.deadline || today,
          client:      service.client,
          createdAt:   new Date().toISOString(),
          source:      'service',
          serviceId:   service.id,
          isPending:   true,
        });
      }
    }
  }

  await writeDb('finances', clean);
}

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const status = new URL(req.url).searchParams.get('status');
  let services = await readDb<Service[]>('services', []);
  if (status) services = services.filter(s => s.status === status);
  services.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const service: Service = {
    id:              crypto.randomUUID(),
    name:            body.name,
    client:          body.client         || '',
    clientPhone:     body.clientPhone    || '',
    clientEmail:     body.clientEmail    || '',
    address:         body.address        || '',
    type:            body.type           || 'other',
    status:          body.status         || 'proposal',
    value:           parseFloat(body.value) || 0,
    startDate:       body.startDate      || new Date().toISOString().split('T')[0],
    deadline:        body.deadline       || '',
    progress:        parseInt(body.progress)    || 0,
    currentStep:     parseInt(body.currentStep) || 0,
    notes:           body.notes          || '',
    createdAt:       new Date().toISOString(),
    clientToken:     crypto.randomUUID(),
    stages:          body.stages         || [],
    comments:        body.comments       || [],
    paymentType:     body.paymentType    || 'total',
    signalValue:     body.signalValue    ? parseFloat(body.signalValue)    : undefined,
    signalDate:      body.signalDate     || undefined,
    remainingValue:  body.remainingValue ? parseFloat(body.remainingValue) : undefined,
    remainingDate:   body.remainingDate  || undefined,
  };

  const services = await readDb<Service[]>('services', []);
  services.push(service);
  await writeDb('services', services);

  // Sincroniza finanças automaticamente
  await syncServiceFinances(service);

  return NextResponse.json(service, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body     = await req.json();
  const services = await readDb<Service[]>('services', []);
  const idx      = services.findIndex(s => s.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  services[idx] = {
    ...services[idx],
    ...body,
    clientToken: services[idx].clientToken || crypto.randomUUID(),
    stages:      body.stages   !== undefined ? body.stages   : (services[idx].stages   || []),
    comments:    body.comments !== undefined ? body.comments : (services[idx].comments || []),
  };
  await writeDb('services', services);

  // Re-sincroniza finanças sempre que o pagamento puder ter mudado
  const syncTriggers = ['paymentType','value','signalValue','signalDate',
                        'remainingValue','remainingDate','remainingReceived','remainingReceivedDate',
                        'name','client','startDate'];
  if (syncTriggers.some(k => k in body)) {
    await syncServiceFinances(services[idx]);
  }

  return NextResponse.json(services[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  await writeDb('services', services.filter(s => s.id !== id));

  // Remove entradas financeiras vinculadas ao serviço deletado
  const finances = await readDb<FinanceEntry[]>('finances', []);
  await writeDb('finances', finances.filter(f => f.serviceId !== id));

  return NextResponse.json({ ok: true });
}
