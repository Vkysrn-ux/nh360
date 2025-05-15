// app/api/agents/route.ts
import { pool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, address, commission_rate, role FROM users WHERE role = 'agent'"
    )
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
