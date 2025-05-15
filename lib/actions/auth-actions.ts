"use server"

import { cookies } from "next/headers"

// Mock agent data
const mockAgents = [
  {
    id: "agent-1",
    email: "agent@example.com",
    password: "password123", // In a real app, this would be hashed
    name: "John Doe",
    phone: "9876543210",
    address: "123 Agent Street, Delhi",
    status: "Active",
    commissionRate: 10,
  },
]

// Mock admin data
const mockAdmins = [
  {
    id: "admin-1",
    email: "admin@nh360fastag.com",
    password: "admin123", // In a real app, this would be hashed
    name: "Admin User",
    role: "Super Admin",
  },
]

// Mock employee data
const mockEmployees = [
  {
    id: "emp-1",
    email: "employee@nh360fastag.com",
    password: "employee123", // In a real app, this would be hashed
    name: "Employee User",
    phone: "8765432109",
    role: "Sales Executive",
    status: "Active",
  },
]

// Mock user data
const mockUsers = [
  {
    id: "user-1",
    email: "user@example.com",
    password: "user123", // In a real app, this would be hashed
    name: "Regular User",
    phone: "7654321098",
    vehicleNumber: "DL01AB1234",
    status: "Active",
  },
]

// Unified login function
export async function loginUser(email: string, password: string) {
  // Simulate a delay for API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Check admin credentials
  const admin = mockAdmins.find((a) => a.email === email)
  if (admin && admin.password === password) {
    const cookieStore = cookies()
    cookieStore.set(
      "user-session",
      JSON.stringify({ id: admin.id, name: admin.name, email: admin.email, role: admin.role, userType: "admin" }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      },
    )
    return { success: true, userType: "admin" }
  }

  // Check agent credentials
  const agent = mockAgents.find((a) => a.email === email)
  if (agent && agent.password === password) {
    const cookieStore = cookies()
    cookieStore.set(
      "user-session",
      JSON.stringify({ id: agent.id, name: agent.name, email: agent.email, userType: "agent" }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      },
    )
    return { success: true, userType: "agent" }
  }

  // Check employee credentials
  const employee = mockEmployees.find((e) => e.email === email)
  if (employee && employee.password === password) {
    const cookieStore = cookies()
    cookieStore.set(
      "user-session",
      JSON.stringify({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        userType: "employee",
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      },
    )
    return { success: true, userType: "employee" }
  }

  // Check user credentials
  const user = mockUsers.find((u) => u.email === email)
  if (user && user.password === password) {
    const cookieStore = cookies()
    cookieStore.set(
      "user-session",
      JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        vehicleNumber: user.vehicleNumber,
        userType: "user",
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      },
    )
    return { success: true, userType: "user" }
  }

  // No matching user found
  return { success: false, message: "Invalid email or password" }
}

export async function logoutUser() {
  const cookieStore = cookies()
  cookieStore.delete("user-session")
  return { success: true }
}

export async function getUserSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("user-session")

  if (!sessionCookie) {
    return null
  }

  try {
    return JSON.parse(sessionCookie.value)
  } catch (error) {
    return null
  }
}

// Legacy functions for backward compatibility
export async function loginAgent(email: string, password: string) {
  const result = await loginUser(email, password)
  if (result.success && result.userType === "agent") {
    return { success: true, agent: { id: "agent-1", name: "John Doe", email: email } }
  }
  return { success: false, message: "Invalid agent credentials" }
}

export async function loginAdmin(email: string, password: string) {
  const result = await loginUser(email, password)
  if (result.success && result.userType === "admin") {
    return { success: true, admin: { id: "admin-1", name: "Admin User", email: email, role: "Super Admin" } }
  }
  return { success: false, message: "Invalid admin credentials" }
}

export async function loginEmployee(email: string, password: string) {
  const result = await loginUser(email, password)
  if (result.success && result.userType === "employee") {
    return {
      success: true,
      employee: { id: "emp-1", name: "Employee User", email: email, role: "Sales Executive" },
    }
  }
  return { success: false, message: "Invalid employee credentials" }
}

export async function logoutAgent() {
  return logoutUser()
}

export async function logoutAdmin() {
  return logoutUser()
}

export async function logoutEmployee() {
  return logoutUser()
}

export async function getAgentSession() {
  const session = await getUserSession()
  return session?.userType === "agent" ? session : null
}

export async function getAdminSession() {
  const session = await getUserSession()
  return session?.userType === "admin" ? session : null
}

export async function getEmployeeSession() {
  const session = await getUserSession()
  return session?.userType === "employee" ? session : null
}
