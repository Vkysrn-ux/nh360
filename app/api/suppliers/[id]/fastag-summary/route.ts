// app/api/suppliers/[id]/fastag-summary/route.ts
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id: supplierId } = await params;

  try {
    // Summary
    const [summary] = await pool.query(`
      SELECT
        COUNT(*) AS total_fastags,
        SUM(status = 'in_stock') AS available_with_admin,
        SUM(status = 'assigned') AS assigned_to_agent,
        SUM(status = 'sold') AS sold_total
      FROM fastags
      WHERE supplier_id = ?
    `, [supplierId]);

    // List
    const [list] = await pool.query(`
      SELECT
        f.id,        
        f.tag_serial,
        f.bank_name,
        f.fastag_class,
        f.batch_number,
        f.purchase_date,
        f.status,
        f.assigned_to_agent_id,
        agent.name AS assigned_to_agent_name,
        f.sold_by_user_id,
        seller.name AS sold_by_name,
        f.sold_price
      FROM fastags f
      LEFT JOIN users agent ON f.assigned_to_agent_id = agent.id
      LEFT JOIN users seller ON f.sold_by_user_id = seller.id
      WHERE f.supplier_id = ?
      ORDER BY f.purchase_date DESC
    `, [supplierId]);

    return new Response(JSON.stringify({ summary: summary[0], fastags: list }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}