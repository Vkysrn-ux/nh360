// /app/api/tickets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTicket, updateTicket } from '@/lib/ticket-actions';

export async function GET(req: NextRequest, { params }: any) {
  const ticket = await getTicket(Number(params.id));
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: any) {
  const data = await req.json();
  await updateTicket(Number(params.id), data);
  return NextResponse.json({ ok: true });
}
