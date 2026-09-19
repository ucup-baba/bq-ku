import { NextRequest, NextResponse } from 'next/server';
import { getSantriById, updateSantri, deleteSantri, saveDocument } from '@/lib/db/santri-repo';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const santri = getSantriById(params.id);
    if (!santri) {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: santri });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = updateSantri(params.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal memperbarui data: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = deleteSantri(params.id);
    if (!success) {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Data santri berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const doc = saveDocument({
      santriId: params.id,
      kategori: body.kategori,
      nomorDokumen: body.nomorDokumen,
      fileUrl: body.fileUrl,
      rawOcrText: body.rawOcrText,
      extractedFields: body.extractedFields,
      catatanVerifikasi: body.catatanVerifikasi,
    });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menambah dokumen: ' + error.message }, { status: 500 });
  }
}
