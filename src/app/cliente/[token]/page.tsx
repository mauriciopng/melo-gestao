import type { Metadata } from 'next';
import { readDb } from '@/lib/melo/db';
import type { Service, ServiceStage, ServiceComment } from '@/lib/melo/types';

// Página do cliente: sempre renderizada do zero, sem cache, link nunca expira
export const dynamic    = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: 'Acompanhamento de Obra',
  description: 'Acompanhe o andamento do seu serviço em tempo real',
};

interface PublicService {
  id: string;
  name: string;
  client: string;
  status: string;
  progress: number;
  startDate: string;
  deadline: string;
  stages: ServiceStage[];
  comments: ServiceComment[];
}

async function getService(token: string): Promise<PublicService | null> {
  try {
    const services = await readDb<Service[]>('services', []);
    const svc = services.find(s => s.clientToken === token);
    if (!svc) return null;
    return {
      id:        svc.id,
      name:      svc.name,
      client:    svc.client,
      status:    svc.status,
      progress:  svc.progress,
      startDate: svc.startDate,
      deadline:  svc.deadline,
      stages:    svc.stages  || [],
      comments:  (svc.comments || []).filter(c => c.isPublic),
    };
  } catch {
    return null;
  }
}

const STATUS_LABELS: Record<string, string> = {
  proposal: 'Em proposta', in_progress: 'Em andamento',
  review: 'Em revisão', completed: 'Concluído', cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  proposal: '#FF9F0A', in_progress: '#0066FF', review: '#BF5AF2',
  completed: '#32D74B', cancelled: '#8E8E93',
};
const STAGE_COLORS: Record<string, string> = {
  pendente: '#8E8E93', em_andamento: '#0066FF', concluido: '#32D74B',
};
const STAGE_LABELS: Record<string, string> = {
  pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído',
};

export default async function ClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const service = await getService(token);

  if (!service) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(229,72,77,0.15)', border: '1px solid rgba(229,72,77,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28 }}>
            ✕
          </div>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Serviço não encontrado</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Este link pode ter expirado ou é inválido. Por favor, solicite um novo link ao responsável.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = service.stages.filter(s => s.status === 'concluido').length;
  const progress = service.stages.length > 0
    ? Math.round((completedCount / service.stages.length) * 100)
    : service.progress;
  const statusColor = STATUS_COLORS[service.status] || '#888';

  return (
    <div style={{
      minHeight: '100dvh',
      maxHeight: '100dvh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain',
      background: 'linear-gradient(160deg, #0d1a2f 0%, #091320 60%, #060d1a 100%)',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      color: '#fff',
      paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))',
    } as React.CSSProperties}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: 'calc(env(safe-area-inset-top) + 1rem) 1.25rem 1rem',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/alfaglass-icon.png" alt="Alfa Glass" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }} />
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Acompanhamento de Obra</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 1 }}>{service.client}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Service card */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '1.25rem', backdropFilter: 'blur(12px)' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, lineHeight: 1.3 }}>{service.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: statusColor + '22', color: statusColor }}>
              {STATUS_LABELS[service.status] || service.status}
            </span>
            {service.deadline && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                Prazo: {new Date(service.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {/* Progress */}
          {service.stages.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Progresso geral</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1D6EF7' }}>{progress}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 100, width: `${progress}%`, background: 'linear-gradient(90deg,#1D6EF7,#32D74B)', transition: 'width 1s ease' }} />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                {completedCount} de {service.stages.length} etapas concluídas
              </p>
            </div>
          )}
        </div>

        {/* Stages */}
        {service.stages.length > 0 && (
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
              Etapas do Serviço
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {service.stages.map((stage, idx) => {
                const col = STAGE_COLORS[stage.status];
                const done = stage.status === 'concluido';
                const active = stage.status === 'em_andamento';
                return (
                  <div key={stage.id} style={{
                    background: done ? 'rgba(50,215,75,0.06)' : active ? 'rgba(0,102,255,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${done ? 'rgba(50,215,75,0.2)' : active ? 'rgba(0,102,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 16,
                    padding: '0.875rem 1rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: col + '22', border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {done ? (
                        <span style={{ color: col, fontSize: 13, fontWeight: 800 }}>✓</span>
                      ) : active ? (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Etapa {idx + 1}</span>
                        <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 10, background: col + '22', color: col, fontWeight: 600 }}>
                          {STAGE_LABELS[stage.status]}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: done ? 500 : 700, color: done ? 'rgba(255,255,255,0.5)' : '#fff', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>
                        {stage.name}
                      </p>
                      {stage.description && (
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3, lineHeight: 1.5 }}>{stage.description}</p>
                      )}
                      {stage.completedAt && (
                        <p style={{ fontSize: 10, color: '#32D74B', marginTop: 4 }}>
                          ✓ Concluído em {new Date(stage.completedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Public comments */}
        {service.comments.length > 0 && (
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
              Atualizações
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {service.comments.map(comment => (
                <div key={comment.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '0.875rem 1rem' }}>
                  <p style={{ fontSize: 14, color: '#fff', lineHeight: 1.6, marginBottom: 6 }}>{comment.text}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                    {new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            Alfa Glass — Acompanhamento de Obra
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 2 }}>
            Esta página é exclusiva para o acompanhamento deste serviço
          </p>
        </div>
      </div>
    </div>
  );
}
