import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const [agents] = await pool.query(`
      SELECT 
        u.id, u.name, u.phone, u.pincode, u.status,
        (
          SELECT COUNT(*) 
          FROM fastags f 
          WHERE f.assigned_to = u.id AND f.status = 'assigned'
        ) AS fastags_available
      FROM users u
      WHERE u.role = 'agent'
    `);
    return NextResponse.json(agents);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}
