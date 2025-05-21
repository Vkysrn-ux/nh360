import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function BulkTransferModal({ open, onClose, agents, onSuccess }) {
  // [{bank_name, fastag_class, available}]
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(false);

  // Each row: { bank_name, fastag_class, quantity, agent_id, error }
  const [rows, setRows] = useState([
    { bank_name: "", fastag_class: "", quantity: "", agent_id: "", error: "" }
  ]);

  useEffect(() => {
    if (open) {
      fetch("/api/fastags/available-summary")
        .then(res => res.json())
        .then(setAvailable);
      setRows([{ bank_name: "", fastag_class: "", quantity: "", agent_id: "", error: "" }]);
    }
  }, [open]);

  // Helper: Classes available for a bank
  const getAvailableClasses = (bank) =>
    available.filter(a => a.bank_name === bank && a.available > 0).map(a => a.fastag_class);

  // Helper: Total available for bank/class
  function getRemaining(bank, cls, excludeRow = -1) {
    const found = available.find(a => a.bank_name === bank && a.fastag_class === cls);
    const base = found?.available ?? 0;
    let used = 0;
    rows.forEach((row, idx) => {
      if (idx !== excludeRow && row.bank_name === bank && row.fastag_class === cls) {
        used += Number(row.quantity || 0);
      }
    });
    return base - used;
  }

  // On row change
  const updateRow = (idx, key, value) => {
    let newRows = rows.map((row, i) => i === idx ? { ...row, [key]: value, error: "" } : row);

    // If bank changed, clear class and quantity
    if (key === "bank_name") {
      newRows[idx].fastag_class = "";
      newRows[idx].quantity = "";
    }
    // If class changed, clear quantity
    if (key === "fastag_class") {
      newRows[idx].quantity = "";
    }
    // Validation
    if (key === "quantity" || key === "bank_name" || key === "fastag_class") {
      const { bank_name, fastag_class } = newRows[idx];
      const qty = Number(key === "quantity" ? value : newRows[idx].quantity);
      if (bank_name && fastag_class && qty) {
        const remaining = getRemaining(bank_name, fastag_class, idx);
        if (qty > remaining) {
          newRows[idx].error = `Only ${remaining} tag(s) available for this combination.`;
        } else {
          newRows[idx].error = "";
        }
      }
    }
    setRows(newRows);
  };

  const addRow = () => setRows([...rows, { bank_name: "", fastag_class: "", quantity: "", agent_id: "", error: "" }]);
  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));

  // Validate before submit
  const validateAll = () => {
    let isValid = true;
    let newRows = rows.map((row, idx) => {
      let error = "";
      if (!row.bank_name || !row.fastag_class || !row.quantity || !row.agent_id) {
        error = "Please complete all fields.";
        isValid = false;
      } else if (Number(row.quantity) <= 0) {
        error = "Enter a valid quantity.";
        isValid = false;
      } else {
        const remaining = getRemaining(row.bank_name, row.fastag_class, idx);
        if (Number(row.quantity) > remaining) {
          error = `Only ${remaining} tag(s) available for this combination.`;
          isValid = false;
        }
      }
      return { ...row, error };
    });
    setRows(newRows);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;
    setLoading(true);
    try {
      const transfers = rows.map(({ bank_name, fastag_class, quantity, agent_id }) => ({
        bank_name, fastag_class, quantity: Number(quantity), agent_id
      }));
      const res = await fetch("/api/fastags/bulk-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transfers }),
      });
      const result = await res.json();
      if (result.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert("Transfer failed: " + result.error);
      }
    } catch (e) {
      alert("Network error");
    }
    setLoading(false);
  };

  // Get unique banks that have available tags
  const banks = Array.from(new Set(available.filter(a => a.available > 0).map(a => a.bank_name)));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Transfer FASTags</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {rows.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              {/* Bank */}
              <div className="flex-1">
                <label className="block mb-1 text-xs font-medium">Bank</label>
                <Select value={row.bank_name} onValueChange={val => updateRow(idx, "bank_name", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Class */}
              <div className="flex-1">
                <label className="block mb-1 text-xs font-medium">Class</label>
                <Select
                  value={row.fastag_class}
                  onValueChange={val => updateRow(idx, "fastag_class", val)}
                  disabled={!row.bank_name}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableClasses(row.bank_name).map(cls => (
                      <SelectItem key={cls} value={cls}>
                        {cls} (available: {getRemaining(row.bank_name, cls, idx)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Quantity */}
              <div className="w-28">
                <label className="block mb-1 text-xs font-medium">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  disabled={!row.bank_name || !row.fastag_class}
                  value={row.quantity}
                  onChange={e => updateRow(idx, "quantity", e.target.value)}
                  placeholder={`≤ ${row.bank_name && row.fastag_class ? getRemaining(row.bank_name, row.fastag_class, idx) : "-"}`}
                />
              </div>
              {/* Agent */}
              <div className="flex-1">
                <label className="block mb-1 text-xs font-medium">Agent</label>
                <Select
                  value={row.agent_id}
                  onValueChange={val => updateRow(idx, "agent_id", val)}
                  disabled={!row.bank_name || !row.fastag_class}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" type="button" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                <Trash2 className="w-4 h-4" />
              </Button>
              {/* Error */}
              {row.error && (
                <div className="text-xs text-red-600 mt-2">{row.error}</div>
              )}
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" /> Add Row
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Transfer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
