// app/api/agents/all/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    // Modify the roles below as needed
    const [rows] = await pool.query(`
      SELECT 
        u.id, u.name, u.role, u.phone, u.pincode, u.status,
        u.parent_user_id,
        p.name AS parent_name,
        p.role AS parent_role
      FROM users u
      LEFT JOIN users p ON u.parent_user_id = p.id
      WHERE u.role IN ('agent', 'toll-agent', 'team-leader', 'executive', 'shop', 'shop_owner')
      ORDER BY u.id DESC
    `);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
