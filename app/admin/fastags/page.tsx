"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, Edit, Plus, Search, Trash2, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAdminSession } from "@/lib/actions/auth-actions";
import { getAllFastags } from "@/lib/actions/admin-actions";
import type { FastagItem } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminStats } from "@/lib/actions/admin-actions";
export default function AdminFastagsPage() {
  const router = useRouter();
  const [fastags, setFastags] = useState<FastagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFastags = async () => {
      const session = await getAdminSession();
      if (!session) return router.push("/admin/login");

      try {
        const data = await AdminStats();
        setFastags(data);
      } catch (err) {
        console.error("Failed to load fastags:", err);
        setError("Failed to load FASTag data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFastags();
  }, [router]);

  const filteredFastags = fastags.filter((tag) => {
    const matchesSearch =
      tag.tag_serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tag.assigned_to_role && tag.assigned_to_role.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      filterStatus === "all" || tag.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FASTag Inventory</h1>
            <p className="text-muted-foreground">Overview of all FASTags in the system.</p>
          </div>
          <div className="flex gap-2">
            <Button><Plus className="mr-2 h-4 w-4" /> Add FASTag</Button>
            <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
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
            <CardTitle>All FASTags</CardTitle>
            <CardDescription>Filter and search through inventory.</CardDescription>
            <div className="flex flex-wrap gap-4 mt-4">
              <Input placeholder="Search FASTags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in_stock">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredFastags.length === 0 ? (
              <p className="text-center text-muted-foreground">No FASTags found.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Holder</TableHead>
                      <TableHead>Purchase</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFastags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell>{tag.tag_serial}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tag.status === "sold"
                                ? "bg-red-50 text-red-700"
                                : tag.status === "assigned"
                                ? "bg-yellow-50 text-yellow-800"
                                : "bg-green-50 text-green-700"
                            }
                          >
                            {tag.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tag.status === "sold"
                            ? "User"
                            : tag.assigned_to_agent_id
                            ? `Agent #${tag.assigned_to_agent_id}`
                            : "Admin"}
                        </TableCell>
                        <TableCell>
                          ₹{tag.purchase_price ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" title="Edit"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Delete"><Trash2 className="h-4 w-4" /></Button>
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
