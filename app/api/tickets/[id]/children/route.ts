// app/api/tickets/[id]/children/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolConnection } from "mysql2/promise";

// Generate daily ticket number: NH360-YYYYMMDD-###
async function generateTicketNo(conn: PoolConnection): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}${mm}${dd}`;

  const [rows] = await conn.query(
    "SELECT COUNT(*) AS count FROM tickets_nh WHERE DATE(created_at) = CURDATE()"
  );
  // @ts-ignore
  const todayCount = rows?.[0]?.count ?? 0;
  const seq = String(todayCount + 1).padStart(3, "0");
  return `NH360-${todayStr}-${seq}`;
}

// GET: list all child sub-tickets for a parent ticket
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params; // ✅ await params
    const parentId = Number(id);
    if (!Number.isFinite(parentId) || parentId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [rows] = await pool.query(
      `
        SELECT t.*
        FROM tickets_nh t
        WHERE t.parent_ticket_id = ?
        ORDER BY t.created_at DESC
      `,
      [parentId]
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET /api/tickets/[id]/children error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch child tickets" },
      { status: 500 }
    );
  }
}

// POST: create one child sub-ticket under a parent
// Body: { subject: string, details?: string, ...optional overrides }
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const conn = await pool.getConnection();
  try {
    const { id } = await ctx.params; // ✅ await params
    const parentId = Number(id);
    if (!Number.isFinite(parentId) || parentId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const subject = String(body?.subject ?? "").trim();
    if (!subject) {
      return NextResponse.json({ error: "Subject required" }, { status: 400 });
    }

    // Pull parent (from tickets_nh) to inherit fields
    const [prow] = await pool.query(`SELECT * FROM tickets_nh WHERE id = ?`, [parentId]);
    // @ts-ignore
    const parent = prow?.[0];
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    await conn.beginTransaction();

    const ticket_no = await generateTicketNo(conn);

    // Inherit/override fields
    const vehicle_reg_no = body.vehicle_reg_no ?? parent.vehicle_reg_no ?? "";
    const details = body.details ?? "";
    const phone = body.phone ?? parent.phone ?? "";
    const alt_phone = body.alt_phone ?? parent.alt_phone ?? null;
    const assigned_to = body.assigned_to ?? parent.assigned_to ?? null;
    const lead_received_from = body.lead_received_from ?? parent.lead_received_from ?? null;
    const lead_by = body.lead_by ?? parent.lead_by ?? null;
    const status = body.status ?? "open";
    const customer_name = body.customer_name ?? parent.customer_name ?? null;
    const comments = body.comments ?? null;

    const [r]: any = await conn.query(
      `INSERT INTO tickets_nh
        (ticket_no, vehicle_reg_no, subject, details, phone, alt_phone, assigned_to,
         lead_received_from, lead_by, status, customer_name, comments, parent_ticket_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        ticket_no,
        vehicle_reg_no,
        subject,
        details,
        phone,
        alt_phone,
        assigned_to,
        lead_received_from,
        lead_by,
        status,
        customer_name,
        comments,
        parentId,
      ]
    );

    const newId = Number(r.insertId);

    await conn.commit();
    return NextResponse.json({ ok: true, id: newId, ticket_no }, { status: 201 });
  } catch (e: any) {
    await conn.rollback();
    console.error("POST /api/tickets/[id]/children error:", e);
    return NextResponse.json({ error: e?.message ?? "Failed to create child ticket" }, { status: 500 });
  } finally {
    conn.release();
  }
}
