import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET: Fetch all tickets
export async function GET(req: NextRequest) {
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


// POST: Create a new ticket
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 1. Get today's date in YYYYMMDD
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}${mm}${dd}`;

    // 2. Count tickets created today
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS count FROM tickets_nh WHERE DATE(created_at) = CURDATE()"
    );
    const todayCount = rows[0].count || 0;
    const seq = (todayCount + 1).toString().padStart(3, "0");

    // 3. Compose ticket_no
    const ticket_no = `NH360-${todayStr}-${seq}`;

    // 4. Insert into tickets_nh
    const [result] = await pool.query(
      `INSERT INTO tickets_nh 
        (ticket_no, vehicle_reg_no, subject, details, phone, alt_phone, assigned_to, lead_received_from, lead_by, status, customer_name, comments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        ticket_no,
        data.vehicle_reg_no,
        data.subject,
        data.details,
        data.phone,
        data.alt_phone,
        data.assigned_to,
        data.lead_received_from,
        data.lead_by,
        data.status,
        data.customer_name,
        data.comments,
      ]
    );

    return NextResponse.json({ id: result.insertId, ticket_no, message: 'Ticket added to tickets_nh table.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: Edit/Update a ticket
export async function PATCH(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    // Allow these fields to be updated
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
      "comments"
    ];

    const updates = [];
    const values = [];
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

    const [result] = await pool.query(
      `UPDATE tickets_nh SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return NextResponse.json({ message: "Ticket updated", changedRows: result.changedRows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
