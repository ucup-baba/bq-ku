import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function validationResponse(error: ZodError) {
  return NextResponse.json({ error: 'Validasi gagal', fields: zodFieldErrors(error) }, { status: 400 });
}
