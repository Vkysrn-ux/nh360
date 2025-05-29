import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, pincode, role, parent_user_id } = body;

    // Validate required fields
    if (!name || !phone || !pincode || !role) {
      return NextResponse.json(
        { error: "Name, Phone, Pincode, and Role are required." },
        { status: 400 }
      );
    }

    // Always save parent_user_id (null if not provided)
    const query = `
      INSERT INTO users (name, phone, pincode, role, parent_user_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [name, phone, pincode, role, parent_user_id ?? null];

    const [result] = await pool.query(query, params);

    return NextResponse.json({ success: true, userId: (result as any).insertId });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Phone or Pincode already exists" }, { status: 409 });
    }
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
