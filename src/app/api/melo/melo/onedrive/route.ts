import { NextRequest, NextResponse } from 'next/server';
import { verifySession, extractToken } from '@/lib/melo/auth';

// Proxy for Microsoft Graph API — avoids CORS issues from the browser.
// Expects: X-OneDrive-Token header with the Graph access token.
// Body for upload: { filename, base64, folder? }
// Query for list: ?action=list&folder=path
// Query for download: ?action=download&id=itemId

async function authMelo(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

const GRAPH = 'https://graph.microsoft.com/v1.0';

export async function GET(req: NextRequest) {
  if (!(await authMelo(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const odToken = req.headers.get('X-OneDrive-Token');
  if (!odToken) return NextResponse.json({ error: 'Token OneDrive ausente' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';
  const folder = searchParams.get('folder') || 'Melo Documentos';
  const itemId = searchParams.get('id');

  if (action === 'list') {
    const encodedPath = encodeURIComponent(folder);
    const res = await fetch(`${GRAPH}/me/drive/root:/${encodedPath}:/children?$select=id,name,size,lastModifiedDateTime,file,@microsoft.graph.downloadUrl`, {
      headers: { Authorization: `Bearer ${odToken}` },
    });
    if (!res.ok) {
      if (res.status === 404) return NextResponse.json([]);
      return NextResponse.json({ error: 'Erro ao listar arquivos' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data.value || []);
  }

  if (action === 'download' && itemId) {
    const res = await fetch(`${GRAPH}/me/drive/items/${itemId}/content`, {
      headers: { Authorization: `Bearer ${odToken}` },
    });
    if (!res.ok) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: res.status });
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `attachment`,
      },
    });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  if (!(await authMelo(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const odToken = req.headers.get('X-OneDrive-Token');
  if (!odToken) return NextResponse.json({ error: 'Token OneDrive ausente' }, { status: 400 });

  const { filename, base64, folder = 'Melo Documentos', mimeType } = await req.json();
  if (!filename || !base64) return NextResponse.json({ error: 'filename e base64 obrigatórios' }, { status: 400 });

  const bytes = Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
  const encodedPath = encodeURIComponent(`${folder}/${filename}`);
  const contentType = mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const res = await fetch(`${GRAPH}/me/drive/root:/${encodedPath}:/content`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${odToken}`,
      'Content-Type': contentType,
    },
    body: bytes,
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: 'Falha ao enviar para OneDrive', details: err }, { status: res.status });
  }

  const result = await res.json();
  return NextResponse.json({ id: result.id, name: result.name, webUrl: result.webUrl });
}
