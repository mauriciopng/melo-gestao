import { NextRequest, NextResponse } from 'next/server';
import { verifySession, extractToken } from '@/lib/melo/auth';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

interface OrcamentoItem {
  qtde: string;
  descricao: string;
  alt: string;
  larg: string;
  m2: string;
  valorUnit: string;
  subtotal: string;
}

interface OrcamentoData {
  os?: string;
  data?: string;
  clienteNome?: string;
  clienteCpfCnpj?: string;
  clienteIE?: string;
  clienteEndereco?: string;
  clienteBairro?: string;
  clienteCep?: string;
  itens?: OrcamentoItem[];
  formasPagamento?: string;
  total?: string;
  observacoes?: string;
  baseUrl?: string;
}

function fmt(n: string | number) {
  const v = typeof n === 'string' ? parseFloat(n.replace(',', '.')) : n;
  if (isNaN(v)) return n as string;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function generateHTML(data: OrcamentoData): string {
  const base = data.baseUrl || '';
  const now  = data.data || new Date().toLocaleDateString('pt-BR');

  const itemRows = (data.itens || []).map(item => `
    <tr>
      <td style="text-align:center">${item.qtde || ''}</td>
      <td>${item.descricao || ''}</td>
      <td style="text-align:center">${item.alt || ''}</td>
      <td style="text-align:center">${item.larg || ''}</td>
      <td style="text-align:center">${item.m2 || ''}</td>
      <td style="text-align:right">${item.valorUnit || ''}</td>
      <td style="text-align:right">${item.subtotal || ''}</td>
    </tr>`).join('');

  // Empty rows to pad the table
  const emptyRows = Math.max(0, 6 - (data.itens?.length || 0));
  const padRows = Array(emptyRows).fill(`
    <tr>
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Orçamento ${data.os || ''} — Alfa Glass Solution</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a1a; background: #fff; }

  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 2px solid #1a3a6b; padding-bottom: 6px; }
  .header-logo { display: flex; align-items: center; gap: 8px; }
  .header-logo img { height: 56px; object-fit: contain; }
  .header-title { text-align: right; }
  .header-title .orcamento-label { font-size: 22pt; font-weight: 900; color: #1a3a6b; letter-spacing: 2px; text-transform: uppercase; line-height: 1; }
  .header-title .os-data { font-size: 8pt; color: #555; margin-top: 2px; }

  .client-box { border: 1.5px solid #1a3a6b; border-radius: 4px; margin-bottom: 6px; overflow: hidden; }
  .client-box-title { background: #1a3a6b; color: #fff; font-weight: 700; font-size: 8pt; padding: 3px 8px; text-transform: uppercase; letter-spacing: 1px; }
  .client-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0; }
  .client-grid-2 { display: grid; grid-template-columns: 3fr 1fr; gap: 0; }
  .client-field { padding: 4px 8px; border-right: 1px solid #c8d4e8; border-bottom: 1px solid #c8d4e8; }
  .client-field:last-child { border-right: none; }
  .client-field label { display: block; font-size: 7pt; color: #1a3a6b; font-weight: 700; text-transform: uppercase; margin-bottom: 1px; }
  .client-field span { font-size: 9pt; font-weight: 600; min-height: 14px; display: block; }

  .qualif-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
  .qualif-box { border: 1.5px solid #1a3a6b; border-radius: 4px; overflow: hidden; }
  .qualif-box-title { background: #1a3a6b; color: #fff; font-weight: 700; font-size: 7.5pt; padding: 2px 8px; text-transform: uppercase; letter-spacing: 1px; }
  .qualif-content { padding: 4px 8px; }
  .qualif-content table { width: 100%; }
  .qualif-content td { padding: 1.5px 0; font-size: 8pt; vertical-align: top; }
  .qualif-content td:first-child { font-weight: 700; width: 38%; color: #1a3a6b; font-size: 7.5pt; text-transform: uppercase; padding-right: 4px; }

  .details-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 6px; }
  .detail-box { border: 1.5px solid #1a3a6b; border-radius: 4px; padding: 4px 6px; text-align: center; }
  .detail-box label { display: block; font-size: 7pt; font-weight: 700; color: #1a3a6b; text-transform: uppercase; }
  .detail-box span { font-size: 9pt; font-weight: 600; }

  table.items { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 8pt; }
  table.items th { background: #1a3a6b; color: #fff; padding: 4px 5px; font-size: 7.5pt; text-align: center; border: 1px solid #1a3a6b; font-weight: 700; text-transform: uppercase; }
  table.items th:nth-child(2) { text-align: left; }
  table.items td { border: 1px solid #c8d4e8; padding: 4px 5px; height: 18px; font-size: 8.5pt; }
  table.items tr:nth-child(even) td { background: #f0f4fb; }

  .total-row { display: flex; justify-content: flex-end; align-items: center; gap: 12px; background: #1a3a6b; color: #fff; padding: 5px 10px; border-radius: 3px; margin-bottom: 4px; font-size: 9pt; font-weight: 700; }
  .total-row .label { font-size: 8pt; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
  .total-row .value { font-size: 13pt; font-weight: 900; }

  .pagamento-box { border: 1.5px solid #1a3a6b; border-radius: 4px; margin-bottom: 6px; overflow: hidden; }
  .pagamento-box-title { background: #1a3a6b; color: #fff; font-weight: 700; font-size: 7.5pt; padding: 2px 8px; text-transform: uppercase; }
  .pagamento-content { padding: 4px 8px; font-size: 8.5pt; min-height: 20px; }

  .obs-box { border: 1.5px solid #aaa; border-radius: 4px; margin-bottom: 6px; overflow: hidden; }
  .obs-box-title { background: #eee; color: #333; font-weight: 700; font-size: 7.5pt; padding: 2px 8px; text-transform: uppercase; }
  .obs-content { padding: 4px 8px; font-size: 7.5pt; color: #444; line-height: 1.4; }

  .conditions { font-size: 6.5pt; color: #444; line-height: 1.35; margin-bottom: 6px; border: 1px solid #ddd; padding: 5px 8px; border-radius: 3px; }
  .conditions p { margin-bottom: 3px; }

  .clauses { font-size: 6.5pt; color: #333; line-height: 1.35; border: 1px solid #1a3a6b; border-radius: 4px; padding: 5px 8px; margin-bottom: 6px; }
  .clauses h4 { color: #1a3a6b; font-size: 7pt; margin-bottom: 2px; margin-top: 4px; }
  .clauses h4:first-child { margin-top: 0; }

  .footer { display: flex; align-items: center; justify-content: space-between; border-top: 1.5px solid #1a3a6b; padding-top: 6px; margin-top: 4px; }
  .assinatura { text-align: center; font-size: 7.5pt; }
  .assinatura .linha { border-top: 1px solid #333; width: 180px; margin: 0 auto 3px; }
  .footer-contact { text-align: right; font-size: 7pt; color: #555; }
  .footer-contact strong { color: #1a3a6b; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  .print-btn {
    position: fixed; bottom: 20px; right: 20px; z-index: 100;
    background: #1a3a6b; color: #fff; border: none; padding: 12px 20px;
    border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    touch-action: manipulation;
  }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">Exportar PDF</button>

<!-- HEADER -->
<div class="header">
  <div class="header-logo">
    <img src="${base}/orcamento/logo1.jpeg" alt="Logo" onerror="this.style.display='none'">
    <img src="${base}/orcamento/logo3.png" alt="Logo" onerror="this.style.display='none'" style="height:48px">
  </div>
  <div class="header-title">
    <div class="orcamento-label">Orçamento</div>
    <div class="os-data">OS: ${data.os || '________'}&nbsp;&nbsp;&nbsp;Data: ${now}</div>
  </div>
</div>

<!-- DADOS DO CLIENTE -->
<div class="client-box">
  <div class="client-box-title">Dados do Cliente (CONTRATANTE)</div>
  <div class="client-grid">
    <div class="client-field">
      <label>Nome / Razão Social</label>
      <span>${data.clienteNome || ''}</span>
    </div>
    <div class="client-field">
      <label>CPF / CNPJ</label>
      <span>${data.clienteCpfCnpj || ''}</span>
    </div>
    <div class="client-field">
      <label>IE</label>
      <span>${data.clienteIE || ''}</span>
    </div>
  </div>
  <div class="client-grid-2">
    <div class="client-field" style="border-bottom:none">
      <label>Endereço</label>
      <span>${data.clienteEndereco || ''}</span>
    </div>
    <div class="client-field" style="border-bottom:none">
      <label>Bairro</label>
      <span>${data.clienteBairro || ''}</span>
    </div>
    <div class="client-field" style="border-bottom:none; border-right:none">
      <label>CEP</label>
      <span>${data.clienteCep || ''}</span>
    </div>
  </div>
</div>

<!-- QUALIFICAÇÃO EMPRESA + DETALHES -->
<div class="qualif-row">
  <div class="qualif-box">
    <div class="qualif-box-title">Qualificação — CONTRATADA</div>
    <div class="qualif-content">
      <table>
        <tr><td>Responsável</td><td>SUELY CAVALCANTE</td></tr>
        <tr><td>CNPJ / PIX</td><td>51.323.796/0001-54</td></tr>
        <tr><td>Nome Fantasia</td><td>ALFA GLASS SOLUTION</td></tr>
        <tr><td>Endereço</td><td>Vicente Celestino, 764 — Centro / Nilópolis RJ 26525-530</td></tr>
        <tr><td>E-mail</td><td>vidracariaalfaglass@gmail.com</td></tr>
      </table>
    </div>
  </div>
  <div style="display:flex; flex-direction:column; gap:6px">
    <div class="detail-box">
      <label>Validade da Proposta</label>
      <span>10 dias</span>
    </div>
    <div class="detail-box">
      <label>Prazo de Entrega</label>
      <span>25 Dias Úteis</span>
    </div>
    <div class="detail-box">
      <label>Colocação</label>
      <span>SIM</span>
    </div>
  </div>
</div>

<!-- TABELA DE ITENS -->
<table class="items">
  <thead>
    <tr>
      <th style="width:5%">Qtde</th>
      <th style="width:33%;text-align:left">Materiais e Especificações</th>
      <th style="width:8%">Alt</th>
      <th style="width:8%">Larg</th>
      <th style="width:8%">M²</th>
      <th style="width:14%">Valor Unit.</th>
      <th style="width:14%">Subtotal</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
    ${padRows}
  </tbody>
</table>

<!-- TOTAL -->
<div class="total-row">
  <span class="label">Formas de Pagamento:</span>
  <span style="flex:1; font-size:8.5pt; font-weight:400">${data.formasPagamento || ''}</span>
  <span class="label">TOTAL:</span>
  <span class="value">${data.total ? fmt(data.total) : 'R$ ________'}</span>
</div>

<!-- OBSERVAÇÕES -->
<div class="obs-box">
  <div class="obs-box-title">Observações</div>
  <div class="obs-content">${data.observacoes || '&nbsp;'}</div>
</div>

<!-- CONDIÇÕES GERAIS -->
<div class="conditions">
  <p>As quantidades e otimizações geométricas foram calculadas de acordo com as medidas enviadas por V. Sas. Alterações nas medidas oficiais, cortes parciais que modificam os rendimentos geométricos informados serão objeto de nova negociação comercial para ajuste nos preços.</p>
  <p>A metragem das peças é sempre calculada com arredondamento para maior tanto na altura quanto na largura em múltiplo de 5 cm. Para as peças modeladas ou fora de esquadro será faturado o retângulo que circunscreve a peça, além do acréscimo em mais 40% sobre o valor do preço por m² do vidro.</p>
  <p>O cliente se responsabiliza por fornecer aos profissionais da Alfa Glass todas as condições para o trânsito e carregamento de vidros. Caso no dia da entrega chova, será agendada uma nova data de acordo com a disponibilidade da agenda da Alfa Glass. Caso o material não suba por elevador, o transporte vertical correrá por conta do cliente. Caso haja necessidade de Munck, Torres Eletrônicas, Andaimes etc para a perfeita execução dos serviços, correrá por conta do cliente.</p>
  <p><strong>Garantia:</strong> A Alfa Glass garantirá os serviços executados conforme previsto no código brasileiro de Normas, assumindo o ônus por eventuais quebras e defeitos que possam ocorrer durante a execução dos serviços e medições erradas enviadas pelos profissionais da empresa Alfa Glass. Nesse caso, o prazo para reposição será de mais 15 dias úteis.</p>
  <p><strong>Validade do Preço:</strong> Até o término da execução dos serviços, salvo impedimento ou dificuldade de instalação apresentada pela obra.</p>
  <p><strong>Pagamento:</strong> O CONTRATANTE deverá efetuar o pagamento na forma e condições estabelecidas entre as partes. Em caso de não cumprimento, a obra será suspensa até a regularização. A Alfa Glass emitirá boleto com o saldo devedor no CPF/CNPJ do CONTRATANTE.</p>
</div>

<!-- CLÁUSULAS -->
<div class="clauses">
  <h4>Cláusula 1 — Objeto do Contrato</h4>
  <p>1.1 A CONTRATADA compromete-se a prestar ao CONTRATANTE os serviços, equipamentos ou sistemas descritos em anexo, de acordo com as normas técnicas aplicáveis.</p>
  <h4>Cláusula 2 — Obrigações da CONTRATADA</h4>
  <p>2.1 Fornecer mão de obra qualificada, materiais e ferramentas necessárias dentro dos prazos estabelecidos. 2.2 Responsabiliza-se pela qualidade dos serviços, corrigindo gratuitamente defeitos reportados em até 90 dias após a execução, exceto danos por uso após conferência final. 2.3 Observar as normas de segurança do trabalho e cumprir obrigações fiscais, trabalhistas e previdenciárias.</p>
  <h4>Cláusula 3 — Obrigações do CONTRATANTE</h4>
  <p>3.1 Fornecer todas as informações e documentos necessários para a correta execução dos serviços. 3.2 Comunicar imediatamente qualquer falha nos serviços realizados. 3.3 Pagar os valores estipulados nas condições acordadas.</p>
  <h4>Cláusula 4 — Valor e Forma de Pagamento</h4>
  <p>4.1 O CONTRATANTE pagará o valor descrito neste contrato na forma de pagamento acordada. 4.2 Em caso de atraso, incidirão juros de mora de 1% ao dia e multa de 10% sobre o valor em atraso, caso ultrapasse 20 dias, ficando sujeito à negativação.</p>
  <h4>Cláusula 5 — Prazo e Vigência &nbsp;|&nbsp; Cláusula 6 — Rescisão</h4>
  <p>5.1 O prazo está determinado junto à OS, podendo ser prorrogado por acordo entre as partes. 6.1 Rescisão antecipada mediante acordo ou descumprimento, com notificação mínima de 3 dias.</p>
  <h4>Cláusula 7 — Confidencialidade</h4>
  <p>7.1 Serão feitos fotos e vídeos do serviço para controle interno e divulgação em nossas mídias oficiais. Caso haja desconforto, notificar por escrito no fechamento do contrato.</p>
</div>

<!-- RODAPÉ -->
<div class="footer">
  <div class="assinatura">
    <div class="linha"></div>
    <strong>Assinatura do Cliente</strong><br>
    <span style="font-size:7pt">${data.clienteNome || '___________________________'}</span>
  </div>
  <div style="text-align:center; font-size:7pt; color:#444">
    <p><em>Ao aceitar este orçamento, você confirma que analisou e está de acordo com as informações previstas.</em></p>
    <p style="margin-top:4px; color:#1a3a6b; font-weight:700">Equipe Alfa Glass — Nós desejamos uma experiência incrível!</p>
    <p>instagram.com/alfaglass_solucoes</p>
  </div>
  <div class="footer-contact">
    <img src="${base}/orcamento/logo2.jpeg" alt="" style="height:36px; display:block; margin-left:auto; margin-bottom:4px" onerror="this.style.display='none'">
    <strong>CNPJ:</strong> 51.323.796/0001-54<br>
    vidracariaalfaglass@gmail.com
  </div>
</div>

</body>
</html>`;
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const data: OrcamentoData = await req.json();
  const baseUrl = req.headers.get('origin') || '';
  const html = generateHTML({ ...data, baseUrl });
  const base64 = Buffer.from(html, 'utf-8').toString('base64');
  return NextResponse.json({ html, base64 });
}
