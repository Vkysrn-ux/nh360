// app/api/fastags/available/route.ts
import { pool } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bank = searchParams.get("bank");
  const fastagClass = searchParams.get("class");

  if (!bank || !fastagClass) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const [rows] = await pool.query(
      "SELECT tag_serial FROM fastags WHERE bank_name = ? AND fastag_class = ? AND status = 'in_stock' ORDER BY tag_serial ASC",
      [bank, fastagClass]
    );
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
