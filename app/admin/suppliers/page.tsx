"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getAdminSession } from "@/lib/actions/auth-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminSuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [editSupplier, setEditSupplier] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers/all");
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      setError("Failed to fetch supplier data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const session = await getAdminSession();
      if (!session) return router.push("/admin/login");
      await loadSuppliers();
    };
    fetchData();
  }, [router]);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editSupplier) return;

    const formData = new FormData(e.currentTarget);
    const updated = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      status: editStatus,
      payment_status: editPaymentStatus
    };

    const res = await fetch(`/api/suppliers/${editSupplier.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });

    const result = await res.json();
    if (result.success) {
      setEditSupplier(null);
      setEditStatus("");
      setEditPaymentStatus("");
      await loadSuppliers();
    } else {
      alert("Failed to update supplier: " + result.error);
    }
  };

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
            <p className="text-muted-foreground">Manage all suppliers in the system.</p>
          </div>
          <Button onClick={() => router.push("/admin/suppliers/add")}> <Plus className="mr-2 h-4 w-4" /> Add Supplier </Button>
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
            <CardTitle>Supplier List</CardTitle>
            <CardDescription>View and manage all suppliers with payment status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>{supplier.name}</TableCell>
                      <TableCell>{supplier.email}</TableCell>
                      <TableCell>{supplier.phone}</TableCell>
                      <TableCell>
                          <Badge className={supplier.status.toLowerCase() === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                            {supplier.status}
                          </Badge>
                      </TableCell>
                      <TableCell>
                          <Badge className={
                        supplier.payment_status.toLowerCase() === "paid"
                          ? "bg-blue-50 text-blue-700"
                          : supplier.payment_status.toLowerCase() === "collected"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-yellow-50 text-yellow-700"
                      }>
                        {supplier.payment_status}
                      </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => {
                            setEditSupplier(supplier);
                            setEditStatus(supplier.status);
                            setEditPaymentStatus(supplier.payment_status);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {editSupplier && (
          <Dialog open={true} onOpenChange={() => {
            setEditSupplier(null);
            setEditStatus("");
            setEditPaymentStatus("");
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input name="name" defaultValue={editSupplier.name} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" defaultValue={editSupplier.email} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={editSupplier.phone} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="collected">Collected</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Update Supplier</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
