// app/api/fastags/bulk-add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { serial_from, serial_to, supplier_id, purchase_date, purchase_price, remarks } = await req.json();

  if (serial_from > serial_to) {
    return NextResponse.json({ error: "'serial_from' must be less than or equal to 'serial_to'" }, { status: 400 });
  }

  const values = [];
  for (let serial = serial_from; serial <= serial_to; serial++) {
    values.push([serial.toString(), supplier_id, purchase_date, purchase_price, remarks]);
  }

  try {
    await pool.query(
      'INSERT INTO fastags (tag_serial, supplier_id, purchase_date, purchase_price, remarks) VALUES ?',
      [values]
    );
    return NextResponse.json({ success: true, count: values.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
