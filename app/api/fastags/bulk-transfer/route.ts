// app/api/fastags/bulk-transfer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const transfers = await req.json();

  try {
    for (const row of transfers) {
      // Validate agentId and serials
      if (!row.agentId || isNaN(Number(row.agentId))) {
        return NextResponse.json(
          { error: "Agent is required and must be a valid number." },
          { status: 400 }
        );
      }
      if (!row.serials || !Array.isArray(row.serials) || row.serials.length === 0) {
        return NextResponse.json(
          { error: "Serial numbers are required for transfer." },
          { status: 400 }
        );
      }

      // Update only the selected serial numbers for assignment
      await pool.query(
        `UPDATE fastags SET assigned_to=?, status='assigned', assigned_at=NOW()
         WHERE tag_serial IN (${row.serials.map(() => '?').join(",")})`,
        [Number(row.agentId), ...row.serials]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
