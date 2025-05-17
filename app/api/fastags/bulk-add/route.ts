// app/api/fastags/bulk-add/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const {
    serial_from,
    serial_to,
    supplier_id,
    purchase_date,
    purchase_price,
    remarks,
    bank_name,
    fastag_type,
    fastag_class,
    batch_number
  } = await req.json();

  if (!serial_from || !serial_to || !bank_name || !fastag_type || !fastag_class || !batch_number || !purchase_price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (serial_from > serial_to) {
    return NextResponse.json({ error: "'serial_from' must be less than or equal to 'serial_to'" }, { status: 400 });
  }

  const values: any[] = [];
  for (let serial = serial_from; serial <= serial_to; serial++) {
    values.push([
      serial.toString(),
      supplier_id || null,
      purchase_date,
      purchase_price,
      remarks || null,
      bank_name,
      fastag_type,
      fastag_class,
      batch_number,
      'in_stock' // default status
    ]);
  }

  try {
    await pool.query(
      `INSERT INTO fastags 
        (tag_serial, supplier_id, purchase_date, purchase_price, remarks, bank_name, fastag_type, fastag_class, batch_number, status)
       VALUES ?`,
      [values]
    );

    return NextResponse.json({ success: true, count: values.length });
  } catch (error) {
    console.error("Bulk insert failed:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
