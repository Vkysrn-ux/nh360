import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { agentId, count } = await req.json()

    if (!agentId || !count) {
      return NextResponse.json({ error: "Missing agentId or count" }, { status: 400 })
    }

    const [result] = await pool.query(
      `UPDATE fastags
       SET status = 'assigned',
           assigned_to = ?,
           assigned_at = NOW()
       WHERE status = 'available'
       LIMIT ?`,
      [agentId, count]
    )

    return NextResponse.json({ success: true, assigned: (result as any).affectedRows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
