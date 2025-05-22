import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, pincode } = body;

    // Check for required fields
    if (!name || !phone || !pincode) {
      return NextResponse.json({ error: "Name, Phone, and Pincode are required." }, { status: 400 });
    }

    // Insert new agent as user with role 'agent'
    const [result] = await pool.query(
      `INSERT INTO users (name, phone, pincode, role) VALUES (?, ?, ?, 'agent')`,
      [name, phone, pincode]
    );

    return NextResponse.json({ success: true, userId: (result as any).insertId });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Phone or Pincode already exists" }, { status: 409 });
    }
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
