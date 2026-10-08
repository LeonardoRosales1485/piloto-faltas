import { NextRequest, NextResponse } from 'next/server';
import HTMLtoDOCX from 'html-to-docx';
import { requireUser } from '@/lib/auth';
import { firmaHtml, PIE_INSTITUCIONAL } from '@/lib/membrete';
import { aplicarValores } from '@/lib/campos';
import { db } from '@/lib/srv';
import { jsonFail } from '@/lib/http-data';

type Ctx = { params: Promise<{ uuid: string }> };

/** Descarga el escrito en DOCX: A4, Times New Roman 12, membrete y pie institucional (P-12). */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { uuid } = await ctx.params;
    const { data } = await db().from('documento').select('titulo, numero, contenido_html, valores_json, firmado_por, firmado_at, hash').eq('uuid', uuid).maybeSingle();
    if (!data) return jsonFail(404, 'Documento inexistente');
    const doc = data as { titulo: string; numero: string | null; contenido_html: string; valores_json: string | null; firmado_por: string | null; firmado_at: number | null; hash: string | null };
    const cuerpo = `<p style="text-align:center"><strong>MUNICIPALIDAD DE MALVINAS ARGENTINAS</strong><br/>DIRECCIÓN DE FALTAS</p>${aplicarValores(doc.contenido_html, (() => { try { return JSON.parse(doc.valores_json ?? '{}'); } catch { return {}; } })(), 'puntos')}${firmaHtml(doc)}`;
    const buf = (await HTMLtoDOCX(`<!DOCTYPE html><html><body>${cuerpo}</body></html>`, null, {
      font: 'Times New Roman', fontSize: 24, pageSize: { width: 11906, height: 16838 },
      margins: { top: 1134, right: 1134, bottom: 1134, left: 1418, footer: 567 }, footer: true,
    }, `<p style="text-align:center;font-size:9pt">${PIE_INSTITUCIONAL}</p>`)) as Buffer;
    const nombre = `${doc.titulo}${doc.numero ? ` ${doc.numero}` : ''}`.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(nombre)}.docx"`,
      },
    });
  } catch (e) {
    return jsonFail((e as { status?: number }).status ?? 500, e instanceof Error ? e.message : 'Error');
  }
}
