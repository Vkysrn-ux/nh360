import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      name, phone, pincode, role,
      parent_user_id, area, bank_ids
    } = body;

    name = (name ?? "").trim();
    phone = (phone ?? "").trim();
    pincode = (pincode ?? "").trim();
    role = (role ?? "").trim();
    area = (area ?? "").trim();

    if (!name || !role) {
      return NextResponse.json(
        { error: "Name and Role are required." },
        { status: 400 }
      );
    }
    if (!/^\d{10,15}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }
    if (!/^\d{4,10}$/.test(pincode)) {
      return NextResponse.json({ error: "Invalid pincode." }, { status: 400 });
    }

    let query: string;
    let params: any[];

    if (role === "asm") {
      if (!area) {
        return NextResponse.json({ error: "Area is required for ASM." }, { status: 400 });
      }
      query = `
        INSERT INTO users (name, phone, pincode, role, area, parent_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      params = [name, phone, pincode, role, area, parent_user_id ?? null];
    } else {
      query = `
        INSERT INTO users (name, phone, pincode, role, parent_user_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      params = [name, phone, pincode, role, parent_user_id ?? null];
    }

    const [result] = await pool.query(query, params);
    const userId = (result as any).insertId;

    // Insert bank_ids for toll agent
    if (role === "toll-agent" && Array.isArray(bank_ids) && bank_ids.length > 0) {
      for (const entry of bank_ids) {
        const { bank_name, bank_reference_id } = entry;
        if (!bank_name || !bank_reference_id) continue;
        await pool.query(
          "INSERT INTO agent_bank_ids (agent_id, bank_name, bank_reference_id) VALUES (?, ?, ?)",
          [userId, bank_name, bank_reference_id]
        );
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Phone or Pincode already exists" },
        { status: 409 }
      );
    }
    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
