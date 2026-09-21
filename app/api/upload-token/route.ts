import { NextRequest, NextResponse } from 'next/server';
import { getSantriById, createUploadTokenRecord } from '@/lib/db/santri-repo';

function generateToken(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { santriId } = body;

    if (!santriId) {
      return NextResponse.json({ error: 'santriId diperlukan' }, { status: 400 });
    }

    // Verify santri exists
    const santri = await getSantriById(santriId);
    if (!santri) {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    }

    const token = generateToken(12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await createUploadTokenRecord(santriId, token, expiresAt.toISOString());

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bq-ku.vercel.app';
    const uploadUrl = `${baseUrl}/upload-mandiri/${token}`;

    return NextResponse.json({
      success: true,
      token,
      uploadUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Upload token error:', error);
    return NextResponse.json({ error: 'Gagal membuat token upload: ' + error.message }, { status: 500 });
  }
}
