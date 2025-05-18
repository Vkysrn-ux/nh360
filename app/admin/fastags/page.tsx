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

export default function AdminFastagsPage() {
  const router = useRouter();
  const [fastags, setFastags] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);

  const loadFastags = async () => {
    const res = await fetch("/api/fastags/all");
    const data = await res.json();
    setFastags(data);
  };
  

  useEffect(() => {
    loadFastags();
  }, []);

  const filtered = fastags.filter((tag) =>
    tag.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search FASTags..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
                      <TableHead>Price (₹)</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell>{tag.serial_number}</TableCell>
                        <TableCell>{tag.bank}</TableCell>
                        <TableCell>{tag.type}</TableCell>
                        <TableCell>{tag.batch_number}</TableCell>
                        <TableCell>{tag.price}</TableCell>
                        <TableCell>{tag.assigned_to ? `Agent: ${tag.assigned_to}` : "—"}</TableCell>
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
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
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
      </div>
    </div>
  );
}
