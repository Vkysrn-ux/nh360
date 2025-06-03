import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest, { params }) {
  try {
    const ticket_id = params.id;
    const { status, details, comment, updated_by } = await req.json();

    // Update the main ticket
    await pool.query(
      `UPDATE tickets_nh
       SET status=?, details=?, updated_at=NOW(), updated_by=?
       WHERE id=?`,
      [status, details, updated_by, ticket_id]
    );

    // Insert the comment into ticket_comments
    await pool.query(
      `INSERT INTO ticket_comments (ticket_id, comment, status, updated_by)
       VALUES (?, ?, ?, ?)`,
      [ticket_id, comment, status, updated_by]
    );

    return NextResponse.json({ message: "Ticket updated & comment added." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
