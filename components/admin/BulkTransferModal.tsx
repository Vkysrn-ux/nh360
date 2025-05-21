import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

function formatSerialRange(arr) {
  if (!arr.length) return "";
  return arr.length === 1 ? arr[0] : `${arr[0]} - ${arr[arr.length - 1]}`;
}

export default function BulkTransferModal({ open, onClose, banks, classes, agents, onSuccess }) {
  const [rows, setRows] = useState([
    { bank: "", fastagClass: "", availableSerials: [], startSerial: "", endSerial: "", quantity: 1, agentId: "" }
  ]);
  const [loading, setLoading] = useState(false);

  // Fetch available serials when bank/class changes in any row
  useEffect(() => {
    rows.forEach((row, i) => {
      if (row.bank && row.fastagClass) {
        fetch(`/api/fastags/available?bank=${row.bank}&class=${row.fastagClass}`)
          .then(async res => {
            if (!res.ok) return [];
            try { return await res.json(); } catch { return []; }
          })
          .then(data => {
            setRows(rows =>
              rows.map((r, idx) => idx === i
                ? { ...r, availableSerials: Array.isArray(data) ? data : [] }
                : r
              )
            );
          });
      }
    });
    // eslint-disable-next-line
  }, [rows.map(r => r.bank + r.fastagClass).join(",")]);

  // Handle input changes
  const handleRowChange = (i, field, value) => {
    setRows(rows =>
      rows.map((row, idx) => idx === i ? { ...row, [field]: value } : row)
    );
  };

  // Auto-calculate endSerial if startSerial and quantity entered
  useEffect(() => {
    setRows(rows =>
      rows.map(row => {
        if (!row.availableSerials.length || !row.startSerial) return row;
        const idx = row.availableSerials.findIndex(s => s.tag_serial == row.startSerial);
        if (idx === -1) return { ...row, endSerial: "" };
        if (row.quantity > 0) {
          const endObj = row.availableSerials[idx + row.quantity - 1];
          return { ...row, endSerial: endObj ? endObj.tag_serial : "" };
        }
        return row;
      })
    );
    // eslint-disable-next-line
  }, [rows.map(r => r.startSerial).join(","), rows.map(r => r.quantity).join(","), rows.map(r => r.availableSerials.length).join(",")]);

  // Auto-calculate quantity if endSerial changes
  useEffect(() => {
    setRows(rows =>
      rows.map(row => {
        if (!row.availableSerials.length || !row.startSerial || !row.endSerial) return row;
        const startIdx = row.availableSerials.findIndex(s => s.tag_serial == row.startSerial);
        const endIdx = row.availableSerials.findIndex(s => s.tag_serial == row.endSerial);
        if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
          return { ...row, quantity: endIdx - startIdx + 1 };
        }
        return row;
      })
    );
    // eslint-disable-next-line
  }, [rows.map(r => r.endSerial).join(","), rows.map(r => r.startSerial).join(","), rows.map(r => r.availableSerials.length).join(",")]);

  // Add/remove row
  const addRow = () => setRows(r => [...r, { bank: "", fastagClass: "", availableSerials: [], startSerial: "", endSerial: "", quantity: 1, agentId: "" }]);
  const removeRow = i => setRows(r => r.length === 1 ? r : r.filter((_, idx) => idx !== i));

  // Only allow transfer if all rows have required fields
  const canTransfer = rows.every(row =>
    row.bank &&
    row.fastagClass &&
    row.startSerial &&
    row.quantity > 0 &&
    row.endSerial &&
    row.agentId
  );

  // Transfer logic
  const handleTransfer = async () => {
    setLoading(true);
    try {
      // Only send rows that are fully valid (agent, bank, class, serials)
      const assignments = rows
        .map(row => {
          const startIdx = row.availableSerials.findIndex(s => s.tag_serial == row.startSerial);
          const serials = (startIdx !== -1 && row.quantity > 0)
            ? row.availableSerials.slice(startIdx, startIdx + row.quantity).map(s => s.tag_serial)
            : [];
          return {
            bank: row.bank,
            fastagClass: row.fastagClass,
            agentId: row.agentId,
            serials,
          };
        })
        .filter(a => a.agentId && Array.isArray(a.serials) && a.serials.length > 0);

      if (assignments.length === 0) {
        alert("Please fill all required fields and select at least one serial for each transfer.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/fastags/bulk-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignments)
      });
      const result = await res.json();
      if (result.success) {
        const totalAssigned = assignments.reduce((sum, a) => sum + a.serials.length, 0);
        const agentNames = agents
          .filter(a => assignments.some(asn => asn.agentId == a.id))
          .map(a => a.name)
          .join(", ");
        alert(`Total ${totalAssigned} FASTags assigned to ${agentNames} on ${new Date().toLocaleDateString()}`);
        setRows([
          { bank: "", fastagClass: "", availableSerials: [], startSerial: "", endSerial: "", quantity: 1, agentId: "" }
        ]);
        onSuccess && onSuccess();
        onClose();
      } else {
        alert(result.error || "Transfer failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Transfer FASTags</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3">
              {/* Bank */}
              <Select value={row.bank} onValueChange={val => handleRowChange(i, "bank", val)}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Bank" /></SelectTrigger>
                <SelectContent>
                  {banks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              {/* Class */}
              <Select value={row.fastagClass} onValueChange={val => handleRowChange(i, "fastagClass", val)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => {
                    const available = row.availableSerials.length;
                    return (
                      <SelectItem key={c} value={c}>
                        {c} {available > 0 ? `(available: ${available})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {/* Start Serial */}
              <Input
                className="w-32"
                value={row.startSerial}
                onChange={e => handleRowChange(i, "startSerial", e.target.value)}
                placeholder="Start Serial"
                list={`serials-list-${i}`}
              />
              <datalist id={`serials-list-${i}`}>
                {row.availableSerials.map(s => (
                  <option key={s.tag_serial} value={s.tag_serial} />
                ))}
              </datalist>
              {/* Quantity */}
              <Input
                className="w-20"
                type="number"
                min={1}
                max={row.availableSerials.length}
                value={row.quantity}
                onChange={e => handleRowChange(i, "quantity", Math.max(1, Number(e.target.value)))}
                placeholder="Qty"
              />
              {/* End Serial */}
              <Input
                className="w-32"
                value={row.endSerial}
                onChange={e => handleRowChange(i, "endSerial", e.target.value)}
                placeholder="End Serial"
                readOnly
              />
              {/* Agent */}
              <Select value={row.agentId} onValueChange={val => handleRowChange(i, "agentId", val)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => removeRow(i)}
                >🗑</Button>
              )}
            </div>
          ))}
          {/* Add Row Button */}
          <Button type="button" variant="outline" onClick={addRow}>+ Add Row</Button>

          {/* Transfer/Cancel Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={loading || !canTransfer}>
              {loading ? "Transferring..." : "Transfer"}
            </Button>
          </div>
        </div>
        {/* Optional: Show info about available range */}
        {rows.map((row, i) =>
          row.availableSerials.length && row.bank && row.fastagClass ? (
            <div key={i + "-range"} className="text-sm text-gray-500 mt-2">
              Available serials: {row.availableSerials.map(s => s.tag_serial).join(", ")}
            </div>
          ) : null
        )}
      </DialogContent>
    </Dialog>
  );
}
