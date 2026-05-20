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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * MANTÉM o label e ADICIONA o valor abaixo (com quebra de linha).
 * Não substitui o texto original.
 */
function appendBelowLabel(xml: string, labelText: string, value: string): string {
  if (!value || !value.trim()) return xml;
  const v = escapeXml(value.trim());
  // Procura o run contendo o label e adiciona um novo run com <w:br/> + valor
  const pattern = new RegExp(`(<w:t[^>]*>${escapeRegex(labelText)}</w:t></w:r>)`);
  return xml.replace(
    pattern,
    `$1<w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:br/><w:t xml:space="preserve">${v}</w:t></w:r>`
  );
}

/** Preenche uma linha de item, injetando texto em cada célula vazia */
function fillItemRow(emptyRowXml: string, item: Item, seed: number): string {
  const values = [
    item.qtde || '', item.descricao || '', item.alt || '',
    item.larg || '', item.m2 || '', item.valorUnit || '', item.subtotal || '',
  ];
  let cellIdx = 0;

  // Injeta texto antes de </w:p></w:tc> em cada célula vazia, na ordem
  let result = emptyRowXml.replace(
    /(<\/w:pPr>)(<\/w:p><\/w:tc>)/g,
    (match, p1, p2) => {
      const val = values[cellIdx++];
      if (val && val.trim()) {
        return `${p1}<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(val.trim())}</w:t></w:r>${p2}`;
      }
      return match;
    }
  );

  // Gera paraIds únicos para evitar conflitos no Word
  let counter = 0;
  result = result.replace(/w14:paraId="[A-F0-9]+"/g, () => {
    counter++;
    const hex = ((seed * 7919 + counter * 31) >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
    return `w14:paraId="${hex}"`;
  });

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

  // ── APPEND valores ABAIXO dos labels (mantém o label) ──
  xml = appendBelowLabel(xml, 'Nome/RazãoSocial -',   data.clienteNome     || '');
  xml = appendBelowLabel(xml, 'Cpf/CnpJ',             data.clienteCpfCnpj  || '');
  xml = appendBelowLabel(xml, 'IE',                   data.clienteIE       || '');
  xml = appendBelowLabel(xml, 'Data',                 data.clienteData     || '');
  xml = appendBelowLabel(xml, 'OS',                   data.clienteOS       || '');
  xml = appendBelowLabel(xml, 'Endereço',             data.clienteEndereco || '');
  xml = appendBelowLabel(xml, 'Bairro',               data.clienteBairro   || '');
  xml = appendBelowLabel(xml, 'Cep',                  data.clienteCep      || '');
  xml = appendBelowLabel(xml, 'Contato',              data.clienteContato  || '');
  xml = appendBelowLabel(xml, 'Telefone/Celular',     data.clienteTelefone || '');
  xml = appendBelowLabel(xml, 'E-mail',               data.clienteEmail    || '');
  xml = appendBelowLabel(xml, 'FormasdePagamento:',   data.formasPagamento || '');

  // ── TOTAL: substitui os espaços em branco pelo valor ──
  if (data.total && data.total.trim()) {
    const t = data.total.trim().replace(/^R\$\s*/i, '');
    xml = xml.replace(
      /(TOTAL:R\$)\s+(<\/w:t>)/,
      `$1${escapeXml(t)}$2`
    );
  }

  // ── Preenche linhas da tabela de itens ──
  if (data.itens && data.itens.length > 0) {
    const subtotalIdx = xml.indexOf('<w:t>Subtotal</w:t>');
    if (subtotalIdx !== -1) {
      const headerRowEnd = xml.indexOf('</w:tr>', subtotalIdx) + 7;
      const totalIdx     = xml.indexOf('TOTAL:R$');
      const totalTrStart = xml.lastIndexOf('<w:tr ', totalIdx);

      if (headerRowEnd > 0 && totalTrStart > headerRowEnd) {
        const itemsSection = xml.substring(headerRowEnd, totalTrStart);
        const rowRegex = /<w:tr\b[\s\S]*?<\/w:tr>/g;
        const emptyRows = [...itemsSection.matchAll(rowRegex)];

        if (emptyRows.length > 0) {
          const emptyRowTemplate = emptyRows[0][0];
          const filledRows: string[] = [];
          const seed = Date.now() & 0xFFFFFF;

          for (let i = 0; i < data.itens.length && i < emptyRows.length; i++) {
            filledRows.push(fillItemRow(emptyRowTemplate, data.itens[i], seed + i));
          }

          // Substitui as primeiras N linhas vazias pelas preenchidas (resto fica vazio)
          let replaced = 0;
          const newItemsSection = itemsSection.replace(rowRegex, (match) => {
            if (replaced < filledRows.length) {
              return filledRows[replaced++];
            }
            return match;
          });

          xml = xml.substring(0, headerRowEnd) + newItemsSection + xml.substring(totalTrStart);
        }
      }
    }
  }

  // ── Atualiza o ZIP e retorna ──
  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf-8'));

  const buffer   = zip.toBuffer();
  const safeName = (data.clienteNome || 'Cliente').replace(/[^a-zA-Z0-9_À-ſ]/g, '_').slice(0, 40);
  const filename = `Orcamento_${safeName}_${data.clienteOS || Date.now()}.docx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
