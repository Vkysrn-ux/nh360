// app/api/tickets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET: fetch a single ticket by id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [rows] = await pool.query(`SELECT * FROM tickets_nh WHERE id = ?`, [id]);
  // @ts-ignore
  const row = rows?.[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(row);
}

// PATCH: update a single ticket by id (convenience)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const data = await req.json();
  const allowedFields = [
    "vehicle_reg_no",
    "subject",
    "details",
    "phone",
    "alt_phone",
    "assigned_to",
    "lead_received_from",
    "lead_by",
    "status",
    "customer_name",
    "comments",
  ];

  const updates: string[] = [];
  const values: any[] = [];
  for (const field of allowedFields) {
    if (typeof data[field] !== "undefined") {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  values.push(id);

  await pool.query(`UPDATE tickets_nh SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}
