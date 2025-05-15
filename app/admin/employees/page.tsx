"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Download, Edit, Eye, Plus, Search, Trash2, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getAdminSession } from "@/lib/actions/auth-actions"
import { getAllEmployees } from "@/lib/actions/admin-actions"
import type { Employee } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminEmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterRole, setFilterRole] = useState("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSessionAndLoadEmployees = async () => {
      const session = await getAdminSession()
      if (!session) {
        router.push("/admin/login")
        return
      }

      try {
        const employeeData = await getAllEmployees()
        setEmployees(employeeData)
      } catch (error) {
        console.error("Failed to fetch employees:", error)
        setError("Failed to load employee data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    checkSessionAndLoadEmployees()
  }, [router])

  const filteredEmployees = employees.filter((employee) => {
    // Search filter
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.phone.includes(searchQuery) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const matchesStatus = filterStatus === "all" || employee.status.toLowerCase() === filterStatus.toLowerCase()

    // Role filter
    const matchesRole = filterRole === "all" || employee.role.toLowerCase() === filterRole.toLowerCase()

    return matchesSearch && matchesStatus && matchesRole
  })

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(employees.map((employee) => employee.role)))

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-primary">Loading employees...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
            <p className="text-muted-foreground">Manage all employees in the system.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add New Employee
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Employee List</CardTitle>
            <CardDescription>View and manage all employees in the system.</CardDescription>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map((role) => (
                      <SelectItem key={role} value={role.toLowerCase()}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-muted-foreground">No employees found.</p>
                {(searchQuery || filterStatus !== "all" || filterRole !== "all") && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("")
                      setFilterStatus("all")
                      setFilterRole("all")
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joining Date</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell>{employee.role}</TableCell>
                        <TableCell>{new Date(employee.joiningDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={employee.status === "Active" ? "outline" : "secondary"}
                            className={
                              employee.status === "Active"
                                ? "bg-green-50 text-green-700 hover:bg-green-50"
                                : "bg-red-50 text-red-700 hover:bg-red-50"
                            }
                          >
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/admin/employees/${employee.id}`)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => alert("Edit Employee (not implemented)")}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => alert("Delete Employee (not implemented)")}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
