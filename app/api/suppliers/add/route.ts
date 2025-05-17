// app/api/suppliers/add/route.ts
import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { name, contact_person, email, phone, address } = await req.json()

    if (!name || !contact_person) {
      return NextResponse.json({ error: "Name and contact person are required" }, { status: 400 })
    }

    await pool.query(
      "INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)",
      [name, contact_person, email, phone, address]
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
