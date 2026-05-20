import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { verifySession, extractToken } from '@/lib/melo/auth';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

interface Item {
  qtde: string;
  descricao: string;
  alt: string;
  larg: string;
  m2: string;
  valorUnit: string;
  subtotal: string;
}

interface DocData {
  clienteNome?: string;
  clienteCpfCnpj?: string;
  clienteIE?: string;
  clienteData?: string;
  clienteOS?: string;
  clienteEndereco?: string;
  clienteBairro?: string;
  clienteCep?: string;
  clienteContato?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  formasPagamento?: string;
  total?: string;
  itens?: Item[];
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Injeta texto no primeiro parágrafo vazio de uma célula */
function fillCell(cellXml: string, value: string, sz = '20'): string {
  if (!value.trim()) return cellXml;
  const v = escapeXml(value);
  // Inject run right before </w:p></w:tc>
  return cellXml.replace(
    /(<\/w:pPr>)(<\/w:p><\/w:tc>)/,
    `$1<w:r><w:rPr><w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${v}</w:t></w:r>$2`
  );
}

/** Cria XML de uma linha de item preenchida a partir da estrutura original */
function buildItemRow(emptyRowXml: string, item: Item, idx: number): string {
  // Extract all cells
  const cellMatches = [...emptyRowXml.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)];
  if (cellMatches.length < 7) return emptyRowXml;

  const values = [item.qtde, item.descricao, item.alt, item.larg, item.m2, item.valorUnit, item.subtotal];
  let result = emptyRowXml;

  // Replace unique paraId to avoid conflicts
  result = result.replace(/w14:paraId="[A-F0-9]+"/g, (_, pos) => {
    const hex = (Math.floor(Math.random() * 0xFFFFFF) + idx * 100).toString(16).toUpperCase().padStart(8, '0');
    return `w14:paraId="${hex}"`;
  });

  // Fill each cell in reverse order to preserve offsets
  for (let i = cellMatches.length - 1; i >= 0; i--) {
    const original = cellMatches[i][0];
    const filled   = values[i] ? fillCell(original, values[i]) : original;
    const pos = result.lastIndexOf(original);
    if (pos !== -1 && filled !== original) {
      result = result.slice(0, pos) + filled + result.slice(pos + original.length);
    }
  }
  return result;
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const data: DocData = await req.json();

  // ── Load template ──
  const templatePath = path.join(process.cwd(), 'public', 'orcamento', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 500 });
  }

  const zip = new AdmZip(templatePath);
  let xml  = zip.readAsText('word/document.xml');

  // ── Replace header label fields ──
  const replacements: [string, string][] = [
    ['<w:t>Nome/RazãoSocial -</w:t>',   `<w:t>${escapeXml(data.clienteNome     || '')}</w:t>`],
    ['<w:t>Cpf/CnpJ</w:t>',             `<w:t>${escapeXml(data.clienteCpfCnpj  || '')}</w:t>`],
    ['<w:t>IE</w:t>',                   `<w:t>${escapeXml(data.clienteIE        || 'IE')}</w:t>`],
    ['<w:t>Data</w:t>',                 `<w:t>${escapeXml(data.clienteData      || '')}</w:t>`],
    ['<w:t>OS</w:t>',                   `<w:t>${escapeXml(data.clienteOS        || '')}</w:t>`],
    ['<w:t>Endereço</w:t>',             `<w:t>${escapeXml(data.clienteEndereco  || '')}</w:t>`],
    ['<w:t>Bairro</w:t>',               `<w:t>${escapeXml(data.clienteBairro    || '')}</w:t>`],
    ['<w:t>Cep</w:t>',                  `<w:t>${escapeXml(data.clienteCep       || '')}</w:t>`],
    ['<w:t>Contato</w:t>',              `<w:t>${escapeXml(data.clienteContato   || '')}</w:t>`],
    ['<w:t>Telefone/Celular</w:t>',     `<w:t>${escapeXml(data.clienteTelefone  || '')}</w:t>`],
    ['<w:t>E-mail</w:t>',               `<w:t>${escapeXml(data.clienteEmail     || '')}</w:t>`],
  ];
  for (const [from, to] of replacements) {
    xml = xml.replace(from, to);
  }

  // ── Replace TOTAL ──
  if (data.total) {
    const totalVal = data.total.trim().startsWith('R$') ? data.total.trim() : `R$ ${data.total.trim()}`;
    xml = xml.replace(
      /(<w:t[^>]*>\s*TOTAL:R\$\s*)(\s+)(<\/w:t>)/,
      `$1 ${escapeXml(totalVal)} $3`
    );
  }

  // ── Fill formas de pagamento ──
  // The field label "FormasdePagamento:" has a run right after it — inject into the NEXT empty cell
  if (data.formasPagamento) {
    // Find the run right after the FormasdePagamento text and the blank space after
    xml = xml.replace(
      /(<w:t>FormasdePagamento:<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/,
      (match, prefix, middle, suffix) => {
        if (middle.includes('<w:t>')) return match; // already has content
        return `${prefix}${middle}<w:r><w:t xml:space="preserve"> ${escapeXml(data.formasPagamento!)}</w:t></w:r>${suffix}`;
      }
    );
  }

  // ── Fill item rows ──
  if (data.itens && data.itens.length > 0) {
    // Find the section between Subtotal header and TOTAL row
    const headerRowEnd = xml.indexOf('</w:tr>', xml.indexOf('<w:t>Subtotal</w:t>')) + 7;
    const totalRowStart = xml.indexOf('<w:t xml:space="preserve">', xml.indexOf('TOTAL:R$') - 200);
    // Go back to find the start of the row that contains TOTAL
    const totalTrStart = xml.lastIndexOf('<w:tr ', totalRowStart);

    const itemsSection = xml.substring(headerRowEnd, totalTrStart);

    // Get all individual rows in this section
    const rowRegex = /<w:tr[\s\S]*?<\/w:tr>/g;
    const emptyRows: RegExpMatchArray[] = [...itemsSection.matchAll(rowRegex)];

    if (emptyRows.length > 0) {
      const emptyRowTemplate = emptyRows[0][0]; // Use first row as template
      let newItemsSection = itemsSection;
      const filledRows: string[] = [];

      // Build filled rows
      for (let i = 0; i < data.itens.length && i < emptyRows.length; i++) {
        filledRows.push(buildItemRow(emptyRowTemplate, data.itens[i], i + 1));
      }

      // Replace empty rows: first N with filled, rest stay empty
      let replaced = 0;
      newItemsSection = itemsSection.replace(rowRegex, (match) => {
        if (replaced < filledRows.length) {
          return filledRows[replaced++];
        }
        return match;
      });

      xml = xml.substring(0, headerRowEnd) + newItemsSection + xml.substring(totalTrStart);
    }
  }

  // ── Update zip and return ──
  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf-8'));

  const buffer = zip.toBuffer();
  const filename = `Orcamento_${(data.clienteNome || 'Cliente').replace(/\s+/g, '_')}_${data.clienteOS || new Date().getTime()}.docx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
