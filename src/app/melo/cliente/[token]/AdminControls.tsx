'use client';

import { useState, useEffect } from 'react';
import type { ServiceStage } from '@/lib/melo/types';

interface Props {
  serviceId: string;
  initialStages: ServiceStage[];
}

const STAGE_CYCLE: Record<string, ServiceStage['status']> = {
  pendente:      'em_andamento',
  em_andamento:  'concluido',
  concluido:     'pendente',
};

const STAGE_LABELS: Record<string, string> = {
  pendente:     'Pendente',
  em_andamento: 'Em andamento',
  concluido:    'Concluído',
};

const STAGE_COLORS: Record<string, string> = {
  pendente:     '#8E8E93',
  em_andamento: '#0066FF',
  concluido:    '#32D74B',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
  color: '#F0F0EC', fontSize: 13, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};

export default function AdminControls({ serviceId, initialStages }: Props) {
  const [mode,        setMode]        = useState<'hidden'|'login'|'panel'>('hidden');
  const [pin,         setPin]         = useState('');
  const [adminToken,  setAdminToken]  = useState('');
  const [loginError,  setLoginError]  = useState('');
  const [loginLoading,setLoginLoading]= useState(false);
  const [stages,      setStages]      = useState<ServiceStage[]>(initialStages);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);

  const [addingStage,  setAddingStage]  = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageDesc, setNewStageDesc] = useState('');
  const [savingStage,  setSavingStage]  = useState(false);

  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editName,   setEditName]   = useState('');
  const [editDesc,   setEditDesc]   = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [newComment,    setNewComment]    = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [savingComment, setSavingComment] = useState(false);

  // Tenta usar o token já salvo no localStorage (caso o usuário já esteja logado)
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('melo_token') : null;
    if (saved) {
      fetch('/api/melo/verify', { headers: { Authorization: `Bearer ${saved}` } })
        .then(r => { if (r.ok) { setAdminToken(saved); setMode('panel'); } })
        .catch(() => {});
    }
  }, []);

  function tk() { return adminToken; }

  /* ── Login via PIN ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    const res = await fetch('/api/melo/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoginError('PIN incorreto');
      setPin('');
      setLoginLoading(false);
      return;
    }
    setAdminToken(data.token);
    setMode('panel');
    setPin('');
    setLoginLoading(false);
  }

  /* ── Avançar status ── */
  async function toggleStatus(stage: ServiceStage) {
    const next = STAGE_CYCLE[stage.status] || 'pendente';
    setUpdatingId(stage.id);
    await fetch('/api/melo/services/stages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ serviceId, stageId: stage.id, status: next }),
    });
    setStages(prev => prev.map(s =>
      s.id === stage.id ? { ...s, status: next, completedAt: next === 'concluido' ? new Date().toISOString() : s.completedAt } : s
    ));
    setUpdatingId(null);
  }

  /* ── Editar nome/descrição ── */
  function startEdit(stage: ServiceStage) {
    setEditingId(stage.id); setEditName(stage.name); setEditDesc(stage.description || '');
    setAddingStage(false);
  }

  async function saveEdit(e: React.FormEvent, stageId: string) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingEdit(true);
    await fetch('/api/melo/services/stages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ serviceId, stageId, name: editName.trim(), description: editDesc.trim() }),
    });
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, name: editName.trim(), description: editDesc.trim() } : s));
    setEditingId(null); setSavingEdit(false);
  }

  /* ── Excluir ── */
  async function deleteStage(stageId: string) {
    if (!confirm('Remover esta etapa?')) return;
    await fetch(`/api/melo/services/stages?serviceId=${serviceId}&stageId=${stageId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` },
    });
    setStages(prev => prev.filter(s => s.id !== stageId));
    if (editingId === stageId) setEditingId(null);
  }

  /* ── Nova etapa ── */
  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    if (!newStageName.trim()) return;
    setSavingStage(true);
    const res = await fetch('/api/melo/services/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ serviceId, name: newStageName.trim(), description: newStageDesc.trim() }),
    });
    const stage = await res.json();
    setStages(prev => [...prev, stage]);
    setNewStageName(''); setNewStageDesc(''); setAddingStage(false); setSavingStage(false);
  }

  /* ── Comentário ── */
  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSavingComment(true);
    await fetch('/api/melo/services/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ serviceId, text: newComment.trim(), isPublic: true }),
    });
    setNewComment(''); setAddingComment(false); setSavingComment(false);
    window.location.reload();
  }

  // ── RENDER ──

  if (mode === 'hidden') {
    return (
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button onClick={() => setMode('login')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'inherit',
          textDecoration: 'underline', touchAction: 'manipulation',
        }}>
          Acesso do responsável
        </button>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18, padding: '20px 16px',
        }}>
          <p style={{ color: '#F0F0EC', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            Acesso do Responsável
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>
            Digite seu PIN para editar as etapas
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              autoFocus type="password" inputMode="numeric" pattern="[0-9]*"
              value={pin} onChange={e => setPin(e.target.value)}
              placeholder="••••" maxLength={8} required
              style={{
                ...inputStyle,
                textAlign: 'center', fontSize: 22,
                letterSpacing: '0.4em', fontVariantNumeric: 'tabular-nums',
              }}
            />
            {loginError && (
              <p style={{ color: '#EF4444', fontSize: 12, textAlign: 'center', margin: 0 }}>
                {loginError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setMode('hidden'); setPin(''); setLoginError(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit',
                  touchAction: 'manipulation' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loginLoading || !pin.trim()}
                style={{ flex: 2, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', border: 'none',
                  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                  opacity: loginLoading || !pin.trim() ? 0.5 : 1,
                  touchAction: 'manipulation' }}>
                {loginLoading ? 'Verificando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // mode === 'panel'
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <button onClick={() => setMode(m => m === 'panel' ? 'hidden' : 'panel')} style={{
        width: '100%', padding: '12px 16px', borderRadius: 14,
        background: 'rgba(29,110,247,0.15)', border: '1px solid rgba(29,110,247,0.4)',
        color: '#60A5FA', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, touchAction: 'manipulation',
      }}>
        ⚙ Painel de edição — {stages.length} etapa{stages.length !== 1 ? 's' : ''}
      </button>

      <div style={{
        marginTop: 10, background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(29,110,247,0.1)' }}>
          <p style={{ color: '#60A5FA', fontSize: 12, fontWeight: 700, margin: 0 }}>
            Painel Admin — visível apenas para você
          </p>
        </div>

        {/* Lista etapas */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
            Etapas ({stages.length})
          </p>

          {stages.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Nenhuma etapa ainda</p>
          )}

          {stages.map((stage, idx) => {
            const color     = STAGE_COLORS[stage.status];
            const isEditing = editingId === stage.id;
            return (
              <div key={stage.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${isEditing ? 'rgba(29,110,247,0.4)' : color + '33'}`,
                borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: color + '22', border: `1.5px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, color }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#F0F0EC', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {stage.name}
                    </p>
                    <p style={{ fontSize: 10, color, margin: 0 }}>{STAGE_LABELS[stage.status]}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => isEditing ? setEditingId(null) : startEdit(stage)}
                      style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                        background: isEditing ? 'rgba(29,110,247,0.25)' : 'rgba(255,255,255,0.08)',
                        border: isEditing ? '1px solid rgba(29,110,247,0.5)' : '1px solid rgba(255,255,255,0.15)',
                        color: isEditing ? '#60A5FA' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation' }}>
                      ✎
                    </button>
                    <button onClick={() => toggleStatus(stage)} disabled={updatingId === stage.id}
                      style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                        background: color + '22', border: `1px solid ${color}55`,
                        color, cursor: 'pointer', fontFamily: 'inherit',
                        opacity: updatingId === stage.id ? 0.5 : 1, touchAction: 'manipulation' }}>
                      {updatingId === stage.id ? '…' :
                        stage.status === 'pendente' ? '▶' : stage.status === 'em_andamento' ? '✓' : '↺'}
                    </button>
                    <button onClick={() => deleteStage(stage.id)}
                      style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#EF4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        touchAction: 'manipulation' }}>✕</button>
                  </div>
                </div>
                {isEditing && (
                  <form onSubmit={e => saveEdit(e, stage.id)} style={{
                    padding: '10px 12px', borderTop: '1px solid rgba(29,110,247,0.2)',
                    background: 'rgba(29,110,247,0.06)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA',
                      textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                      Editar etapa {idx + 1}
                    </p>
                    <input autoFocus required value={editName} onChange={e => setEditName(e.target.value)}
                      placeholder="Nome da etapa" style={{ ...inputStyle, border: '1px solid rgba(29,110,247,0.4)' }} />
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      placeholder="Descrição (opcional)" style={inputStyle} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setEditingId(null)}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit',
                          touchAction: 'manipulation' }}>Cancelar</button>
                      <button type="submit" disabled={savingEdit || !editName.trim()}
                        style={{ flex: 2, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', border: 'none',
                          color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                          opacity: savingEdit || !editName.trim() ? 0.5 : 1,
                          touchAction: 'manipulation' }}>
                        {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}

          {/* Nova etapa */}
          {!addingStage ? (
            <button onClick={() => { setAddingStage(true); setEditingId(null); }}
              style={{ width: '100%', padding: '9px', borderRadius: 11, marginTop: 2,
                background: 'rgba(29,110,247,0.1)', border: '1px dashed rgba(29,110,247,0.4)',
                color: '#60A5FA', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', touchAction: 'manipulation' }}>
              + Nova Etapa
            </button>
          ) : (
            <form onSubmit={addStage} style={{
              background: 'rgba(29,110,247,0.08)', border: '1px solid rgba(29,110,247,0.25)',
              borderRadius: 12, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2,
            }}>
              <input autoFocus required value={newStageName} onChange={e => setNewStageName(e.target.value)}
                placeholder="Nome da etapa" style={inputStyle} />
              <input value={newStageDesc} onChange={e => setNewStageDesc(e.target.value)}
                placeholder="Descrição (opcional)" style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setAddingStage(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit',
                    touchAction: 'manipulation' }}>Cancelar</button>
                <button type="submit" disabled={savingStage || !newStageName.trim()}
                  style={{ flex: 2, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', border: 'none',
                    color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                    opacity: savingStage || !newStageName.trim() ? 0.5 : 1,
                    touchAction: 'manipulation' }}>
                  {savingStage ? 'Criando...' : 'Criar Etapa'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Comentário público */}
        <div style={{ padding: '10px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Adicionar Atualização (pública)
          </p>
          {!addingComment ? (
            <button onClick={() => setAddingComment(true)}
              style={{ width: '100%', padding: '9px', borderRadius: 11,
                background: 'rgba(50,215,75,0.08)', border: '1px dashed rgba(50,215,75,0.35)',
                color: '#32D74B', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', touchAction: 'manipulation' }}>
              + Adicionar atualização visível ao cliente
            </button>
          ) : (
            <form onSubmit={addComment} style={{
              background: 'rgba(50,215,75,0.06)', border: '1px solid rgba(50,215,75,0.2)',
              borderRadius: 12, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <textarea autoFocus required rows={3} value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Ex: Demolição concluída. Iniciando alvenaria..."
                style={{ ...inputStyle, resize: 'none' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setAddingComment(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit',
                    touchAction: 'manipulation' }}>Cancelar</button>
                <button type="submit" disabled={savingComment || !newComment.trim()}
                  style={{ flex: 2, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: 'linear-gradient(135deg,#16A34A,#15803D)', border: 'none',
                    color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                    opacity: savingComment || !newComment.trim() ? 0.5 : 1,
                    touchAction: 'manipulation' }}>
                  {savingComment ? 'Enviando...' : 'Publicar atualização'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
