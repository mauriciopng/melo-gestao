'use client';

import { useState } from 'react';
import AppShell from '@/components/melo/AppShell';
import { ChevronDown, ChevronUp, Wifi, Shield, Key, Smartphone, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/melo/theme';

const FAQS = [
  { q: 'Como acesso o app no meu iPhone?', a: 'Certifique-se que iPhone e computador estão no mesmo Wi-Fi. Inicie o servidor com "npm run dev" no computador. Descubra o IP local (Windows: cmd → ipconfig → Endereço IPv4) e acesse http://[SEU-IP]:3000/melo no Safari.' },
  { q: 'Como instalar na tela inicial do iPhone?', a: 'Abra no Safari → toque no ícone de Compartilhar → "Adicionar à Tela de Início". O app aparecerá como ícone nativo, sem barra de endereço, igual a um app da App Store.' },
  { q: 'Os dados ficam salvos ao reiniciar o servidor?', a: 'Sim. Todos os dados ficam em arquivos JSON na pasta data/melo/ do projeto. Reiniciar o servidor não apaga nada. Apenas o estado de login pode ser solicitado novamente.' },
  { q: 'Como fazer backup dos dados?', a: 'Copie a pasta data/melo/ para um HD externo ou nuvem. Para restaurar, coloque os arquivos de volta no mesmo lugar antes de iniciar o servidor.' },
  { q: 'Como progresso de etapas funciona nos Serviços?', a: 'Cada tipo de serviço tem etapas específicas. Para Filmagem: Roteiro → Captação → Edição → Entrega. Para Design: Referências → Criação → Entrega. Para Web: Figma → Desenvolvimento → Responsividade → Entrega. Clique nas etapas para avançar o progresso.' },
  { q: 'O app funciona sem internet?', a: 'Sim, completamente offline. O servidor roda no seu computador e não precisa de conexão com a internet para funcionar. Apenas o acesso inicial ao npm pode precisar de internet.' },
  { q: 'Como descobrir o IP do computador no Windows?', a: 'Pressione Win+R → digite "cmd" → Enter. Na janela do prompt, digite "ipconfig" e pressione Enter. Procure por "Endereço IPv4" na seção da sua rede Wi-Fi. Ex: 192.168.1.100.' },
];

function Accordion({ faq }: { faq: typeof FAQS[0] }) {
  const [open, setOpen] = useState(false);
  const { v } = useTheme();
  return (
    <div className={`border-b ${v.border} last:border-0`}>
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between py-4 text-left ${v.hover} -mx-2 px-2 rounded-xl transition-all`}>
        <span className={`text-sm font-medium ${v.t1} pr-4`}>{faq.q}</span>
        {open
          ? <ChevronUp size={15} className="text-[#4C82FF] flex-shrink-0" />
          : <ChevronDown size={15} className={`${v.muted} flex-shrink-0`} />
        }
      </button>
      {open && <p className={`text-sm ${v.muted} pb-4 leading-relaxed`}>{faq.a}</p>}
    </div>
  );
}

function PinChanger() {
  const { v } = useTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError('Os PINs não coincidem'); return; }
    if (next.length < 4) { setError('Mínimo 4 dígitos'); return; }
    setLoading(true); setError('');
    const token = localStorage.getItem('melo_token') || '';
    const res = await fetch('/api/melo/auth', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPin: current, newPin: next }),
    });
    setLoading(false);
    if (res.ok) { setMsg('PIN alterado com sucesso!'); setCurrent(''); setNext(''); setConfirm(''); }
    else { const d = await res.json(); setError(d.error || 'Erro ao alterar PIN'); }
  }

  const inputCls = `w-full px-4 py-2.5 rounded-xl border ${v.ibr} ${v.ib} ${v.it} text-center text-xl tracking-widest placeholder-[#3A3A60] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all`;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>PIN Atual</label>
        <input type="password" inputMode="numeric" value={current} onChange={e => setCurrent(e.target.value)}
          placeholder="••••" maxLength={8} className={inputCls} />
      </div>
      <div>
        <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Novo PIN</label>
        <input type="password" inputMode="numeric" value={next} onChange={e => setNext(e.target.value)}
          placeholder="••••" maxLength={8} className={inputCls} />
      </div>
      <div>
        <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Confirmar Novo PIN</label>
        <input type="password" inputMode="numeric" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="••••" maxLength={8} className={inputCls} />
      </div>
      {error && <p className="text-[#FF453A] text-xs">{error}</p>}
      {msg && <p className="text-[#32D74B] text-xs">{msg}</p>}
      <button type="submit" disabled={loading || !current || !next || !confirm}
        className="w-full text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-98 transition-all"
        style={{ background: 'linear-gradient(135deg, #0066FF, #003ECC)', boxShadow: '0 2px 12px rgba(0,102,255,0.4)' }}>
        {loading ? 'Alterando...' : 'Alterar PIN'}
      </button>
    </form>
  );
}

export default function HelpPage() {
  const { v, isDark } = useTheme();

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0066FF, #003ECC)', boxShadow: '0 4px 20px rgba(0,102,255,0.35)' }}>
          <div className="absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3), transparent 60%)' }} />
          <div className="relative">
            <h2 className="text-lg font-bold text-white mb-1">Central de Ajuda</h2>
            <p className="text-blue-200 text-sm">Melo Digital Studio · Dashboard de Gestão</p>
          </div>
        </div>

        {/* Network Setup */}
        <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
          <div className={`flex items-center gap-2 mb-4`}>
            <div className="w-8 h-8 rounded-xl bg-[#0066FF]/15 flex items-center justify-center">
              <Wifi size={16} className="text-[#4C82FF]" />
            </div>
            <h3 className={`font-semibold ${v.t1}`}>Acesso pelo iPhone</h3>
          </div>
          <ol className="space-y-3">
            {[
              { icon: Monitor, text: 'No computador, inicie o servidor: npm run dev' },
              { icon: Wifi, text: 'Conecte iPhone e computador ao mesmo Wi-Fi' },
              { icon: Monitor, text: 'Windows: abra cmd → ipconfig → copie "Endereço IPv4"' },
              { icon: Smartphone, text: 'No iPhone: http://[SEU-IP]:3000/melo' },
              { icon: Smartphone, text: 'Safari → Compartilhar → "Adicionar à Tela de Início"' },
            ].map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-xs flex items-center justify-center flex-shrink-0 font-bold shadow-[0_2px_6px_rgba(0,102,255,0.4)]">{i + 1}</span>
                <span className={`text-sm ${v.t2}`}>{text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Features guide */}
        <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
          <h3 className={`font-semibold ${v.t1} mb-4`}>Guia das Abas</h3>
          <div className="space-y-4">
            {[
              { emoji: '📊', name: 'Dashboard', desc: 'Visão geral do mês com receitas, despesas, lucro, serviços ativos e próximos eventos.' },
              { emoji: '💰', name: 'Finanças', desc: 'Registre receitas e despesas. Navegue por mês. Veja saldo em tempo real.' },
              { emoji: '📅', name: 'Agenda', desc: 'Calendário com marcadores coloridos por tipo. Clique num dia para filtrar eventos.' },
              { emoji: '💼', name: 'Serviços', desc: 'Gerencie projetos por etapas específicas de cada tipo. Clique nas etapas para avançar o progresso.' },
              { emoji: '📈', name: 'Estatísticas', desc: 'Gráficos anuais de receita vs despesa, distribuição por categoria e funil de serviços.' },
            ].map(f => (
              <div key={f.name} className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${isDark ? 'bg-[#16162A]' : 'bg-[#F2F2F7]'}`}>
                  {f.emoji}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${v.t1}`}>{f.name}</p>
                  <p className={`text-xs ${v.muted} mt-0.5 leading-relaxed`}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Etapas de Serviço */}
        <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
          <h3 className={`font-semibold ${v.t1} mb-4`}>Etapas por Tipo de Serviço</h3>
          <div className="space-y-3">
            {[
              { icon: '🎬', type: 'Filmagem', steps: ['Roteiro', 'Captação', 'Edição', 'Entrega'] },
              { icon: '🎨', type: 'Design', steps: ['Referências', 'Criação', 'Entrega'] },
              { icon: '💻', type: 'Web', steps: ['Figma', 'Desenvolvimento', 'Responsividade', 'Entrega'] },
              { icon: '📷', type: 'Foto', steps: ['Planejamento', 'Sessão', 'Seleção', 'Entrega'] },
            ].map(({ icon, type, steps }) => (
              <div key={type} className={`rounded-xl p-3 ${isDark ? 'bg-[#16162A]' : 'bg-[#F8F8FC]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{icon}</span>
                  <span className={`text-sm font-semibold ${v.t1}`}>{type}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {i > 0 && <span className={v.muted}>→</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-[#0066FF]/15 text-[#4C82FF]' : 'bg-[#0066FF]/10 text-[#0066FF]'} font-medium`}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#32D74B]/15 flex items-center justify-center">
              <Shield size={16} className="text-[#32D74B]" />
            </div>
            <h3 className={`font-semibold ${v.t1}`}>Segurança</h3>
          </div>
          <p className={`text-sm ${v.muted} mb-4 leading-relaxed`}>
            Todos os dados ficam armazenados localmente no seu computador. Nenhuma informação é enviada para a internet.
            O acesso é protegido por PIN — apenas quem estiver na mesma rede Wi-Fi e souber o PIN pode acessar.
          </p>
          <div className={`flex items-center gap-2 mb-3`}>
            <Key size={15} className="text-[#4C82FF]" />
            <p className={`text-sm font-semibold ${v.t1}`}>Alterar PIN de Acesso</p>
          </div>
          <PinChanger />
        </div>

        {/* FAQ */}
        <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
          <h3 className={`font-semibold ${v.t1} mb-2`}>Perguntas Frequentes</h3>
          <div>{FAQS.map((f, i) => <Accordion key={i} faq={f} />)}</div>
        </div>

        <div className="text-center pb-4">
          <p className={`text-xs ${v.muted}`}>Melo Digital Studio Dashboard v1.1</p>
          <p className={`text-xs ${v.muted}`}>Dados em data/melo/ · Local Only</p>
        </div>
      </div>
    </AppShell>
  );
}
