"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, Edit, Eye, Plus, Search, Trash2, Upload, Repeat2 } from "lucide-react";
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

  // Modal/dashboard state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDetails, setAgentDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Filtered list logic
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.email ? agent.email.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      agent.phone.includes(searchQuery) ||
      agent.pincode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || (agent.status || "Active").toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Handle row click: load agent details for modal/dashboard
  const handleRowClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setLoadingDetails(true);
    setAgentDetails(null);
    fetch(`/api/agents/${agent.id}/details`)
      .then(res => res.json())
      .then(data => setAgentDetails(data))
      .finally(() => setLoadingDetails(false));
  };

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
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push("/admin/fastags/transfer")}
            >
              <Repeat2 className="mr-2 h-4 w-4" />
              Transfer FASTags
            </Button>
{/*            <Button variant="outline" className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>*/}
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
                      <TableHead>Phone</TableHead>
                      <TableHead>Pincode</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Total FASTags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow
                        key={agent.id}
                        className="cursor-pointer hover:bg-blue-50"
                        onClick={() => handleRowClick(agent)}
                      >
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell>{agent.phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{agent.pincode}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              (agent.status || "Active").toLowerCase() === "active"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }
                          >
                            {(agent.status || "Active").charAt(0).toUpperCase() +
                              (agent.status || "Active").slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{agent.fastags_available}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/admin/agents/${agent.id}`); }} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); alert("Edit Agent (not implemented)"); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); alert("Delete Agent (not implemented)"); }}>
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
        {/* Agent Modal/Dashboard */}
        {selectedAgent && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full relative">
              <button
                onClick={() => {
                  setSelectedAgent(null);
                  setAgentDetails(null);
                }}
                className="absolute top-3 right-4 text-2xl"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold mb-4">Agent: {selectedAgent.name}</h2>
              {loadingDetails ? (
                <div>Loading details...</div>
              ) : agentDetails ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <b>Total FASTags handled:</b> {agentDetails.total_fastags}
                    </div>
                    <div>
                      <b>Currently Available:</b> {agentDetails.available_fastags}
                    </div>
                    <div>
                      <b>Sold FASTags:</b> {agentDetails.sold_fastags}
                    </div>
                    <div>
                      <b>Reassigned to Others:</b> {agentDetails.reassigned_fastags}
                    </div>
                  </div>
                  <div className="overflow-auto max-h-96">
                    <h3 className="font-semibold mb-2">FASTag Serial Details</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Date Assigned</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Current Holder</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(agentDetails.fastag_serials) && agentDetails.fastag_serials.length > 0 ? (
                          agentDetails.fastag_serials.map((tag: any) => (
                            <TableRow key={tag.tag_serial}>
                              <TableCell>{tag.tag_serial}</TableCell>
                              <TableCell>
                                {tag.assigned_date
                                  ? new Date(tag.assigned_date).toLocaleString()
                                  : '-'}
                              </TableCell>
                              <TableCell>{tag.status}</TableCell>
                              <TableCell>{tag.current_holder || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No FASTags found for this agent.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div>No details found for agent.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
