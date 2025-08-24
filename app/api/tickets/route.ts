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
  // @ts-ignore - RowDataPacket
  const todayCount = rows?.[0]?.count || 0;
  const seq = String(todayCount + 1).padStart(3, "0");
  return `NH360-${todayStr}-${seq}`;
}

// GET:
// - default: ONLY parent tickets (sub-tickets excluded)
// - ?parent_id=### -> only that parent's sub-tickets
// - optional ?scope=all -> all tickets (parents + subs)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parent_id");
  const scope = searchParams.get("scope");

  try {
    if (parentId) {
      // Children of one parent
      const [rows] = await pool.query(
        `
        SELECT
          t.id, t.ticket_no, t.subject, t.status, t.details, t.assigned_to,
          t.created_at, t.updated_at
        FROM tickets_nh t
        WHERE t.parent_ticket_id = ?
        ORDER BY t.created_at DESC
        `,
        [parentId]
      );
      return NextResponse.json(rows || []);
    }

    if (scope === "all") {
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
    }

    // ROOTS ONLY (keep subs out of the main list)
    const [rows] = await pool.query(`
      SELECT
        t.*,
        CASE
          WHEN t.lead_received_from = 'Shop' AND u.role = 'shop' THEN u.name
          ELSE NULL
        END AS shop_name,
        COALESCE(s.cnt, 0) AS subs_count
      FROM tickets_nh t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN (
        SELECT parent_ticket_id, COUNT(*) AS cnt
        FROM tickets_nh
        WHERE parent_ticket_id IS NOT NULL
        GROUP BY parent_ticket_id
      ) s ON s.parent_ticket_id = t.id
      WHERE t.parent_ticket_id IS NULL
      ORDER BY t.created_at DESC
    `);
    return NextResponse.json(rows || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST:
// 1) Create a single SUB-TICKET if body has parent_ticket_id.
// 2) Otherwise create a PARENT ticket (and optional sub_issues[]).
export async function POST(req: NextRequest) {
  const data = await req.json();

  const {
    // shared fields
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

    // for single sub-ticket creation
    parent_ticket_id,

    // for parent + many children creation
    sub_issues = [],
  } = data || {};

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // --- CASE A: create only a sub-ticket (no new parent) ---
    if (parent_ticket_id) {
      const childTicketNo = await generateTicketNo(conn);

      if (!subject || !String(subject).trim()) {
        throw new Error("Subject is required for sub-ticket");
      }

      const [r]: any = await conn.query(
        `INSERT INTO tickets_nh
          (ticket_no, vehicle_reg_no, subject, details, phone, alt_phone, assigned_to,
           lead_received_from, lead_by, status, customer_name, comments,
           parent_ticket_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          childTicketNo,
          vehicle_reg_no ?? "",
          subject,
          details ?? "",
          phone ?? "",
          alt_phone ?? null,
          assigned_to ?? null,
          lead_received_from ?? null,
          lead_by ?? null,
          status ?? "open",
          customer_name ?? null,
          comments ?? null,
          parent_ticket_id,
        ]
      );

      await conn.commit();
      return NextResponse.json({
        ok: true,
        mode: "sub_only",
        parent_id: parent_ticket_id,
        child_id: r.insertId,
        child_ticket_no: childTicketNo,
      });
    }

    // --- CASE B: create parent (+ optional batch of sub_issues) ---
    const ticket_no_parent = await generateTicketNo(conn);
    const [r1]: any = await conn.query(
      `INSERT INTO tickets_nh
        (ticket_no, vehicle_reg_no, subject, details, phone, alt_phone, assigned_to,
         lead_received_from, lead_by, status, customer_name, comments,
         parent_ticket_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())`,
      [
        ticket_no_parent,
        vehicle_reg_no ?? "",
        subject ?? "",
        details ?? "",
        phone ?? "",
        alt_phone ?? null,
        assigned_to ?? null,
        lead_received_from ?? null,
        lead_by ?? null,
        status ?? "open",
        customer_name ?? null,
        comments ?? null,
      ]
    );
    const parentId = r1.insertId as number;

    let childrenCreated = 0;
    if (Array.isArray(sub_issues) && sub_issues.length > 0) {
      for (const row of sub_issues) {
        const c_subject = row.subject;
        if (!c_subject || !String(c_subject).trim()) continue;

        const childTicketNo = await generateTicketNo(conn);

        await conn.query(
          `INSERT INTO tickets_nh
            (ticket_no, vehicle_reg_no, subject, details, phone, alt_phone, assigned_to,
             lead_received_from, lead_by, status, customer_name, comments,
             parent_ticket_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            childTicketNo,
            row.vehicle_reg_no ?? vehicle_reg_no ?? "",
            c_subject,
            row.details ?? "",
            row.phone ?? phone ?? "",
            row.alt_phone ?? alt_phone ?? null,
            row.assigned_to ?? assigned_to ?? null,
            row.lead_received_from ?? lead_received_from ?? null,
            row.lead_by ?? lead_by ?? null,
            row.status ?? "open",
            row.customer_name ?? customer_name ?? null,
            row.comments ?? null,
            parentId,
          ]
        );
        childrenCreated++;
      }
    }

    await conn.commit();
    return NextResponse.json({
      ok: true,
      mode: "parent_with_optional_subs",
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

// PATCH: update selected fields
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
