'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/melo/AppShell';
import {
  MagnifyingGlass, Plus, FileDoc, FileText,
  CloudArrowUp, ArrowClockwise,
  Eye, Download,
} from '@phosphor-icons/react';
import { Trash2 } from 'lucide-react';
import { useTheme } from '@/lib/melo/theme';
import type { MeloDocument, DocumentContent, DocumentItem } from '@/lib/melo/types';

function tk() { return localStorage.getItem('melo_token') || ''; }
function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

/* ── OneDrive OAuth config ── */
const OD_SCOPES = 'openid profile Files.ReadWrite offline_access';

function buildODAuthUrl(clientId: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: OD_SCOPES,
    response_mode: 'fragment',
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

/* ── Document chat parser ── */
function parseDocumentChat(text: string): Partial<DocumentContent> {
  const find  = (keys: string[]) => {
    for (const key of keys) {
      const re = new RegExp(`${key}\\s*:?\\s*([^,\n]+)`, 'i');
      const m  = text.match(re);
      if (m) return m[1].trim();
    }
    return '';
  };

  const valueStr = find(['valor total', 'valor', 'total', 'preco', 'preço', 'custo']);
  const totalValue = parseFloat(valueStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

  const itemsRaw = find(['itens', 'items', 'servicos', 'serviços', 'materiais']);
  const items: DocumentItem[] = itemsRaw
    ? itemsRaw.split(/[;|]/).map(item => {
        const parts = item.trim().split(/\s+/);
        const descParts: string[] = [];
        let val = 0, qty = 1;
        for (const p of parts) {
          const n = parseFloat(p.replace(/[Rr$\s.,]/g, '').replace(',', '.'));
          if (!isNaN(n) && n > 0 && val === 0) { val = n; }
          else if (!isNaN(n) && n > 0 && qty === 1 && n < 1000) { qty = n; }
          else { descParts.push(p); }
        }
        return { description: descParts.join(' ') || item.trim(), quantity: qty, unitValue: val, total: val * qty };
      }).filter(i => i.description)
    : [];

  return {
    clientName:    find(['cliente', 'client', 'nome do cliente']),
    clientAddress: find(['endereço', 'endereco', 'rua', 'logradouro', 'local', 'obra']),
    clientPhone:   find(['telefone', 'tel', 'fone', 'celular', 'whatsapp', 'contato']),
    serviceName:   find(['serviço', 'servico', 'obra', 'trabalho', 'tipo']),
    description:   find(['descrição', 'descricao', 'detalhes', 'escopo']),
    deadline:      find(['prazo', 'duração', 'duracao', 'tempo']),
    paymentTerms:  find(['pagamento', 'condicoes', 'condições', 'forma de pagamento']),
    validity:      find(['validade', 'válido', 'valido']) || '15 dias',
    notes:         find(['obs', 'observações', 'observacoes', 'notas']),
    totalValue,
    items,
  };
}

type DocTab = 'list' | 'chat' | 'orcamento' | 'onedrive';

/* ── Parser específico para o orçamento Alfa Glass ── */
interface AlfaGlassItem { qtde: string; descricao: string; alt: string; larg: string; m2: string; valorUnit: string; subtotal: string; }
interface AlfaGlassData {
  os: string; data: string; clienteNome: string; clienteCpfCnpj: string; clienteIE: string;
  clienteEndereco: string; clienteBairro: string; clienteCep: string;
  itens: AlfaGlassItem[]; formasPagamento: string; total: string; observacoes: string;
}
function parseAlfaGlass(text: string): AlfaGlassData {
  const field = (keys: string[]) => {
    for (const k of keys) {
      const m = text.match(new RegExp(`${k}\\s*:?\\s*([^\\n]+)`, 'i'));
      if (m) return m[1].trim();
    }
    return '';
  };
  // Parse itens — formato: qtde | descrição | alt | larg | m2 | valorUnit | subtotal
  const itensBlock = text.match(/itens?\s*:?\s*\n?([\s\S]*?)(?:\n(?:total|pagamento|obs|forma|$))/i);
  const itens: AlfaGlassItem[] = [];
  if (itensBlock) {
    const lines = itensBlock[1].split('\n').filter(l => l.trim());
    for (const line of lines) {
      const parts = line.split(/[|,;]/).map(p => p.trim());
      if (parts.length >= 2) {
        itens.push({
          qtde: parts[0] || '', descricao: parts[1] || '',
          alt: parts[2] || '', larg: parts[3] || '', m2: parts[4] || '',
          valorUnit: parts[5] || '', subtotal: parts[6] || '',
        });
      }
    }
  }
  return {
    os:             field(['os', 'ordem de serviço', 'numero', 'número']),
    data:           field(['data']),
    clienteNome:    field(['cliente', 'nome', 'razão social', 'razao social']),
    clienteCpfCnpj: field(['cpf', 'cnpj', 'cpf/cnpj', 'documento']),
    clienteIE:      field(['ie', 'inscrição estadual', 'inscricao estadual']),
    clienteEndereco:field(['endereço', 'endereco', 'rua', 'logradouro']),
    clienteBairro:  field(['bairro']),
    clienteCep:     field(['cep']),
    formasPagamento:field(['pagamento', 'forma de pagamento', 'formas de pagamento']),
    total:          field(['total', 'valor total', 'valor']),
    observacoes:    field(['obs', 'observações', 'observacoes']),
    itens,
  };
}

interface ODFile {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  file?: { mimeType: string };
}

export default function DocumentsPage() {
  const { c, isDark } = useTheme();
  const [tab, setTab]             = useState<DocTab>('list');
  const [query, setQuery]         = useState('');
  const [docs, setDocs]           = useState<MeloDocument[]>([]);
  const [loading, setLoading]     = useState(true);
  const [odFiles, setODFiles]     = useState<ODFile[]>([]);
  const [odLoading, setODLoading] = useState(false);
  const [odToken, setODToken]     = useState('');
  const [odClientId, setODClientId] = useState('');
  const [showODSetup, setShowODSetup] = useState(false);

  /* Chat state */
  const [chatInput, setChatInput]     = useState('');
  const [chatStep, setChatStep]       = useState<'input' | 'preview' | 'confirm'>('input');
  const [parsedDoc, setParsedDoc]     = useState<Partial<DocumentContent> | null>(null);
  const [docName, setDocName]         = useState('');
  const [saving, setSaving]           = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [uploadingOD, setUploadingOD] = useState(false);

  /* Alfa Glass orçamento state */
  const [alfaInput,   setAlfaInput]   = useState('');
  const [alfaParsed,  setAlfaParsed]  = useState<AlfaGlassData | null>(null);
  const [alfaStep,    setAlfaStep]    = useState<'input'|'preview'>('input');
  const [alfaHtml,    setAlfaHtml]    = useState('');
  const [alfaLoading, setAlfaLoading] = useState(false);
  const [alfaSaving,  setAlfaSaving]  = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('od_client_id') || '';
    const token = localStorage.getItem('od_token') || '';
    setODClientId(saved);
    setODToken(token);

    // Handle OAuth redirect (token in URL hash)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      const hash = new URLSearchParams(window.location.hash.replace('#', '?'));
      const t = hash.get('access_token');
      if (t) {
        localStorage.setItem('od_token', t);
        setODToken(t);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const loadDocs = useCallback(() => {
    setLoading(true);
    const q = query ? `&q=${encodeURIComponent(query)}` : '';
    fetch(`/api/melo/documents?${q}`, { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(d => { setDocs(Array.isArray(d) ? d : []); setLoading(false); });
  }, [query]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function loadODFiles() {
    if (!odToken) return;
    setODLoading(true);
    const res = await fetch('/api/melo/onedrive?action=list&folder=Melo%20Documentos', {
      headers: { Authorization: `Bearer ${tk()}`, 'X-OneDrive-Token': odToken },
    });
    if (res.ok) {
      const files = await res.json();
      setODFiles(Array.isArray(files) ? files : []);
    }
    setODLoading(false);
  }

  useEffect(() => { if (tab === 'onedrive' && odToken) loadODFiles(); }, [tab, odToken]); // eslint-disable-line react-hooks/exhaustive-deps

  function connectOneDrive() {
    if (!odClientId) { setShowODSetup(true); return; }
    const redirectUri = `${window.location.origin}/melo/documents`;
    window.location.href = buildODAuthUrl(odClientId, redirectUri);
  }

  function saveClientId() {
    localStorage.setItem('od_client_id', odClientId);
    setShowODSetup(false);
    connectOneDrive();
  }

  async function processChat() {
    if (!chatInput.trim()) return;
    const parsed = parseDocumentChat(chatInput);
    setParsedDoc(parsed);
    setDocName(`Orçamento — ${parsed.clientName || 'Cliente'} — ${new Date().toLocaleDateString('pt-BR')}`);
    setChatStep('preview');
  }

  async function generateAndPreview() {
    if (!parsedDoc) return;
    setGenerating(true);
    const content: DocumentContent = {
      number:       `ORC-${Date.now().toString().slice(-6)}`,
      clientName:   parsedDoc.clientName    || '',
      clientAddress:parsedDoc.clientAddress || '',
      clientPhone:  parsedDoc.clientPhone   || '',
      serviceName:  parsedDoc.serviceName   || '',
      description:  parsedDoc.description   || '',
      items:        parsedDoc.items         || [],
      totalValue:   parsedDoc.totalValue    || 0,
      deadline:     parsedDoc.deadline      || '',
      paymentTerms: parsedDoc.paymentTerms  || '',
      validity:     parsedDoc.validity      || '15 dias',
      notes:        parsedDoc.notes         || '',
    };

    const res = await fetch('/api/melo/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const { base64 } = await res.json();
      const html = atob(base64);
      setPreviewHtml(html);
      setParsedDoc(content as DocumentContent);
    }
    setGenerating(false);
    setChatStep('confirm');
  }

  async function confirmAndSave(uploadToOD: boolean) {
    if (!parsedDoc) return;
    setSaving(true);

    // 1. Save to DB
    const docRes = await fetch('/api/melo/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ name: docName, type: 'orcamento', content: parsedDoc }),
    });
    const savedDoc: MeloDocument = await docRes.json();

    // 2. Download doc file
    const genRes = await fetch('/api/melo/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ content: parsedDoc }),
    });
    const { base64 } = await genRes.json();

    if (uploadToOD && odToken) {
      setUploadingOD(true);
      const filename = `${docName.replace(/[^a-zA-Z0-9 ]/g, '')}.doc`;
      const odRes = await fetch('/api/melo/onedrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}`, 'X-OneDrive-Token': odToken },
        body: JSON.stringify({ filename, base64, folder: 'Melo Documentos', mimeType: 'application/msword' }),
      });
      if (odRes.ok) {
        const { id: oneDriveId, webUrl } = await odRes.json();
        await fetch('/api/melo/documents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
          body: JSON.stringify({ id: savedDoc.id, oneDriveId, oneDrivePath: webUrl, status: 'enviado' }),
        });
      }
      setUploadingOD(false);
    }

    // 3. Trigger browser download
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: 'application/msword' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `${docName}.doc`;
    a.click();
    URL.revokeObjectURL(url);

    setSaving(false);
    setChatStep('input');
    setChatInput('');
    setParsedDoc(null);
    setPreviewHtml('');
    loadDocs();
  }

  async function deleteDoc(id: string) {
    if (!confirm('Remover este documento?')) return;
    await fetch(`/api/melo/documents?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` } });
    loadDocs();
  }

  async function downloadODFile(fileId: string) {
    const res = await fetch(`/api/melo/onedrive?action=download&id=${fileId}`, {
      headers: { Authorization: `Bearer ${tk()}`, 'X-OneDrive-Token': odToken },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'documento'; a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = `w-full px-4 py-2.5 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[#1D6EF7] transition-all`;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

        {/* Search + New */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.muted }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar documentos..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: c.card, border: `1px solid ${c.border}`, color: c.t1 }}
            />
          </div>
          <button onClick={() => { setChatStep('input'); setChatInput(''); setTab('chat'); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white flex-shrink-0 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 10px rgba(29,110,247,0.3)' }}>
            <Plus size={15} /> Novo
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
          {([['list','Documentos'],['orcamento','Orçamento'],['chat','Chat'],['onedrive','OneDrive']] as [DocTab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-[12px] font-semibold transition-all"
              style={{ background: tab===t?'#1D6EF7':(isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'),
                       color: tab===t?'#fff':c.muted }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── LIST TAB ── */}
        {tab === 'list' && (
          <div>
            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: c.card }} />)}
              </div>
            ) : docs.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <FileText size={28} className="mx-auto mb-2 opacity-30" style={{ color: c.muted }} />
                <p className="text-[13px]" style={{ color: c.muted }}>Nenhum documento encontrado</p>
                <button onClick={() => setTab('chat')} className="mt-2 text-[#1D6EF7] text-[12px]">+ Criar via chat</button>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                    style={{ background: c.card, border: `1px solid ${c.border}` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(29,110,247,0.12)' }}>
                      <FileDoc size={20} style={{ color: '#4C82FF' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: c.t1 }}>{doc.name}</p>
                      <p className="text-[11px]" style={{ color: c.muted }}>
                        {doc.clientName} · {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        {doc.oneDrivePath && <span className="ml-1 text-[#32D74B]">· OneDrive ✓</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        doc.status === 'enviado' ? 'bg-[#32D74B]/15 text-[#32D74B]' :
                        doc.status === 'confirmado' ? 'bg-[#0066FF]/15 text-[#4C82FF]' :
                        'bg-[#FF9F0A]/15 text-[#FF9F0A]'
                      }`}>{doc.status}</span>
                      <button onClick={() => deleteDoc(doc.id)} className="active:opacity-60 transition-opacity" style={{ color: c.muted }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORÇAMENTO ALFA GLASS TAB ── */}
        {tab === 'orcamento' && (
          <div className="space-y-4">
            {alfaStep === 'input' && (
              <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <div className="p-4" style={{ borderBottom: `1px solid ${c.border}` }}>
                  <p className="font-semibold text-[14px]" style={{ color: c.t1 }}>Orçamento — Alfa Glass Solution</p>
                  <p className="text-[12px] mt-1" style={{ color: c.muted }}>
                    Preencha os dados abaixo. Use o formato de exemplo:
                  </p>
                  <div className="mt-2 p-3 rounded-xl text-[11px] leading-relaxed font-mono"
                    style={{ background: isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)', color: c.muted }}>
                    {`Cliente: João Silva\nCPF/CNPJ: 123.456.789-00\nEndereço: Rua das Flores, 123\nBairro: Centro\nCEP: 20000-000\nOS: 001\nData: 15/01/2026\nItens:\n2 | Vidro temperado 3mm | 1,50 | 1,20 | 3,60 | 180,00 | 648,00\n1 | Espelho bisotê | 0,80 | 0,60 | 0,48 | 250,00 | 120,00\nTotal: 768,00\nPagamento: 50% entrada + 50% na entrega\nObs: Instalação inclusa`}
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: c.muted }}>
                    Itens: qtde | descrição | altura | largura | m² | valor/unit | subtotal
                  </p>
                </div>
                <div className="p-4">
                  <textarea
                    value={alfaInput}
                    onChange={e => setAlfaInput(e.target.value)}
                    placeholder="Digite os dados do orçamento aqui..."
                    rows={10}
                    className="w-full resize-none text-[13px] bg-transparent outline-none leading-relaxed font-mono"
                    style={{ color: c.t1 }}
                  />
                  <button onClick={async () => {
                    if (!alfaInput.trim()) return;
                    setAlfaLoading(true);
                    const parsed = parseAlfaGlass(alfaInput);
                    setAlfaParsed(parsed);
                    const res = await fetch('/api/melo/documents/orcamento-pdf', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
                      body: JSON.stringify(parsed),
                    });
                    const { html } = await res.json();
                    setAlfaHtml(html);
                    setAlfaStep('preview');
                    setAlfaLoading(false);
                  }} disabled={!alfaInput.trim() || alfaLoading}
                    className="w-full mt-3 py-3 rounded-xl font-semibold text-[14px] text-white disabled:opacity-40 active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(135deg,#1a3a6b,#0d2456)', boxShadow: '0 2px 12px rgba(26,58,107,0.4)' }}>
                    {alfaLoading ? 'Gerando prévia...' : 'Gerar Prévia do Orçamento'}
                  </button>
                </div>
              </div>
            )}

            {alfaStep === 'preview' && alfaParsed && (
              <div className="space-y-3">
                {/* Preview */}
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
                  <div className="p-3 flex items-center justify-between"
                    style={{ background: isDark?'rgba(26,58,107,0.2)':'rgba(26,58,107,0.08)', borderBottom: `1px solid ${c.border}` }}>
                    <p className="text-[13px] font-semibold" style={{ color: '#1a3a6b' }}>Prévia do Orçamento</p>
                    <button onClick={() => { setAlfaStep('input'); }}
                      className="text-[11px]" style={{ color: c.muted }}>← Editar dados</button>
                  </div>
                  <iframe srcDoc={alfaHtml} className="w-full" style={{ height: 500, border: 'none', background: '#fff' }} title="Prévia" />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {/* PDF */}
                  <button onClick={() => {
                    const w = window.open('', '_blank');
                    if (!w) return;
                    w.document.write(alfaHtml);
                    w.document.close();
                    setTimeout(() => w.print(), 600);
                  }}
                    className="w-full py-3 rounded-xl font-semibold text-[14px] text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)', boxShadow: '0 2px 12px rgba(22,163,74,0.3)' }}>
                    Exportar PDF
                  </button>

                  {/* Save to DB */}
                  <button onClick={async () => {
                    setAlfaSaving(true);
                    await fetch('/api/melo/documents', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
                      body: JSON.stringify({
                        name: `Orçamento — ${alfaParsed.clienteNome || 'Cliente'} — ${alfaParsed.os || new Date().toLocaleDateString('pt-BR')}`,
                        type: 'orcamento', clientName: alfaParsed.clienteNome || '',
                        content: { number: alfaParsed.os, clientName: alfaParsed.clienteNome,
                          clientAddress: alfaParsed.clienteEndereco, clientPhone: '',
                          serviceName: '', description: '', items: [],
                          totalValue: parseFloat(alfaParsed.total?.replace(/[^\d,]/g,'').replace(',','.') || '0') || 0,
                          deadline: '', paymentTerms: alfaParsed.formasPagamento,
                          validity: '10 dias', notes: alfaParsed.observacoes },
                      }),
                    });
                    setAlfaSaving(false);
                    setAlfaStep('input'); setAlfaInput(''); setAlfaParsed(null); setAlfaHtml('');
                    loadDocs();
                  }} disabled={alfaSaving}
                    className="w-full py-3 rounded-xl font-semibold text-[13px] disabled:opacity-40 active:scale-[0.98] transition-all"
                    style={{ background: c.card, border: `1px solid ${c.border}`, color: c.muted }}>
                    {alfaSaving ? 'Salvando...' : 'Salvar no histórico'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tab === 'chat' && (
          <div className="space-y-4">
            {chatStep === 'input' && (
              <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <div className="p-4" style={{ borderBottom: `1px solid ${c.border}` }}>
                  <p className="font-semibold text-[14px]" style={{ color: c.t1 }}>Criar Orçamento via Chat</p>
                  <p className="text-[12px] mt-1" style={{ color: c.muted }}>
                    Envie os dados do orçamento em texto livre. Exemplo:
                  </p>
                  <div className="mt-2 p-3 rounded-xl text-[11px] leading-relaxed" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: c.muted }}>
                    {`Cliente: João Silva
Endereço: Rua das Flores, 123 - São Paulo
Telefone: (11) 99999-9999
Serviço: Pintura completa do imóvel
Descrição: Pintura interna e externa, 3 quartos, sala e cozinha
Itens: Mão de obra 2500 | Tinta e materiais 1500
Valor total: 4000
Prazo: 15 dias
Pagamento: 50% no início, 50% na entrega`}
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Digite os dados do orçamento aqui..."
                    rows={8}
                    className="w-full resize-none text-[13px] bg-transparent outline-none leading-relaxed"
                    style={{ color: c.t1 }}
                  />
                  <button onClick={processChat} disabled={!chatInput.trim()}
                    className="w-full mt-3 py-3 rounded-xl font-semibold text-[14px] text-white disabled:opacity-40 active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 12px rgba(29,110,247,0.3)' }}>
                    Processar Dados
                  </button>
                </div>
              </div>
            )}

            {chatStep === 'preview' && parsedDoc && (
              <div className="space-y-3">
                <div className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                  <p className="font-semibold text-[14px] mb-3" style={{ color: c.t1 }}>Dados Extraídos — Confirme</p>
                  <div className="space-y-2">
                    {[
                      ['Cliente', parsedDoc.clientName],
                      ['Endereço', parsedDoc.clientAddress],
                      ['Telefone', parsedDoc.clientPhone],
                      ['Serviço', parsedDoc.serviceName],
                      ['Prazo', parsedDoc.deadline],
                      ['Pagamento', parsedDoc.paymentTerms],
                      ['Valor Total', parsedDoc.totalValue ? fmt(parsedDoc.totalValue) : ''],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label as string} className="flex items-start gap-2">
                        <span className="text-[11px] font-semibold min-w-[80px]" style={{ color: c.muted }}>{label}</span>
                        <span className="text-[12px] flex-1" style={{ color: c.t1 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  {(parsedDoc.items || []).length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${c.border}` }}>
                      <p className="text-[11px] font-semibold mb-2" style={{ color: c.muted }}>Itens</p>
                      {parsedDoc.items!.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[12px]">
                          <span style={{ color: c.t1 }}>{item.description}</span>
                          <span style={{ color: c.muted }}>{fmt(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>Nome do Documento</label>
                  <input value={docName} onChange={e => setDocName(e.target.value)}
                    className={inputCls} style={{ background: c.card, border: `1px solid ${c.border}`, color: c.t1 }} />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setChatStep('input')}
                    className="flex-1 py-3 rounded-xl font-semibold text-[13px] active:scale-[0.98] transition-all"
                    style={{ background: c.card, border: `1px solid ${c.border}`, color: c.muted }}>
                    Corrigir Dados
                  </button>
                  <button onClick={generateAndPreview} disabled={generating}
                    className="flex-[2] py-3 rounded-xl font-semibold text-[13px] text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)' }}>
                    {generating ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Gerando...</>
                      : <><Eye size={15} /> Visualizar Documento</>}
                  </button>
                </div>
              </div>
            )}

            {chatStep === 'confirm' && (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
                  <div className="p-3 flex items-center justify-between" style={{ background: isDark ? 'rgba(29,110,247,0.12)' : 'rgba(29,110,247,0.08)', borderBottom: `1px solid ${c.border}` }}>
                    <p className="text-[13px] font-semibold" style={{ color: '#4C82FF' }}>Prévia do Documento</p>
                    <button onClick={() => setChatStep('preview')} className="text-[11px]" style={{ color: c.muted }}>← Editar</button>
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full"
                    style={{ height: 480, border: 'none', background: '#fff' }}
                    title="Preview do orçamento"
                  />
                </div>

                <div className="space-y-2">
                  <button onClick={() => confirmAndSave(false)} disabled={saving}
                    className="w-full py-3 rounded-xl font-semibold text-[14px] text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#32D74B,#28A745)', boxShadow: '0 2px 12px rgba(50,215,75,0.3)' }}>
                    <Download size={16} /> Salvar e Baixar
                  </button>
                  {odToken ? (
                    <button onClick={() => confirmAndSave(true)} disabled={saving || uploadingOD}
                      className="w-full py-3 rounded-xl font-semibold text-[14px] text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#0078D4,#005BA1)', boxShadow: '0 2px 12px rgba(0,120,212,0.3)' }}>
                      <CloudArrowUp size={16} />
                      {uploadingOD ? 'Enviando para OneDrive...' : 'Salvar + Enviar ao OneDrive'}
                    </button>
                  ) : (
                    <button onClick={() => { setChatStep('input'); setTab('onedrive'); }}
                      className="w-full py-3 rounded-xl font-semibold text-[13px] active:scale-[0.98] transition-all"
                      style={{ background: c.card, border: `1px solid ${c.border}`, color: c.muted }}>
                      Conectar OneDrive para envio automático
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ONEDRIVE TAB ── */}
        {tab === 'onedrive' && (
          <div className="space-y-4">
            {!odToken ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(0,120,212,0.12)' }}>
                  <CloudArrowUp size={28} style={{ color: '#0078D4' }} />
                </div>
                <p className="font-semibold text-[15px] mb-1" style={{ color: c.t1 }}>Conectar OneDrive</p>
                <p className="text-[12px] mb-4" style={{ color: c.muted }}>
                  Sincronize seus documentos automaticamente com o OneDrive. Requer uma conta Microsoft.
                </p>
                {!showODSetup ? (
                  <button onClick={connectOneDrive}
                    className="px-6 py-3 rounded-xl font-semibold text-[14px] text-white active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#0078D4,#005BA1)', boxShadow: '0 2px 12px rgba(0,120,212,0.35)' }}>
                    Conectar com Microsoft
                  </button>
                ) : (
                  <div className="space-y-3 text-left">
                    <div className="rounded-xl p-3 text-[11px] leading-relaxed" style={{ background: isDark ? 'rgba(255,150,0,0.1)' : 'rgba(255,150,0,0.08)', border: '1px solid rgba(255,150,0,0.2)', color: '#FF9F0A' }}>
                      <p className="font-semibold mb-1">Como obter o Client ID:</p>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Acesse <span className="font-mono">portal.azure.com</span></li>
                        <li>Azure Active Directory → Registros de aplicativo → Novo registro</li>
                        <li>Nome: Melo Digital · URI de redirecionamento: Web → URL do app + /melo/documents</li>
                        <li>Em "Autenticação" → Conceder tokens de acesso (fluxo implícito)</li>
                        <li>Copie o "ID do aplicativo (cliente)"</li>
                      </ol>
                    </div>
                    <input value={odClientId} onChange={e => setODClientId(e.target.value)}
                      placeholder="Client ID do Azure (ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
                      className={inputCls} style={{ background: c.card, border: `1px solid ${c.border}`, color: c.t1, fontFamily: 'monospace' }} />
                    <div className="flex gap-2">
                      <button onClick={() => setShowODSetup(false)}
                        className="flex-1 py-2.5 rounded-xl text-[13px]" style={{ background: c.card, border: `1px solid ${c.border}`, color: c.muted }}>
                        Cancelar
                      </button>
                      <button onClick={saveClientId} disabled={!odClientId}
                        className="flex-[2] py-2.5 rounded-xl font-semibold text-[13px] text-white disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,#0078D4,#005BA1)' }}>
                        Salvar e Conectar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#32D74B]" />
                    <p className="text-[13px] font-semibold" style={{ color: c.t1 }}>OneDrive Conectado</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={loadODFiles} className="w-8 h-8 rounded-xl flex items-center justify-center active:rotate-180 transition-transform"
                      style={{ background: c.card, border: `1px solid ${c.border}` }}>
                      <ArrowClockwise size={14} style={{ color: c.muted }} />
                    </button>
                    <button onClick={() => { localStorage.removeItem('od_token'); setODToken(''); setODFiles([]); }}
                      className="text-[11px] px-3 py-1 rounded-lg" style={{ background: 'rgba(229,72,77,0.1)', color: '#E5484D' }}>
                      Desconectar
                    </button>
                  </div>
                </div>

                {odLoading ? (
                  <div className="space-y-2">
                    {[0,1,2].map(i => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: c.card }} />)}
                  </div>
                ) : odFiles.length === 0 ? (
                  <div className="rounded-2xl p-6 text-center" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                    <p className="text-[13px]" style={{ color: c.muted }}>Nenhum arquivo em "Melo Documentos"</p>
                    <p className="text-[11px] mt-1" style={{ color: c.muted }}>Os documentos criados aqui aparecerão automaticamente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {odFiles.map(file => (
                      <div key={file.id} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                        style={{ background: c.card, border: `1px solid ${c.border}` }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(0,120,212,0.12)' }}>
                          <FileDoc size={18} style={{ color: '#0078D4' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: c.t1 }}>{file.name}</p>
                          <p className="text-[10px]" style={{ color: c.muted }}>
                            {(file.size / 1024).toFixed(0)} KB · {new Date(file.lastModifiedDateTime).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <button onClick={() => downloadODFile(file.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: 'rgba(0,120,212,0.1)', color: '#0078D4' }}>
                          <Download size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
