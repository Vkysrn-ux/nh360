'use server'

import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function loginUserServer(email: string, password: string) {
  const cookieStore = await cookies()

  if (!email || !password) {
    return { success: false, message: "Email and password are required." }
  }

  email = email.toLowerCase()

  try {
    // Admin
    const [admins]: any = await db.query("SELECT * FROM employees WHERE email = ? AND role = 'admin' LIMIT 1", [email])
    if (admins.length && await bcrypt.compare(password, admins[0].password_hash)) {
      await cookieStore.set("user-session", JSON.stringify({
        id: admins[0].id,
        name: admins[0].name,
        email,
        role: admins[0].role,
        userType: "admin"
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/"
      })

      console.log("✅ Session Set for:", { id: admins[0].id, email, userType: "admin" })
      return { success: true, userType: "admin" }
    }

    // Agent
    const [agents]: any = await db.query("SELECT * FROM agents WHERE email = ? LIMIT 1", [email])
    if (agents.length && await bcrypt.compare(password, agents[0].password_hash)) {
      await cookieStore.set("user-session", JSON.stringify({
        id: agents[0].id,
        name: agents[0].name,
        email,
        userType: "agent"
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/"
      })

      return { success: true, userType: "agent" }
    }

    // Employee (non-admin)
    const [employees]: any = await db.query("SELECT * FROM employees WHERE email = ? AND role != 'admin' LIMIT 1", [email])
    if (employees.length && await bcrypt.compare(password, employees[0].password_hash)) {
      await cookieStore.set("user-session", JSON.stringify({
        id: employees[0].id,
        name: employees[0].name,
        email,
        role: employees[0].role,
        userType: "employee"
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/"
      })

      return { success: true, userType: "employee" }
    }

    // User
    const [users]: any = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email])
    if (users.length && await bcrypt.compare(password, users[0].password_hash)) {
      await cookieStore.set("user-session", JSON.stringify({
        id: users[0].id,
        name: users[0].name,
        email,
        userType: "user"
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/"
      })

      return { success: true, userType: "user" }
    }

    return { success: false, message: "Invalid email or password." }

  } catch (error) {
    console.error("Login error:", error)
    return { success: false, message: "Server error. Please try again later." }
  }
}