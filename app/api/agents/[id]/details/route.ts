import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;      // ✅ No await here!
  const agentId = params.id;

  try {
    // 1. Total FASTags currently assigned to this agent
    const [totalRows] = await pool.query(
      "SELECT COUNT(*) as cnt FROM fastags WHERE assigned_to = ?", [agentId]
    );
    // 2. Available FASTags (status = 'assigned')
    const [availRows] = await pool.query(
      "SELECT COUNT(*) as cnt FROM fastags WHERE assigned_to = ? AND status = 'assigned'", [agentId]
    );
    // 3. Sold FASTags
    const [soldRows] = await pool.query(
      "SELECT COUNT(*) as cnt FROM fastags WHERE assigned_to = ? AND status = 'sold'", [agentId]
    );
    // 4. Reassigned FASTags (set to 0, or implement if possible)
    const reassignedCount = 0;
    // 5. List all FASTags for this agent
    const [serialRows] = await pool.query(
      `SELECT 
          tag_serial, assigned_date, status, 
          (SELECT name FROM users WHERE id = f.assigned_to) as current_holder
       FROM fastags f
       WHERE f.assigned_to = ?
       ORDER BY assigned_date DESC`, [agentId]
    );

    return NextResponse.json({
      total_fastags: totalRows[0].cnt,
      available_fastags: availRows[0].cnt,
      sold_fastags: soldRows[0].cnt,
      reassigned_fastags: reassignedCount,
      fastag_serials: serialRows || []
    });
  } catch (err) {
    console.error("Agent details API failed", err);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}
