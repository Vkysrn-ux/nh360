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

    // Insert user with all nullable/optional fields
    const query = `
      INSERT INTO users (name, phone, pincode, role, area, parent_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      name || null,
      phone || null,
      pincode || null,
      role || null,
      area || null,
      parent_user_id ?? null,
    ];

    const [result] = await pool.query(query, params);
    const userId = (result as any).insertId;

    // Insert bank_ids (only if valid entries)
    if (Array.isArray(bank_ids) && bank_ids.length > 0) {
      for (const entry of bank_ids) {
  const bankName = (entry.bank_name ?? "").trim();
  const refId = (entry.bank_reference_id ?? "").trim();

  if (!bankName || !refId) continue;

  await pool.query(
    "INSERT INTO agent_bank_ids (agent_id, bank_name, bank_reference_id) VALUES (?, ?, ?)",
    [userId, bankName, refId]
  );
}

    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Duplicate entry (Phone or other unique field already exists)." },
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
