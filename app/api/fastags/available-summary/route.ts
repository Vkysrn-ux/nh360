import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const [rows] = await pool.query(
    "SELECT bank_name, fastag_class, COUNT(*) as available FROM fastags WHERE status='in_stock' GROUP BY bank_name, fastag_class"
  );
  return NextResponse.json(rows);
}
