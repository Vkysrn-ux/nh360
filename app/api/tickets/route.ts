// app/api/tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolConnection } from "mysql2/promise";

// --- utility: make a ticket_no like NH360-YYYYMMDD-###, inside a txn ---
async function generateTicketNo(conn: PoolConnection): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}${mm}${dd}`;

  const [rows] = await conn.query(
    "SELECT COUNT(*) AS count FROM tickets_nh WHERE DATE(created_at) = CURDATE()"
  );
  // rows is RowDataPacket[]; TypeScript relax:
  // @ts-ignore
  const todayCount = rows?.[0]?.count || 0;
  const seq = String(todayCount + 1).padStart(3, "0");
  return `NH360-${todayStr}-${seq}`;
}

// GET: list all tickets (unchanged in spirit)
export async function GET(_req: NextRequest) {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.*,
        CASE
          WHEN t.lead_received_from = 'Shop' AND u.role = 'shop' THEN u.name
          ELSE NULL
        END AS shop_name
      FROM tickets_nh t
      LEFT JOIN users u ON t.assigned_to = u.id
      ORDER BY t.created_at DESC
    `);
    return NextResponse.json(rows || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: create a parent ticket, and optional sub-tickets in one request
// Body: { ...parentFields, sub_issues?: Array<{ subject, details, ...overrides }> }
export async function POST(req: NextRequest) {
  const data = await req.json();

  const {
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
    sub_issues = [], // Array of partial ticket fields { subject, details, ... }
  } = data || {};

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Insert parent
    const ticket_no_parent = await generateTicketNo(conn);
    const [r1] = await conn.query(
      `INSERT INTO tickets_nh
        (ticket_no, vehicle_reg_no, subject, details, phone, alt_phone, assigned_to,
         lead_received_from, lead_by, status, customer_name, comments, parent_ticket_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())`,
      [
        ticket_no_parent,
        vehicle_reg_no,
        subject,
        details,
        phone,
        alt_phone ?? null,
        assigned_to ?? null,
        lead_received_from ?? null,
        lead_by ?? null,
        status ?? "open",
        customer_name ?? null,
        comments ?? null,
      ]
    );
    // @ts-ignore
    const parentId = r1.insertId as number;

    // 2) Insert children (each a full ticket pointing to parent)
    let childrenCreated = 0;

    if (Array.isArray(sub_issues) && sub_issues.length > 0) {
      for (const row of sub_issues) {
        const childTicketNo = await generateTicketNo(conn);

        // Inherit fallbacks from parent if not explicitly set
        const c_subject = row.subject;
        if (!c_subject || !String(c_subject).trim()) continue; // subject is the only strict req

        const c_details = row.details ?? "";
        const c_vehicle_reg_no = row.vehicle_reg_no ?? vehicle_reg_no ?? "";
        const c_phone = row.phone ?? phone ?? "";
        const c_alt_phone = row.alt_phone ?? alt_phone ?? null;
        const c_assigned_to = row.assigned_to ?? assigned_to ?? null;
        const c_lead_received_from = row.lead_received_from ?? lead_received_from ?? null;
        const c_lead_by = row.lead_by ?? lead_by ?? null;
        const c_status = row.status ?? "open";
        const c_customer_name = row.customer_name ?? customer_name ?? null;
        const c_comments = row.comments ?? null;

        await conn.query(
          `INSERT INTO tickets_nh
            (ticket_no, vehicle_reg_no, subject, details, phone, alt_phone, assigned_to,
             lead_received_from, lead_by, status, customer_name, comments, parent_ticket_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            childTicketNo,
            c_vehicle_reg_no,
            c_subject,
            c_details,
            c_phone,
            c_alt_phone,
            c_assigned_to,
            c_lead_received_from,
            c_lead_by,
            c_status,
            c_customer_name,
            c_comments,
            parentId,
          ]
        );
        childrenCreated++;
      }
    }

    await conn.commit();
    return NextResponse.json({
      ok: true,
      parent_id: parentId,
      parent_ticket_no: ticket_no_parent,
      children_created: childrenCreated,
    });
  } catch (e: any) {
    await conn.rollback();
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    conn.release();
  }
}

// PATCH: Edit/Update selected fields on a ticket (kept from your version)
export async function PATCH(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

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

    values.push(data.id);

    const [result]: any = await pool.query(
      `UPDATE tickets_nh SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return NextResponse.json({
      message: "Ticket updated",
      changedRows: result.changedRows ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
