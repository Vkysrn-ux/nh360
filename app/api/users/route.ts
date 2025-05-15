// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const [rows] = await pool.query('SELECT * FROM users')
    return NextResponse.json(rows)
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
