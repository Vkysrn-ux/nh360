import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, address, password, commission_rate } = body

    if (!name || !email || !phone || !address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password || "123456", 10)

    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, address, password, role, commission_rate)
       VALUES (?, ?, ?, ?, ?, 'agent', ?)`,
      [name, email, phone, address, hashedPassword, commission_rate || 10]
    )

    return NextResponse.json({ success: true, userId: (result as any).insertId })
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    console.error("Registration failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
