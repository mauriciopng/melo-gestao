import { NextRequest, NextResponse } from 'next/server';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { DocumentContent } from '@/lib/melo/types';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Generates a Word-compatible HTML document (Word opens .doc HTML natively)
function generateWordHtml(content: DocumentContent): string {
  const itemsRows = content.items.map(item => `
    <tr>
      <td style="border:1px solid #ddd;padding:8px">${item.description}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${item.quantity}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right">${fmt(item.unitValue)}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right"><b>${fmt(item.total)}</b></td>
    </tr>`).join('');

  const today = new Date().toLocaleDateString('pt-BR');

  return `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<title>Orçamento ${content.number}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #222; margin: 2cm; }
  .header { text-align: center; border-bottom: 3px solid #1D6EF7; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 22pt; color: #1D6EF7; margin: 0 0 4px; }
  .header p { margin: 2px 0; color: #555; font-size: 10pt; }
  .doc-number { font-size: 14pt; font-weight: bold; color: #333; text-align: right; margin-bottom: 10px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 11pt; font-weight: bold; color: #1D6EF7; border-bottom: 1px solid #1D6EF7;
                   padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .info-item label { font-size: 9pt; color: #888; display: block; }
  .info-item span { font-size: 11pt; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #1D6EF7; color: white; padding: 8px; text-align: left; font-size: 10pt; }
  th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
  td { font-size: 10pt; }
  tr:nth-child(even) td { background: #f5f7ff; }
  .total-row td { border-top: 2px solid #1D6EF7; font-weight: bold; font-size: 12pt; }
  .total-value { color: #1D6EF7; font-size: 14pt; }
  .conditions { background: #f8f9fa; border-left: 4px solid #1D6EF7; padding: 12px 16px; margin: 12px 0; }
  .signature { margin-top: 50px; text-align: center; }
  .signature-line { border-top: 1px solid #333; width: 280px; margin: 0 auto 6px; }
  .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #888;
            border-top: 1px solid #ddd; padding-top: 10px; }
  .validity-badge { display: inline-block; background: #fff3cd; border: 1px solid #ffc107;
                    padding: 4px 10px; border-radius: 4px; font-size: 10pt; color: #856404; }
</style>
</head>
<body>

<div class="header">
  <h1>ORÇAMENTO</h1>
  <p>Documento gerado em ${today}</p>
</div>

<div class="doc-number">${content.number}</div>

<div class="section">
  <div class="section-title">Dados do Cliente</div>
  <table style="border:none">
    <tr>
      <td style="border:none;padding:4px 0;width:50%">
        <label style="font-size:9pt;color:#888">Cliente</label>
        <div style="font-weight:600">${content.clientName}</div>
      </td>
      <td style="border:none;padding:4px 0;width:50%">
        <label style="font-size:9pt;color:#888">Telefone</label>
        <div style="font-weight:600">${content.clientPhone}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="border:none;padding:4px 0">
        <label style="font-size:9pt;color:#888">Endereço</label>
        <div style="font-weight:600">${content.clientAddress}</div>
      </td>
    </tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Descrição do Serviço</div>
  <table style="border:none">
    <tr>
      <td style="border:none;padding:4px 0">
        <label style="font-size:9pt;color:#888">Serviço</label>
        <div style="font-weight:600">${content.serviceName}</div>
      </td>
    </tr>
    <tr>
      <td style="border:none;padding:4px 0">
        <label style="font-size:9pt;color:#888">Descrição Detalhada</label>
        <div>${content.description}</div>
      </td>
    </tr>
  </table>
</div>

${content.items.length > 0 ? `
<div class="section">
  <div class="section-title">Itens</div>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th style="text-align:center;width:60px">Qtd</th>
        <th style="text-align:right;width:120px">Valor Unit.</th>
        <th style="text-align:right;width:120px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      <tr class="total-row">
        <td colspan="3" style="border:1px solid #ddd;padding:10px;text-align:right">TOTAL</td>
        <td style="border:1px solid #ddd;padding:10px;text-align:right" class="total-value">${fmt(content.totalValue)}</td>
      </tr>
    </tbody>
  </table>
</div>` : `
<div class="section">
  <div class="section-title">Valor Total</div>
  <p style="font-size:18pt;font-weight:bold;color:#1D6EF7">${fmt(content.totalValue)}</p>
</div>`}

<div class="conditions">
  <table style="width:100%;border:none">
    <tr>
      <td style="border:none;padding:4px 8px;width:50%">
        <label style="font-size:9pt;color:#888">Prazo de Execução</label>
        <div style="font-weight:600">${content.deadline}</div>
      </td>
      <td style="border:none;padding:4px 8px;width:50%">
        <label style="font-size:9pt;color:#888">Condições de Pagamento</label>
        <div style="font-weight:600">${content.paymentTerms}</div>
      </td>
    </tr>
  </table>
</div>

${content.notes ? `
<div class="section">
  <div class="section-title">Observações</div>
  <p>${content.notes}</p>
</div>` : ''}

<p>Validade do orçamento: <span class="validity-badge">${content.validity}</span></p>

<div class="signature">
  <div class="signature-line"></div>
  <div style="font-weight:600">Marcelo</div>
  <div style="font-size:10pt;color:#555">Responsável Técnico</div>
  <div style="font-size:9pt;color:#888;margin-top:4px">${today}</div>
</div>

<div class="footer">
  Documento gerado pelo sistema Melo Digital
</div>

</body>
</html>`;
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { content } = await req.json() as { content: DocumentContent };
  if (!content) return NextResponse.json({ error: 'content obrigatório' }, { status: 400 });

  const html = generateWordHtml(content);
  const base64 = Buffer.from(html, 'utf-8').toString('base64');

  return NextResponse.json({ base64, mimeType: 'application/msword', extension: 'doc' });
}
