import { NextRequest, NextResponse } from 'next/server';
import { getSantriById, updateSantri, deleteSantri, saveDocument } from '@/lib/db/santri-repo';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const santri = getSantriById(id);
    if (!santri) {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: santri });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const updated = updateSantri(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal memperbarui data: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const success = deleteSantri(id);
    if (!success) {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Data santri berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const doc = saveDocument({
      santriId: id,
      kategori: body.kategori,
      nomorDokumen: body.nomorDokumen,
      fileUrl: body.fileUrl,
      rawOcrText: body.rawOcrText,
      extractedFields: body.extractedFields,
      catatanVerifikasi: body.catatanVerifikasi,
      statusVerifikasi: body.statusVerifikasi,
    });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menambah dokumen: ' + error.message }, { status: 500 });
  }
}
