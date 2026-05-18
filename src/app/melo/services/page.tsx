'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/melo/AppShell';
import {
  Plus, X, Briefcase, ShareNetwork,
  ChatCircle, ArrowLeft, PaperPlaneTilt, Eye, EyeSlash,
  CheckCircle, Circle, DotsThreeVertical,
} from '@phosphor-icons/react';
import { Trash2, ChevronDown } from 'lucide-react';
import { useTheme } from '@/lib/melo/theme';
import type { Service, ServiceStage, ServiceComment } from '@/lib/melo/types';

const STATUSES = ['all', 'proposal', 'in_progress', 'review', 'completed', 'cancelled'] as const;
const STATUS_LABELS: Record<string, string> = {
  all: 'Todos', proposal: 'Proposta', in_progress: 'Em andamento',
  review: 'Revisão', completed: 'Concluído', cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  proposal: 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  in_progress: 'bg-[#0066FF]/15 text-[#4C82FF]',
  review: 'bg-[#BF5AF2]/15 text-[#BF5AF2]',
  completed: 'bg-[#32D74B]/15 text-[#32D74B]',
  cancelled: 'bg-[#8E8E93]/15 text-[#8E8E93]',
};
const TYPES = ['design', 'filming', 'web', 'photo', 'construction', 'other'];
const TYPE_LABELS: Record<string, string> = {
  design: 'Design', filming: 'Filmagem', web: 'Web', photo: 'Foto',
  construction: 'Construção', other: 'Outro',
};
const TYPE_ICONS: Record<string, string> = {
  design: '🎨', filming: '🎬', web: '💻', photo: '📷', construction: '🏗️', other: '📁',
};

const STAGE_COLORS = { pendente: '#8E8E93', em_andamento: '#0066FF', concluido: '#32D74B' };
const STAGE_LABELS = { pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído' };

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function tk() { return localStorage.getItem('melo_token') || ''; }

const EMPTY_SVC = {
  name: '', client: '', clientPhone: '', clientEmail: '', address: '',
  type: 'construction', status: 'proposal',
  value: '', startDate: new Date().toISOString().split('T')[0], deadline: '', notes: '',
};

/* ── Detail view ── */
function ServiceDetail({
  service, onBack, onUpdate, isDark, c,
}: {
  service: Service;
  onBack: () => void;
  onUpdate: (s: Service) => void;
  isDark: boolean;
  c: ReturnType<typeof import('@/lib/melo/theme').useTheme>['c'];
}) {
  const [stages, setStages]       = useState<ServiceStage[]>(service.stages || []);
  const [comments, setComments]   = useState<ServiceComment[]>(service.comments || []);
  const [newStage, setNewStage]   = useState({ name: '', description: '' });
  const [newComment, setNewComment] = useState('');
  const [commentPublic, setCommentPublic] = useState(false);
  const [stageModal, setStageModal] = useState(false);
  const [savingStage, setSavingStage]   = useState(false);
  const [savingCmt, setSavingCmt]       = useState(false);
  const [copied, setCopied]             = useState(false);

  const clientLink = typeof window !== 'undefined'
    ? `${window.location.origin}/melo/cliente/${service.clientToken}`
    : '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(clientLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(clientLink);
    }
  }

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    if (!newStage.name) return;
    setSavingStage(true);
    const res = await fetch('/api/melo/services/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ serviceId: service.id, name: newStage.name, description: newStage.description }),
    });
    const stage = await res.json();
    const updated = [...stages, stage];
    setStages(updated);
    onUpdate({ ...service, stages: updated });
    setNewStage({ name: '', description: '' });
    setStageModal(false);
    setSavingStage(false);
  }

  async function updateStageStatus(stageId: string, status: ServiceStage['status']) {
    await fetch('/api/melo/services/stages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ serviceId: service.id, stageId, status }),
    });
    const updated = stages.map(s => s.id === stageId ? { ...s, status } : s);
    setStages(updated);
    onUpdate({ ...service, stages: updated });
  }

  async function deleteStage(stageId: string) {
    if (!confirm('Remover esta etapa?')) return;
    await fetch(`/api/melo/services/stages?serviceId=${service.id}&stageId=${stageId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` },
    });
    const updated = stages.filter(s => s.id !== stageId);
    setStages(updated);
    onUpdate({ ...service, stages: updated });
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSavingCmt(true);
    const res = await fetch('/api/melo/services/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ serviceId: service.id, text: newComment.trim(), isPublic: commentPublic }),
    });
    const comment = await res.json();
    const updated = [...comments, comment];
    setComments(updated);
    onUpdate({ ...service, comments: updated });
    setNewComment('');
    setSavingCmt(false);
  }

  async function toggleCommentPublic(commentId: string, isPublic: boolean) {
    await fetch('/api/melo/services/comments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ serviceId: service.id, commentId, isPublic }),
    });
    const updated = comments.map(c => c.id === commentId ? { ...c, isPublic } : c);
    setComments(updated);
    onUpdate({ ...service, comments: updated });
  }

  async function deleteComment(commentId: string) {
    if (!confirm('Remover comentário?')) return;
    await fetch(`/api/melo/services/comments?serviceId=${service.id}&commentId=${commentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` },
    });
    const updated = comments.filter(c => c.id !== commentId);
    setComments(updated);
    onUpdate({ ...service, comments: updated });
  }

  const completedCount = stages.filter(s => s.status === 'concluido').length;
  const progressPct = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Back + share */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[13px] font-medium active:opacity-60 transition-opacity"
          style={{ color: c.muted }}>
          <ArrowLeft size={15} /> Voltar
        </button>
        <button onClick={copyLink}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white active:scale-95 transition-all"
          style={{ background: copied ? 'linear-gradient(135deg,#32D74B,#28A745)' : 'linear-gradient(135deg,#1D6EF7,#1249C2)',
                   boxShadow: '0 2px 10px rgba(29,110,247,0.3)' }}>
          <ShareNetwork size={15} weight="fill" />
          {copied ? 'Link copiado!' : 'Link do Cliente'}
        </button>
      </div>

      {/* Service header */}
      <div className="rounded-2xl p-5" style={{ background: c.card, border: `1px solid ${c.border}` }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{TYPE_ICONS[service.type] || '📁'}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[17px] leading-tight" style={{ color: c.t1 }}>{service.name}</h2>
            <p className="text-[13px] mt-0.5" style={{ color: c.muted }}>{service.client}</p>
            {service.clientPhone && <p className="text-[12px]" style={{ color: c.muted }}>{service.clientPhone}</p>}
            {service.address && <p className="text-[12px]" style={{ color: c.muted }}>{service.address}</p>}
          </div>
          <div>
            <p className="font-bold text-[16px]" style={{ color: c.t1 }}>{fmt(service.value)}</p>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[service.status] || ''}`}>
              {STATUS_LABELS[service.status]}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        {stages.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold" style={{ color: c.muted }}>Progresso geral</span>
              <span className="text-[12px] font-bold" style={{ color: '#1D6EF7' }}>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: c.border }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#1D6EF7,#32D74B)' }} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: c.muted }}>{completedCount} de {stages.length} etapas concluídas</p>
          </div>
        )}
      </div>

      {/* ── Stages ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[14px]" style={{ color: c.t1 }}>Etapas do Serviço</h3>
          <button onClick={() => setStageModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)' }}>
            <Plus size={13} /> Etapa
          </button>
        </div>

        {stages.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <p className="text-[13px]" style={{ color: c.muted }}>Nenhuma etapa criada ainda</p>
            <button onClick={() => setStageModal(true)} className="mt-2 text-[#1D6EF7] text-[12px]">+ Adicionar primeira etapa</button>
          </div>
        ) : (
          <div className="space-y-2">
            {stages.map((stage, idx) => {
              const color = STAGE_COLORS[stage.status];
              return (
                <div key={stage.id} className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => {
                      const next: ServiceStage['status'] = stage.status === 'pendente' ? 'em_andamento' : stage.status === 'em_andamento' ? 'concluido' : 'pendente';
                      updateStageStatus(stage.id, next);
                    }} className="mt-0.5 flex-shrink-0 active:scale-90 transition-transform">
                      {stage.status === 'concluido'
                        ? <CheckCircle size={22} weight="fill" style={{ color: '#32D74B' }} />
                        : stage.status === 'em_andamento'
                          ? <Circle size={22} weight="bold" style={{ color: '#0066FF' }} />
                          : <Circle size={22} style={{ color: c.muted }} />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold" style={{ color: c.muted }}>Etapa {idx + 1}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: color + '22', color }}>
                          {STAGE_LABELS[stage.status]}
                        </span>
                      </div>
                      <p className="font-semibold text-[14px] mt-0.5" style={{ color: stage.status === 'concluido' ? c.muted : c.t1,
                        textDecoration: stage.status === 'concluido' ? 'line-through' : 'none' }}>
                        {stage.name}
                      </p>
                      {stage.description && <p className="text-[12px] mt-1" style={{ color: c.muted }}>{stage.description}</p>}
                      {stage.completedAt && (
                        <p className="text-[10px] mt-1" style={{ color: '#32D74B' }}>
                          Concluído em {new Date(stage.completedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteStage(stage.id)} className="flex-shrink-0 active:opacity-60 transition-opacity" style={{ color: c.muted }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Comments ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ChatCircle size={16} style={{ color: c.muted }} />
          <h3 className="font-semibold text-[14px]" style={{ color: c.t1 }}>Comentários</h3>
          <span className="text-[11px] ml-auto" style={{ color: c.muted }}>
            {comments.filter(c => c.isPublic).length} público{comments.filter(c => c.isPublic).length !== 1 ? 's' : ''}
          </span>
        </div>

        {comments.length > 0 && (
          <div className="space-y-2 mb-3">
            {comments.map(comment => (
              <div key={comment.id} className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-[13px] leading-relaxed" style={{ color: c.t1 }}>{comment.text}</p>
                    <p className="text-[10px] mt-1.5" style={{ color: c.muted }}>
                      {new Date(comment.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleCommentPublic(comment.id, !comment.isPublic)}
                      title={comment.isPublic ? 'Visível ao cliente — clique para ocultar' : 'Oculto do cliente — clique para tornar público'}
                      className="active:scale-90 transition-transform">
                      {comment.isPublic
                        ? <Eye size={16} style={{ color: '#32D74B' }} />
                        : <EyeSlash size={16} style={{ color: c.muted }} />
                      }
                    </button>
                    <button onClick={() => deleteComment(comment.id)} className="active:opacity-60 transition-opacity" style={{ color: c.muted }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {comment.isPublic && (
                  <div className="flex items-center gap-1 mt-2">
                    <Eye size={10} style={{ color: '#32D74B' }} />
                    <span className="text-[10px]" style={{ color: '#32D74B' }}>Visível ao cliente</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        <div className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
          <form onSubmit={addComment}>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Adicionar comentário sobre o serviço..."
              rows={2}
              className="w-full resize-none text-[13px] bg-transparent outline-none leading-relaxed"
              style={{ color: c.t1, boxSizing: 'border-box' }}
            />
            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${c.border}` }}>
              <button type="button" onClick={() => setCommentPublic(p => !p)}
                className="flex items-center gap-1.5 text-[11px] font-medium active:opacity-70 transition-opacity"
                style={{ color: commentPublic ? '#32D74B' : c.muted }}>
                {commentPublic ? <Eye size={14} /> : <EyeSlash size={14} />}
                {commentPublic ? 'Visível ao cliente' : 'Apenas interno'}
              </button>
              <button type="submit" disabled={!newComment.trim() || savingCmt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white disabled:opacity-40 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)' }}>
                <PaperPlaneTilt size={13} weight="fill" />
                Comentar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Stage modal */}
      {stageModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-t-3xl" style={{ background: isDark?'#141412':'#FEFEFE', border: `1px solid ${c.border}` }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${c.border}` }}>
              <h3 className="font-semibold" style={{ color: c.t1 }}>Nova Etapa</h3>
              <button onClick={() => setStageModal(false)}><X size={20} style={{ color: c.muted }} /></button>
            </div>
            <form onSubmit={addStage} style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14,
              paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom))' }}>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>Nome da Etapa *</label>
                <input autoFocus type="text" required value={newStage.name}
                  onChange={e => setNewStage(n => ({ ...n, name: e.target.value }))}
                  placeholder="Ex: Demolição, Alvenaria, Pintura..."
                  className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[#1D6EF7]"
                  style={{ background: c.ib, border: `1px solid ${c.ibr}`, color: c.it }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>Descrição</label>
                <textarea rows={2} value={newStage.description}
                  onChange={e => setNewStage(n => ({ ...n, description: e.target.value }))}
                  placeholder="Detalhes desta etapa..."
                  className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none resize-none focus:ring-2 focus:ring-[#1D6EF7]"
                  style={{ background: c.ib, border: `1px solid ${c.ibr}`, color: c.it }} />
              </div>
              <button type="submit" disabled={savingStage}
                className="w-full text-white py-3 rounded-xl font-semibold disabled:opacity-40 active:scale-98 transition-all"
                style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 12px rgba(29,110,247,0.3)' }}>
                {savingStage ? 'Salvando...' : 'Criar Etapa'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function ServicesPage() {
  const { isDark, c } = useTheme();
  const [filter, setFilter]     = useState('all');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState(EMPTY_SVC);
  const [saving, setSaving]     = useState(false);
  const [detail, setDetail]     = useState<Service | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const url = filter === 'all' ? '/api/melo/services' : `/api/melo/services?status=${filter}`;
    fetch(url, { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(d => { setServices(Array.isArray(d) ? d : []); setLoading(false); });
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Keep detail in sync after updates
  useEffect(() => {
    if (detail) {
      const fresh = services.find(s => s.id === detail.id);
      if (fresh) setDetail(fresh);
    }
  }, [services]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(s: Service) {
    setEditId(s.id);
    setForm({
      name: s.name, client: s.client, clientPhone: s.clientPhone || '',
      clientEmail: s.clientEmail || '', address: s.address || '',
      type: s.type, status: s.status, value: String(s.value),
      startDate: s.startDate, deadline: s.deadline, notes: s.notes,
    });
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    const body = { ...form, value: parseFloat(form.value) || 0 };
    if (editId) {
      await fetch('/api/melo/services', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ id: editId, ...body }),
      });
    } else {
      await fetch('/api/melo/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify(body),
      });
    }
    setSaving(false); setModal(false); setEditId(null); setForm(EMPTY_SVC); load();
  }

  async function del(id: string) {
    if (!confirm('Remover este serviço?')) return;
    await fetch(`/api/melo/services?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` } });
    if (detail?.id === id) setDetail(null);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/melo/services', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  function handleServiceUpdate(updated: Service) {
    setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
    setDetail(updated);
  }

  const totalValue = services.reduce((s, srv) => s + srv.value, 0);
  const inputCls = `w-full px-4 py-2.5 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1D6EF7] transition-all`;

  if (detail) {
    return (
      <AppShell>
        <ServiceDetail
          service={detail}
          onBack={() => setDetail(null)}
          onUpdate={handleServiceUpdate}
          isDark={isDark}
          c={c}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: c.muted }}>{services.length} serviço{services.length !== 1 ? 's' : ''}</p>
            <p className="font-bold" style={{ color: c.t1 }}>{fmt(totalValue)}</p>
          </div>
          <button onClick={() => { setEditId(null); setForm(EMPTY_SVC); setModal(true); }}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #0066FF, #003ECC)', boxShadow: '0 2px 12px rgba(0,102,255,0.4)' }}>
            <Plus size={15} /> Serviço
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === s
                ? 'text-white shadow-[0_2px_8px_rgba(0,102,255,0.4)]'
                : ''}`}
              style={filter === s
                ? { background: 'linear-gradient(135deg, #0066FF, #003ECC)' }
                : { background: c.card, color: c.muted, border: `1px solid ${c.border}` }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: c.card }} />)}
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <Briefcase size={28} className="mx-auto mb-2 opacity-40" style={{ color: c.muted }} />
            <p className="text-sm" style={{ color: c.muted }}>Nenhum serviço encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(s => {
              const completedStages = (s.stages || []).filter(st => st.status === 'concluido').length;
              const totalStages     = (s.stages || []).length;
              const pct             = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : s.progress;

              return (
                <div key={s.id} className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <button onClick={() => setDetail(s)} className="flex items-start gap-2 min-w-0 text-left flex-1">
                      <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[s.type] || '📁'}</span>
                      <div>
                        <p className="font-semibold text-[14px] hover:text-[#4C82FF] transition-colors" style={{ color: c.t1 }}>{s.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: c.muted }}>{s.client} · {TYPE_LABELS[s.type]}</p>
                      </div>
                    </button>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <p className="font-bold text-sm" style={{ color: c.t1 }}>{fmt(s.value)}</p>
                      <div className="flex gap-1">
                        <button onClick={() => setDetail(s)} title="Ver detalhes"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'rgba(29,110,247,0.12)', color: '#4C82FF' }}>
                          <DotsThreeVertical size={15} weight="bold" />
                        </button>
                        <button onClick={() => del(s.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                          style={{ background: 'rgba(229,72,77,0.1)', color: '#E5484D' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  {totalStages > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: c.muted }}>{completedStages}/{totalStages} etapas</span>
                        <span className="text-[10px] font-semibold" style={{ color: '#1D6EF7' }}>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.border }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1D6EF7,#32D74B)' }} />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${c.border}` }}>
                    <div className="text-xs" style={{ color: c.muted }}>
                      {s.deadline && `Prazo: ${new Date(s.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                        style={{ background: c.border, color: c.muted }}>
                        Editar
                      </button>
                      <div className="relative">
                        <select value={s.status} onChange={e => updateStatus(s.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded-full font-semibold border-0 outline-none cursor-pointer appearance-none pr-5"
                          style={{ background: 'transparent', color: STATUS_COLORS[s.status]?.match(/text-\[(.+?)\]/)?.[1] || c.muted }}>
                          {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'all').map(([val, lbl]) => (
                            <option key={val} value={val}>{lbl}</option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onTouchMove={e => e.stopPropagation()}>
          <div className="w-full sm:max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl"
            style={{ background: isDark ? '#141412' : '#FEFEFE', border: `1px solid ${c.border}`,
                     maxHeight: 'calc(88dvh - env(safe-area-inset-bottom))', overflow: 'hidden' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${c.border}` }}>
              <h3 className="font-semibold" style={{ color: c.t1 }}>{editId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button onClick={() => { setModal(false); setEditId(null); setForm(EMPTY_SVC); }}>
                <X size={20} style={{ color: c.muted }} />
              </button>
            </div>
            <div style={{ overflowY:'auto', overflowX:'hidden', overscrollBehavior:'contain',
              WebkitOverflowScrolling:'touch', touchAction:'pan-y', flex:1, width:'100%', boxSizing:'border-box' } as React.CSSProperties}>
              <form onSubmit={save} style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14,
                width:'100%', boxSizing:'border-box' }}>
                {[
                  { key:'name', label:'Nome do Serviço *', placeholder:'Ex: Reforma da cozinha', required: true },
                  { key:'client', label:'Cliente', placeholder:'Nome do cliente' },
                  { key:'clientPhone', label:'Telefone do Cliente', placeholder:'(00) 00000-0000' },
                  { key:'address', label:'Endereço', placeholder:'Rua, número, bairro...' },
                  { key:'value', label:'Valor (R$)', placeholder:'0,00', type:'number' },
                ].map(({ key, label, placeholder, required, type }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>{label}</label>
                    <input type={type || 'text'} required={!!required} placeholder={placeholder}
                      value={(form as Record<string, string>)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className={inputCls} step={type === 'number' ? '0.01' : undefined}
                      style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }} />
                  </div>
                ))}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>Tipo</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }}>
                      {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }}>
                      {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'all').map(([vs, l]) => <option key={vs} value={vs}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['startDate','Início'],['deadline','Prazo']].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>{label}</label>
                      <input type="date" value={(form as Record<string, string>)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }} />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>Observações</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Detalhes adicionais..."
                    className={`${inputCls} resize-none`} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }} />
                </div>

                <div style={{ paddingTop:8, paddingBottom:'calc(5rem + env(safe-area-inset-bottom))' }}>
                  <button type="submit" disabled={saving}
                    className="w-full text-white py-3.5 rounded-xl font-semibold disabled:opacity-40 active:scale-98 transition-all"
                    style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 12px rgba(29,110,247,0.35)' }}>
                    {saving ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Criar Serviço'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
