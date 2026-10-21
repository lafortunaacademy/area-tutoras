import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { getSessao, getVisitante } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { fotoDaTutora } from '@/lib/notion/hub';

/**
 * A foto de uma tutora, pequena e rápida.
 *
 * A original do Notion tem vários MB e a URL dela expira, então cada visita
 * pagaria o download inteiro. Aqui a versão reduzida fica guardada no Storage
 * do Supabase: só a primeira visita de cada versão espera o Notion, e as
 * seguintes saem direto de lá (uns 10 KB). O `?v=` é a data da última edição da
 * página — muda a foto, muda o arquivo guardado.
 */
const LARGURA = 300;
/** `?tamanho=mini`: o avatar redondo das tabelas, de 20 px na tela. */
const LARGURA_MINI = 48;
const BALDE = 'fotos';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tutoraId: string }> }) {
  // Qualquer pessoa logada: administrativo, tutora ou mentorada.
  if (!(await getSessao()) && !(await getVisitante())) return new NextResponse(null, { status: 401 });

  const { tutoraId } = await params;
  const mini = request.nextUrl.searchParams.get('tamanho') === 'mini';
  const versao = request.nextUrl.searchParams.get('v') ?? '0';
  const caminho = `${normalizarId(tutoraId)}/${versao.replace(/[^\w.-]/g, '')}-${mini ? 'mini' : 'card'}.webp`;

  try {
    const guardada = await baixarDoBalde(caminho);
    if (guardada) return responder(guardada);

    const url = await fotoDaTutora(normalizarId(tutoraId));
    if (!url) return new NextResponse(null, { status: 404 });

    const original = await fetch(url, { cache: 'no-store' });
    if (!original.ok) return new NextResponse(null, { status: 502 });

    const pequena = await sharp(Buffer.from(await original.arrayBuffer()))
      .rotate()
      .resize(
        mini
          ? { width: LARGURA_MINI, height: LARGURA_MINI, fit: 'cover', position: 'top' }
          : { width: LARGURA, withoutEnlargement: true },
      )
      .webp({ quality: mini ? 45 : 68 })
      .toBuffer();

    // Guardar não pode atrasar a resposta: se falhar, a próxima visita tenta de novo.
    void guardarNoBalde(caminho, pequena);
    return responder(pequena);
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

function responder(bytes: Uint8Array | Buffer) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/webp',
      // A foto é a mesma para todo mundo e o endereço carrega a versão: o
      // navegador e a Vercel podem guardar sem medo de mostrar a antiga.
      'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
    },
  });
}

async function baixarDoBalde(caminho: string): Promise<Uint8Array | null> {
  const { data } = await supabaseAdmin().storage.from(BALDE).download(caminho);
  if (!data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

async function guardarNoBalde(caminho: string, bytes: Buffer): Promise<void> {
  const storage = supabaseAdmin().storage;
  const subir = () =>
    storage.from(BALDE).upload(caminho, bytes, { contentType: 'image/webp', upsert: true });

  const { error } = await subir();
  // Primeira foto da vida: o balde ainda não existe, então cria e tenta de novo.
  if (error && /bucket/i.test(error.message)) {
    await storage.createBucket(BALDE, { public: false }).catch(() => null);
    await subir().catch(() => null);
  }
}
