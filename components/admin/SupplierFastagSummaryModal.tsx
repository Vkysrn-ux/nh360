import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Utility function to format ₹
const formatCurrency = (n: string | number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function SupplierFastagSummaryModal({
  open,
  onClose,
  supplier,
  data // { summary: {...}, fastags: [...] }
}) {
  // If no data, show loading
  if (!data || !data.fastags) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              FASTag Summary: {supplier?.name || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="p-10 text-center text-gray-500">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // Filter state
  const [bankFilter, setBankFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Unique options for filtering
  const classOptions = useMemo(
    () => Array.from(new Set(data.fastags.map(f => f.fastag_class))).filter(Boolean),
    [data]
  );
  const bankOptions = useMemo(
    () => Array.from(new Set(data.fastags.map(f => f.bank_name))).filter(Boolean),
    [data]
  );
  const batchOptions = useMemo(
    () => Array.from(new Set(data.fastags.map(f => f.batch_number))).filter(Boolean),
    [data]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(data.fastags.map(f => f.status))).filter(Boolean),
    [data]
  );

  // Filtered fastags
  const filtered = useMemo(() => {
    return data.fastags.filter(tag =>
      (bankFilter === "all" || tag.bank_name === bankFilter) &&
      (classFilter === "all" || tag.fastag_class === classFilter) &&
      (batchFilter === "all" || tag.batch_number === batchFilter) &&
      (statusFilter === "all" || tag.status === statusFilter) &&
      (search.trim() === "" || tag.tag_serial?.toLowerCase().includes(search.trim().toLowerCase()))
    );
  }, [data, bankFilter, classFilter, batchFilter, statusFilter, search]);

  // Quick stats from summary object (fix here)
  const summary = data.summary || {};
  const totalCount = summary.total_fastags ?? 0;
  const paidCount = summary.paid ?? 0;
  const unpaidCount = summary.unpaid ?? 0;
  const inStockCount = summary.available_with_admin ?? 0;
  const assignedCount = summary.assigned_to_agent ?? 0;
  const soldCount = summary.sold_total ?? 0;
  const profit = summary.profit ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            FASTag Inventory Summary: <span className="font-semibold">{supplier?.name || ""}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="p-2">
          {/* Stats Overview */}
          <div className="flex flex-wrap gap-5 mb-6">
            <div className="rounded bg-blue-50 text-blue-700 px-4 py-2 min-w-[130px] text-center">
              <div className="font-bold text-2xl">{totalCount}</div>
              <div className="text-xs">Total FASTags</div>
            </div>
            <div className="rounded bg-green-50 text-green-700 px-4 py-2 min-w-[130px] text-center">
              <div className="font-bold text-2xl">{paidCount}</div>
              <div className="text-xs">Paid</div>
            </div>
            <div className="rounded bg-yellow-50 text-yellow-700 px-4 py-2 min-w-[130px] text-center">
              <div className="font-bold text-2xl">{unpaidCount}</div>
              <div className="text-xs">Unpaid</div>
            </div>
            <div className="rounded bg-gray-50 text-gray-800 px-4 py-2 min-w-[130px] text-center">
              <div className="font-bold text-2xl">{inStockCount}</div>
              <div className="text-xs">In Stock (Admin)</div>
            </div>
            <div className="rounded bg-purple-50 text-purple-700 px-4 py-2 min-w-[130px] text-center">
              <div className="font-bold text-2xl">{assignedCount}</div>
              <div className="text-xs">Assigned to Agent</div>
            </div>
            <div className="rounded bg-red-50 text-red-700 px-4 py-2 min-w-[130px] text-center">
              <div className="font-bold text-2xl">{soldCount}</div>
              <div className="text-xs">Sold</div>
            </div>
            <div className="rounded bg-green-50 text-green-700 px-4 py-2 min-w-[130px] text-center">
              <div className="font-bold text-2xl">₹{profit}</div>
              <div className="text-xs">Profit</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Input
              placeholder="Search Serial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-52"
            />
            <Select value={bankFilter} onValueChange={setBankFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Banks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Banks</SelectItem>
                {bankOptions.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batchOptions.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[60vh] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchase Price</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Agent/Shop</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No FASTags found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(tag => (
                    <TableRow key={tag.id}>
                      <TableCell>{tag.tag_serial}</TableCell>
                      <TableCell>{tag.bank_name}</TableCell>
                      <TableCell>{tag.fastag_class}</TableCell>
                      <TableCell>{tag.batch_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          tag.status === "sold"
                            ? "bg-gray-200 text-gray-800"
                            : tag.status === "assigned"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-green-50 text-green-700"
                        }>
                          {tag.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(tag.purchase_price)}
                      </TableCell>
                      <TableCell>
                        {tag.purchase_date ? tag.purchase_date.slice(0, 10) : "-"}
                      </TableCell>
                      <TableCell>
                        {/* Show assigned_to_agent_name if exists, else "-" */}
                        {tag.assigned_to_agent_name || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
