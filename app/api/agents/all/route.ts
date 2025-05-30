import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Check for ?roles=asm,manager,tl in the query string
    const { searchParams } = new URL(req.url);
    const rolesParam = searchParams.get("roles");

    let whereClause = "";
    let params: string[] = [];

    if (rolesParam) {
      // e.g. rolesParam = "asm,manager,tl"
      const roles = rolesParam.split(",").map(r => r.trim()).filter(Boolean);
      if (roles.length) {
        whereClause = `WHERE u.role IN (${roles.map(() => "?").join(",")})`;
        params = roles;
      }
    }

    const [rows] = await pool.query(
      `
      SELECT 
        u.id, u.name, u.role, u.phone, u.pincode, u.status,
        u.parent_user_id,
        p.name AS parent_name,
        p.role AS parent_role
      FROM users u
      LEFT JOIN users p ON u.parent_user_id = p.id
      ${whereClause}
      ORDER BY u.id DESC
      `,
      params
    );
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
