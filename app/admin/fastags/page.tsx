// app/admin/fastags/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Download, Search, Edit, Trash2 } from "lucide-react";
import AddFastagItemForm from "@/components/admin/AddFastagItemForm";
import BulkFastagUploadForm from "@/components/BulkFastagUploadForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


export default function AdminFastagsPage() {
  const router = useRouter();
  const [fastags, setFastags] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [filterBank, setFilterBank] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedFastag, setSelectedFastag] = useState<any | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentNameFilter, setAgentNameFilter] = useState("all");


  const loadFastags = async () => {
  const res = await fetch("/api/fastags/all");
  const data = await res.json();
  console.log("FASTags response:", data);

  // Safe: handle both common shapes
  let fastagArr = [];
  if (Array.isArray(data)) fastagArr = data;
  else if (Array.isArray(data.fastags)) fastagArr = data.fastags;
  else fastagArr = [];
  setFastags(fastagArr);
};


  useEffect(() => {
  const fetchAgents = async () => {
    const res = await fetch("/api/agents");
    const data = await res.json();
    setAgents(Array.isArray(data) ? data : []);
  };
  fetchAgents();
  loadFastags();
}, []);


  const filtered = fastags.filter((fastag) => {
  const matchesSearch =
    fastag.tag_serial?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fastag.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fastag.fastag_class?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fastag.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fastag.assigned_to?.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesBank = filterBank === "all" || fastag.bank_name === filterBank;
  const matchesType = filterType === "all" || fastag.fastag_class === filterType;
  const matchesStatus =
    filterStatus === "all" ||
    (filterStatus === "assigned" && fastag.assigned_to) ||
    (filterStatus === "unassigned" && !fastag.assigned_to);

  // Fix: agent name filter
  const matchesAgent =
    agentNameFilter === "all" ||
    (
      fastag.agent_name &&
      fastag.agent_name.trim().toLowerCase() === agentNameFilter.trim().toLowerCase()
    );

  return matchesSearch && matchesBank && matchesType && matchesStatus && matchesAgent;
});


  const uniqueBanks = Array.from(new Set(fastags.map((f) => f.bank_name))).filter(Boolean);
  const uniqueTypes = Array.from(new Set(fastags.map((f) => f.fastag_class))).filter(Boolean);
  const uniqueAgentNames = Array.from(new Set(agents.map(a => a.name))).filter(Boolean);

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FASTag Management</h1>
            <p className="text-muted-foreground">Manage all FASTags in the system.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => {
              setShowAddForm((prev) => !prev);
              setShowBulkForm(false);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              {showAddForm ? "Close Add Form" : "Add FASTag"}
            </Button>
            <Button variant="outline" onClick={() => {
              setShowBulkForm((prev) => !prev);
              setShowAddForm(false);
            }}>
              <Upload className="mr-2 h-4 w-4" />
              {showBulkForm ? "Close Bulk Form" : "Bulk Add"}
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New FASTag</CardTitle>
              <CardDescription>Enter the details of the new FASTag below.</CardDescription>
            </CardHeader>
            <CardContent>
              <AddFastagItemForm />
            </CardContent>
          </Card>
        )}

        {showBulkForm && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload FASTags</CardTitle>
              <CardDescription>Enter a range of FASTag serials and batch info.</CardDescription>
            </CardHeader>
            <CardContent>
              <BulkFastagUploadForm />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>FASTag Inventory</CardTitle>
            <CardDescription>View and manage all FASTags in the system.</CardDescription>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search FASTags..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Select value={filterBank} onValueChange={setFilterBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Banks</SelectItem>
                    {uniqueBanks.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={agentNameFilter} onValueChange={setAgentNameFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {uniqueAgentNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
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
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">No FASTags found.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Batch Number</TableHead>
                      {/*<TableHead>Price (₹)</TableHead>*/}
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell>{tag.tag_serial}</TableCell>
                        <TableCell>{tag.bank_name}</TableCell>
                        <TableCell>{tag.fastag_class}</TableCell>
                        <TableCell>{tag.batch_number}</TableCell>
                        {/*<TableCell>{tag.purchase_price}</TableCell>*/}
                        <TableCell>{tag.assigned_to ? `Agent: ${tag.agent_name}` : "Unassigned"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tag.status === "Assigned"
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-green-50 text-green-700"
                            }
                          >
                            {tag.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setSelectedFastag(tag);
                              setShowEditDialog(true);
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
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
{showEditDialog && selectedFastag && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-md p-6 w-full max-w-xl shadow-xl">
      <h2 className="text-lg font-bold mb-4">Edit FASTag</h2>

      <div className="space-y-4">
        <div>
          <Label>Bank Name</Label>
          <select
            value={selectedFastag.bank_name}
            onChange={(e) =>
              setSelectedFastag({ ...selectedFastag, bank_name: e.target.value })
            }
            className="w-full border px-2 py-2 rounded"
          >
            <option value="">Select bank</option>
            {uniqueBanks.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>FASTag Class</Label>
          <select
            value={selectedFastag.fastag_class}
            onChange={(e) =>
              setSelectedFastag({ ...selectedFastag, fastag_class: e.target.value })
            }
            className="w-full border px-2 py-2 rounded"
          >
            <option value="class4">Class 4 (Car/Jeep/Van)</option>
            <option value="class5">Class 5 (LCV)</option>
            <option value="class6">Class 6 (Bus/Truck)</option>
            <option value="class7">Class 7 (Multi-Axle)</option>
            <option value="class12">Class 12 (Oversize)</option>
          </select>
        </div>

        <div>
          <Label>Purchase Price</Label>
          <Input
            type="number"
            value={selectedFastag.purchase_price}
            onChange={(e) =>
              setSelectedFastag({ ...selectedFastag, purchase_price: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Batch Number</Label>
          <Input
            value={selectedFastag.batch_number}
            onChange={(e) =>
              setSelectedFastag({ ...selectedFastag, batch_number: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Assign to Agent</Label>
          <select
            value={selectedFastag.assigned_to || ""}
            onChange={(e) =>
              setSelectedFastag({ ...selectedFastag, assigned_to: e.target.value })
            }
            className="w-full border px-2 py-2 rounded"
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Status</Label>
          <select
            value={selectedFastag.status}
            onChange={(e) =>
              setSelectedFastag({ ...selectedFastag, status: e.target.value })
            }
            className="w-full border px-2 py-2 rounded"
          >
            <option value="in_stock">In Stock</option>
            <option value="assigned">Assigned</option>
            <option value="sold">Sold</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
          Cancel
        </Button>
        <Button
          onClick={async () => {
            const res = await fetch(`/api/fastags/${selectedFastag.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(selectedFastag),
            });
            const result = await res.json();
            if (result.success) {
              await loadFastags();
              setShowEditDialog(false);
            } else {
              alert("Update failed: " + result.error);
            }
          }}
        >
          Save Changes
        </Button>
      </div>
    </div>
  </div>
)}




      </div>
    </div>
  );
}
