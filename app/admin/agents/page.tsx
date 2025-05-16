"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, Edit, Eye, Plus, Search, Trash2, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAdminSession } from "@/lib/actions/auth-actions";
import type { Agent } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RegisterAgentForm from "@/components/admin/registeragentform";

export default function AdminAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const checkSessionAndLoadAgents = async () => {
      const session = await getAdminSession();
      if (!session) {
        router.push("/admin/login");
        return;
      }

      try {
        const res = await fetch("/api/agents");
        const agentData = await res.json();
        setAgents(agentData);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        setError("Failed to load agent data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    checkSessionAndLoadAgents();
  }, [router]);

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.phone.includes(searchQuery) ||
      agent.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || (agent.status || "Active").toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-primary">Loading agents...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
            <p className="text-muted-foreground">Manage all agents in the system.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="w-full sm:w-auto" onClick={() => setShowAddForm((prev) => !prev)}>
              <Plus className="mr-2 h-4 w-4" />
              {showAddForm ? "Close Form" : "Add New Agent"}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Register New Agent</CardTitle>
              <CardDescription>Fill in the details to add a new agent.</CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterAgentForm />
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Agent List</CardTitle>
            <CardDescription>View and manage all agents in the system.</CardDescription>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
            {filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-muted-foreground">No agents found.</p>
                {(searchQuery || filterStatus !== "all") && (
                  <Button variant="link" onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                  }}>
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
                      <TableHead>Address</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell>{agent.email}</TableCell>
                        <TableCell>{agent.phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{agent.address}</TableCell>
                        <TableCell>{agent.commission_rate}%</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={(agent.status || "Active") === "Active" ? "outline" : "secondary"}
                            className={
                              (agent.status || "Active") === "Active"
                                ? "bg-green-50 text-green-700 hover:bg-green-50"
                                : "bg-red-50 text-red-700 hover:bg-red-50"
                            }
                          >
                            {agent.status || "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/agents/${agent.id}`)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => alert("Edit Agent (not implemented)")}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => alert("Delete Agent (not implemented)")}>
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
  );
}
