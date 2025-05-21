// app/api/fastags/bulk-transfer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { transfers } = await req.json();

  try {
    for (const row of transfers) {
      // Update available FASTags (in_stock) by bank/class, limited by quantity
      const [tags] = await pool.query(
        `SELECT id FROM fastags WHERE bank_name=? AND fastag_class=? AND status='in_stock' LIMIT ?`,
        [row.bank_name, row.fastag_class, Number(row.quantity)]
      );
      if (!tags.length || tags.length < row.quantity) {
        return NextResponse.json({ error: `Not enough tags for ${row.bank_name} ${row.fastag_class}` }, { status: 400 });
      }
      const tagIds = tags.map(t => t.id);
      // Mark as assigned
      await pool.query(
        `UPDATE fastags SET assigned_to=?, status='assigned', assigned_at=NOW() WHERE id IN (${tagIds.map(() => '?').join(",")})`,
        [row.agent_id, ...tagIds]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
