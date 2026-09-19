import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { getVisitante } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';
import { fotoDaTutora } from '@/lib/notion/hub';

/**
 * A foto de uma tutora em tamanho de cartão. A original do Notion tem vários
 * MB; aqui ela sai com 360 px de largura em WebP, poucas dezenas de KB. O `?v=`
 * (a data da última edição da página) muda quando a foto muda, então o
 * navegador e a Vercel podem guardar esta versão.
 */
const LARGURA = 360;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ tutoraId: string }> }) {
  if (!(await getVisitante())) return new NextResponse(null, { status: 401 });

  const { tutoraId } = await params;
  try {
    const url = await fotoDaTutora(normalizarId(tutoraId));
    if (!url) return new NextResponse(null, { status: 404 });

    const original = await fetch(url, { cache: 'no-store' });
    if (!original.ok) return new NextResponse(null, { status: 502 });

    const pequena = await sharp(Buffer.from(await original.arrayBuffer()))
      .rotate()
      .resize({ width: LARGURA, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    return new NextResponse(new Uint8Array(pequena), {
      headers: {
        'Content-Type': 'image/webp',
        // Foto de tutora é a mesma para todo mundo que vê a galeria: a Vercel guarda
        // a versão pequena e só o primeiro acesso de cada versão espera o Notion.
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
