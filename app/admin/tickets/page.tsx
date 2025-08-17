"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import ShopAutocomplete from "@/components/ShopAutocomplete"; // adjust path if needed

// ---------- Small helpers ----------
function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <div className="mt-1">{value ?? "-"}</div>
    </div>
  );
}
function Input(props: any) {
  const { label, ...rest } = props;
  return (
    <div className="mb-3">
      <label className="block font-semibold mb-1">{label}</label>
      <input className="border rounded w-full p-2" {...rest} />
    </div>
  );
}

// Payment badge UI
function PaymentBadge({ status, title }: { status: string; title?: string }) {
  const map: Record<string, { text: string; cls: string }> = {
    not_paid: { text: "Not Paid", cls: "bg-red-100 text-red-700" },
    partial: { text: "Partially Paid", cls: "bg-amber-100 text-amber-700" },
    advance: { text: "Paid in Advance", cls: "bg-green-100 text-green-700" },
    paid: { text: "Paid", cls: "bg-green-100 text-green-700" }, // full payment (no explicit advance)
    unknown: { text: "—", cls: "bg-gray-100 text-gray-700" },
  };
  const v = map[status] || map["unknown"];
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${v.cls}`}
    >
      {v.text}
    </span>
  );
}

// Derive payment status from available fields if no string provided
function derivePaymentStatus(t: any): { status: string; title: string } {
  const ps = (t.payment_status || t.payment?.status || "").toString().toLowerCase();
  if (ps) {
    if (["not_paid", "unpaid"].includes(ps)) return { status: "not_paid", title: "No payment received" };
    if (["partial", "partially_paid"].includes(ps)) return { status: "partial", title: "Payment received partially" };
    if (["advance", "paid_in_advance", "advance_paid"].includes(ps))
      return { status: "advance", title: "Payment received in advance" };
    if (["paid", "full", "fully_paid"].includes(ps)) return { status: "paid", title: "Fully paid" };
  }

  const total = Number(t.total_amount ?? t.amount_total ?? t.total ?? 0) || 0;
  const paid = Number(t.amount_paid ?? t.paid_amount ?? t.paid ?? 0) || 0;
  const advance = Number(t.advance_amount ?? t.advance_paid ?? 0) || 0;

  const due = Math.max(total - paid, 0);
  if (total === 0 && paid === 0 && advance === 0) {
    return { status: "unknown", title: "No payment info" };
  }
  if (paid <= 0) return { status: "not_paid", title: `Due ₹${due}` };
  if (paid > 0 && paid < total) return { status: "partial", title: `Paid ₹${paid} of ₹${total}` };
  if (paid >= total && advance > 0) return { status: "advance", title: `Advance ₹${advance}, Total ₹${total}` };
  return { status: "paid", title: `Paid ₹${paid} of ₹${total}` };
}

type Ticket = any;
type User = { id: number; name: string };

// Full sub-ticket row (like create-new)
type SubRow = {
  vehicle_reg_no: string;
  phone: string;
  alt_phone: string;
  subject: string;
  details: string;
  status: string;
  assigned_to: string;
  lead_received_from: string;
  lead_by: string;
  customer_name: string;
  comments: string;
  selectedShop?: any | null;
  users?: User[];
  loadingUsers?: boolean;
};

// For create modal extra issues
type SubIssue = { subject: string; details: string };

export default function TicketListPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  // child counts map
  const [childCounts, setChildCounts] = useState<Record<number, number>>({});
  const [countsLoading, setCountsLoading] = useState(false);

  // Expand/collapse and children cache
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [childrenMap, setChildrenMap] = useState<Record<number, Ticket[]>>({});
  const [childrenLoading, setChildrenLoading] = useState<Record<number, boolean>>({});

  // View modal
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Edit modal (4 cols)
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Sub-ticket mgmt inside Edit modal
  const [childList, setChildList] = useState<any[]>([]);
  const [childLoading, setChildLoading] = useState(false);
  const [addingSubs, setAddingSubs] = useState(false);
  const [subRows, setSubRows] = useState<SubRow[]>([
    {
      vehicle_reg_no: "",
      phone: "",
      alt_phone: "",
      subject: "",
      details: "",
      status: "open",
      assigned_to: "",
      lead_received_from: "",
      lead_by: "",
      customer_name: "",
      comments: "",
      selectedShop: null,
      users: [],
      loadingUsers: false,
    },
  ]);

  // Create Ticket (modal)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fcUsers, setFcUsers] = useState<User[]>([]);
  const [fcLoadingUsers, setFcLoadingUsers] = useState(false);
  const [fcSelectedShop, setFcSelectedShop] = useState<any>(null);
  const [fcSaving, setFcSaving] = useState(false);
  const [fcError, setFcError] = useState("");

  const [fcForm, setFcForm] = useState({
    vehicle_reg_no: "",
    phone: "",
    alt_phone: "",
    subject: "",
    details: "",
    status: "open",
    assigned_to: "",
    lead_received_from: "",
    role_user_id: "",
    lead_by: "",
    customer_name: "",
    comments: "",
  });
  const [fcSubIssues, setFcSubIssues] = useState<SubIssue[]>([{ subject: "", details: "" }]);

  // TODO: replace with real session user id
  const currentUserId = 1;

  // ---- Fetch tickets
  const fetchTickets = () => {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => setTickets(data || []))
      .catch(() => setTickets([]));
  };
  useEffect(() => {
    fetchTickets();
  }, []);

  // ---- Fetch child counts after tickets load
  useEffect(() => {
    if (!tickets.length) return;

    async function fetchCounts() {
      setCountsLoading(true);
      const entries: [number, number][] = await Promise.all(
        tickets.map(async (t) => {
          const id = t.id as number;
          try {
            const r1 = await fetch(`/api/tickets/${id}/children/count`);
            if (r1.ok) {
              const data = await r1.json();
              return [id, Number(data?.count ?? 0)];
            }
          } catch {}
          try {
            const r2 = await fetch(`/api/tickets/${id}/children`);
            if (r2.ok) {
              const list = await r2.json();
              return [id, Array.isArray(list) ? list.length : 0];
            }
          } catch {}
          if (typeof t.children_count === "number") return [id, t.children_count];
          return [id, 0];
        })
      );
      const map: Record<number, number> = {};
      entries.forEach(([id, count]) => (map[id] = count));
      setChildCounts(map);
      setCountsLoading(false);
    }
    fetchCounts();
  }, [tickets]);

  // ---- Expand/collapse handlers
  async function toggleExpand(parentId: number) {
    const isOpen = !!expanded[parentId];
    // collapse
    if (isOpen) {
      setExpanded((e) => ({ ...e, [parentId]: false }));
      return;
    }
    // open
    setExpanded((e) => ({ ...e, [parentId]: true }));

    // fetch children if not cached
    if (!childrenMap[parentId]) {
      setChildrenLoading((l) => ({ ...l, [parentId]: true }));
      try {
        const res = await fetch(`/api/tickets/${parentId}/children`);
        const data = (await res.json()) || [];
        setChildrenMap((m) => ({ ...m, [parentId]: data }));
      } catch {
        setChildrenMap((m) => ({ ...m, [parentId]: [] }));
      } finally {
        setChildrenLoading((l) => ({ ...l, [parentId]: false }));
      }
    }
  }

  // ---- View modal handlers
  const handleView = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };
  const handleClose = () => {
    setShowModal(false);
    setSelectedTicket(null);
  };

  // ---- Edit modal handlers
  const handleEdit = (ticket: Ticket) => {
    setEditTicket(ticket);
    setEditForm(ticket);
    setShowModal(false);
  };
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, id: editTicket?.id }),
    });
    setEditTicket(null);
    fetchTickets();
  };

  // ---- When Edit opens, load existing sub-tickets
  useEffect(() => {
    if (!editTicket?.id) return;
    setChildLoading(true);
    fetch(`/api/tickets/${editTicket.id}/children`)
      .then((r) => r.json())
      .then((list) => {
        setChildList(list || []);
        setChildCounts((prev) => ({ ...prev, [editTicket.id!]: Array.isArray(list) ? list.length : 0 }));
      })
      .catch(() => setChildList([]))
      .finally(() => setChildLoading(false));

    setSubRows([
      {
        vehicle_reg_no: editTicket.vehicle_reg_no || "",
        phone: editTicket.phone || "",
        alt_phone: editTicket.alt_phone || "",
        subject: "",
        details: "",
        status: "open",
        assigned_to: String(editTicket.assigned_to || ""),
        lead_received_from: editTicket.lead_received_from || "",
        lead_by: editTicket.lead_by || "",
        customer_name: editTicket.customer_name || "",
        comments: "",
        selectedShop: null,
        users: [],
        loadingUsers: false,
      },
    ]);
  }, [editTicket?.id]);

  // ---- Sub-ticket row helpers (Edit modal)
  function addSubRow() {
    setSubRows((prev) => [
      ...prev,
      {
        vehicle_reg_no: editTicket?.vehicle_reg_no || "",
        phone: editTicket?.phone || "",
        alt_phone: editTicket?.alt_phone || "",
        subject: "",
        details: "",
        status: "open",
        assigned_to: String(editTicket?.assigned_to || ""),
        lead_received_from: editTicket?.lead_received_from || "",
        lead_by: editTicket?.lead_by || "",
        customer_name: editTicket?.customer_name || "",
        comments: "",
        selectedShop: null,
        users: [],
        loadingUsers: false,
      },
    ]);
  }
  function removeSubRow(i: number) {
    setSubRows((s) => s.filter((_, idx) => idx !== i));
  }
  function updateSubRow(i: number, key: keyof SubRow, val: any) {
    setSubRows((s) => {
      const next = [...s];
      (next[i] as any)[key] = val;
      return next;
    });
  }
  async function handleRowSourceChange(i: number, src: string) {
    setSubRows((s) => {
      const next = [...s];
      next[i].lead_received_from = src;
      next[i].lead_by = "";
      next[i].selectedShop = null;
      next[i].users = [];
      next[i].loadingUsers = ["Toll-agent", "ASM", "TL", "Manager"].includes(src);
      return next;
    });

    if (["Toll-agent", "ASM", "TL", "Manager"].includes(src)) {
      try {
        const res = await fetch(`/api/users?role=${src.toLowerCase()}`);
        const data = (await res.json()) as User[];
        setSubRows((s) => {
          const next = [...s];
          next[i].users = data || [];
          next[i].loadingUsers = false;
          return next;
        });
      } catch {
        setSubRows((s) => {
          const next = [...s];
          next[i].users = [];
          next[i].loadingUsers = false;
          return next;
        });
      }
    }
  }
  function normalizeAssignedTo(val: string) {
    if (val === "" || val === "self") return String(currentUserId);
    if (!isNaN(Number(val))) return String(parseInt(val, 10));
    return "";
  }
  async function createNewSubTickets() {
    if (!editTicket?.id) return;
    const validRows = subRows.filter((r) => (r.subject || "").trim());
    if (validRows.length === 0) return;

    setAddingSubs(true);
    try {
      for (const row of validRows) {
        const payload = {
          vehicle_reg_no: row.vehicle_reg_no,
          phone: row.phone,
          alt_phone: row.alt_phone,
          subject: row.subject.trim(),
          details: (row.details || "").trim(),
          status: row.status || "open",
          assigned_to: normalizeAssignedTo(row.assigned_to),
          lead_received_from: row.lead_received_from,
          lead_by:
            row.lead_received_from === "Shop"
              ? (row.selectedShop?.id ?? row.lead_by ?? "")
              : row.lead_by,
          customer_name: row.customer_name,
          comments: row.comments,
        };
        await fetch(`/api/tickets/${editTicket.id}/children`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const list = await fetch(`/api/tickets/${editTicket.id}/children`).then((r) => r.json());
      setChildList(list || []);
      setChildCounts((prev) => ({ ...prev, [editTicket.id!]: Array.isArray(list) ? list.length : 0 }));
      setSubRows([
        {
          vehicle_reg_no: editTicket?.vehicle_reg_no || "",
          phone: editTicket?.phone || "",
          alt_phone: editTicket?.alt_phone || "",
          subject: "",
          details: "",
          status: "open",
          assigned_to: String(editTicket?.assigned_to || ""),
          lead_received_from: editTicket?.lead_received_from || "",
          lead_by: editTicket?.lead_by || "",
          customer_name: editTicket?.customer_name || "",
          comments: "",
          selectedShop: null,
          users: [],
          loadingUsers: false,
        },
      ]);
    } finally {
      setAddingSubs(false);
    }
  }

  // ---- Create Ticket (modal) — staff list when source is staff role
  useEffect(() => {
    const src = fcForm.lead_received_from;
    if (["Toll-agent", "ASM", "TL", "Manager"].includes(src)) {
      setFcLoadingUsers(true);
      fetch(`/api/users?role=${src.toLowerCase()}`)
        .then((res) => res.json())
        .then((data) => setFcUsers(data || []))
        .catch(() => setFcUsers([]))
        .finally(() => setFcLoadingUsers(false));
    } else {
      setFcUsers([]);
      setFcForm((f) => ({ ...f, role_user_id: "" }));
    }
  }, [fcForm.lead_received_from]);

  // keep role_user_id in sync with chosen shop
  useEffect(() => {
    setFcForm((f) => ({ ...f, role_user_id: fcSelectedShop ? fcSelectedShop.id : "" }));
  }, [fcSelectedShop]);

  const fcHandleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFcForm((f) => ({ ...f, [name]: value }));
  };
  function fcAddRow() {
    setFcSubIssues((s) => [...s, { subject: "", details: "" }]);
  }
  function fcRemoveRow(i: number) {
    setFcSubIssues((s) => s.filter((_, idx) => idx !== i));
  }
  function fcUpdateRow(i: number, key: keyof SubIssue, val: string) {
    setFcSubIssues((s) => {
      const next = [...s];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  }
  const submitFullCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFcError("");

    let assigned_to_value: any = fcForm.assigned_to;
    if (assigned_to_value === "" || assigned_to_value === "self") {
      assigned_to_value = currentUserId;
    } else if (!isNaN(Number(assigned_to_value))) {
      assigned_to_value = parseInt(assigned_to_value as unknown as string, 10);
    } else {
      assigned_to_value = null;
    }

    const payload = {
      vehicle_reg_no: fcForm.vehicle_reg_no,
      subject: fcForm.subject,
      details: fcForm.details,
      phone: fcForm.phone,
      alt_phone: fcForm.alt_phone,
      assigned_to: assigned_to_value,
      lead_received_from: fcForm.lead_received_from,
      lead_by: fcForm.lead_by || fcForm.role_user_id || "",
      status: fcForm.status,
      customer_name: fcForm.customer_name,
      comments: fcForm.comments,
      sub_issues: fcSubIssues
        .filter((r) => (r.subject || "").trim())
        .map((r) => ({ subject: r.subject.trim(), details: (r.details || "").trim() })),
    };

    try {
      setFcSaving(true);
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to create ticket");
      }
      setShowCreateModal(false);
      setFcForm({
        vehicle_reg_no: "",
        phone: "",
        alt_phone: "",
        subject: "",
        details: "",
        status: "open",
        assigned_to: "",
        lead_received_from: "",
        role_user_id: "",
        lead_by: "",
        customer_name: "",
        comments: "",
      });
      setFcSelectedShop(null);
      setFcUsers([]);
      setFcSubIssues([{ subject: "", details: "" }]);
      fetchTickets();
    } catch (err: any) {
      setFcError(err.message || "Something went wrong");
    } finally {
      setFcSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">FASTag Ticket List</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white border border-orange-500 text-orange-600 px-4 py-2 rounded shadow hover:bg-orange-50 font-semibold"
            title="Open full create form here"
          >
            Create Ticket (Modal)
          </button>
          <Link href="/admin/tickets/new">
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded shadow font-semibold">
              Create Ticket (Page)
            </button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <table className="min-w-full border mt-2">
        <thead>
          <tr>
            <th className="px-2 py-2 w-10"></th>{/* Arrow */}
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Mobile</th>
            <th className="px-4 py-2">Vehicle</th>
            <th className="px-4 py-2">Source</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Payment</th>
            <th className="px-4 py-2">Subs</th>
            <th className="px-4 py-2">Created</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const { status, title } = derivePaymentStatus(t);
            const count = typeof t.children_count === "number" ? t.children_count : childCounts[t.id] ?? 0;
            const isOpen = !!expanded[t.id];
            const isLoadingChildren = !!childrenLoading[t.id];
            const children = childrenMap[t.id] || [];

            return (
              <Fragment key={t.id}>
                <tr className="border-b">
                  <td className="border px-2 py-2 text-center align-middle">
                    <button
                      className={`inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 ${
                        count === 0 ? "opacity-40 cursor-default" : "cursor-pointer"
                      }`}
                      disabled={count === 0}
                      onClick={() => toggleExpand(t.id)}
                      title={count > 0 ? (isOpen ? "Collapse" : "Expand") : "No sub-tickets"}
                      aria-label={isOpen ? "Collapse sub-tickets" : "Expand sub-tickets"}
                    >
                      <span className="text-sm">{isOpen ? "▼" : "▶"}</span>
                    </button>
                  </td>
                  <td className="border px-4 py-2">{t.id}</td>
                  <td className="border px-4 py-2">{t.customer_name}</td>
                  <td className="border px-4 py-2">{t.phone}</td>
                  <td className="border px-4 py-2">{t.vehicle_reg_no}</td>
                  <td className="border px-4 py-2">
                    {t.lead_received_from_sub
                      ? `${t.lead_received_from} → ${t.lead_received_from_sub}`
                      : t.lead_received_from}
                  </td>
                  <td className="border px-4 py-2">{t.status}</td>
                  <td className="border px-4 py-2">
                    <PaymentBadge status={status} title={title} />
                  </td>
                  <td className="border px-4 py-2">
                    <span
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700"
                      title={countsLoading ? "Loading…" : `${count} sub-ticket(s)`}
                    >
                      {countsLoading && !(t.children_count >= 0) && childCounts[t.id] === undefined ? "…" : count}
                    </span>
                  </td>
                  <td className="border px-4 py-2">
                    {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                  </td>
                  <td className="border px-4 py-2">
                    <button className="text-orange-500 hover:underline mr-2" onClick={() => handleView(t)}>
                      View
                    </button>
                    <button className="text-blue-500 hover:underline" onClick={() => handleEdit(t)}>
                      Edit
                    </button>
                  </td>
                </tr>

                {/* Inline expanded children row */}
                {isOpen && (
                  <tr className="bg-gray-50">
                    <td className="border px-2 py-2"></td>
                    <td className="border px-4 py-2" colSpan={10}>
                      {isLoadingChildren ? (
                        <div className="text-sm text-gray-600">Loading sub-tickets…</div>
                      ) : children.length === 0 ? (
                        <div className="text-sm text-gray-500">No sub-tickets</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-600">
                              <th className="text-left py-2">ID</th>
                              <th className="text-left py-2">Subject</th>
                              <th className="text-left py-2">Status</th>
                              <th className="text-left py-2">Ticket No</th>
                              <th className="text-left py-2">Created</th>
                              <th className="text-left py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {children.map((c) => (
                              <tr key={c.id} className="border-t">
                                <td className="py-2 pr-4">#{c.id}</td>
                                <td className="py-2 pr-4">{c.subject || "-"}</td>
                                <td className="py-2 pr-4">{c.status || "-"}</td>
                                <td className="py-2 pr-4">{c.ticket_no || "-"}</td>
                                <td className="py-2 pr-4">
                                  {c.created_at ? new Date(c.created_at).toLocaleString() : "-"}
                                </td>
                                <td className="py-2">
                                  <a className="text-orange-600 underline" href={`/admin/tickets/${c.id}`}>
                                    Open
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* View Modal (vertical) */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute top-4 right-4 text-gray-600 hover:text-red-500 text-2xl font-bold"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4">Ticket Details</h2>

            <div className="flex flex-col">
              <Detail label="Ticket No" value={selectedTicket.ticket_no} />
              <Detail label="Customer" value={selectedTicket.customer_name} />
              <Detail label="Mobile" value={selectedTicket.phone} />
              <Detail label="Vehicle" value={selectedTicket.vehicle_reg_no} />
              <Detail
                label="Source"
                value={
                  selectedTicket.lead_received_from_sub
                    ? `${selectedTicket.lead_received_from} → ${selectedTicket.lead_received_from_sub}`
                    : selectedTicket.lead_received_from
                }
              />
              <Detail label="Status" value={selectedTicket.status} />
              <Detail
                label="Created"
                value={selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : ""}
              />
              <Detail label="Subject" value={selectedTicket.subject} />
              <Detail label="Assigned To" value={selectedTicket.assigned_to} />
              <Detail label="Alt Phone" value={selectedTicket.alt_phone} />
              <Detail label="Lead By" value={selectedTicket.lead_by} />
              <Detail label="Comments" value={selectedTicket.comments} />
            </div>

            <div className="mt-4">
              <div className="block font-semibold mb-1">Details</div>
              <div className="whitespace-pre-line border rounded p-2 bg-gray-50">{selectedTicket.details}</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal — 4 columns + FULL sub-ticket creation rows */}
      {editTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 w-full max-w-6xl relative mx-2 overflow-y-auto max-h-[95vh]">
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-500 text-2xl font-bold"
              onClick={() => setEditTicket(null)}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Ticket</h2>

            {/* Parent fields — 4 columns */}
            <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold mb-1">Customer Name</label>
                <input
                  className="border rounded w-full p-2"
                  name="customer_name"
                  value={editForm.customer_name || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mobile</label>
                <input
                  className="border rounded w-full p-2"
                  name="phone"
                  value={editForm.phone || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Vehicle No</label>
                <input
                  className="border rounded w-full p-2 bg-gray-100 text-gray-600"
                  value={editTicket.vehicle_reg_no || "-"}
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Status</label>
                <input
                  className="border rounded w-full p-2"
                  name="status"
                  value={editForm.status || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Subject</label>
                <input
                  className="border rounded w-full p-2"
                  name="subject"
                  value={editForm.subject || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Assigned To</label>
                <input
                  className="border rounded w-full p-2"
                  name="assigned_to"
                  value={editForm.assigned_to || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Alt Phone</label>
                <input
                  className="border rounded w-full p-2"
                  name="alt_phone"
                  value={editForm.alt_phone || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Lead By</label>
                <input
                  className="border rounded w-full p-2"
                  name="lead_by"
                  value={editForm.lead_by || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block font-semibold mb-1">Source</label>
                <input
                  className="border rounded w-full p-2"
                  name="lead_received_from"
                  value={editForm.lead_received_from || ""}
                  onChange={handleEditChange}
                />
              </div>

              {editForm.lead_received_from && (
                <div className="lg:col-span-4">
                  <label className="block font-semibold mb-1">
                    {editForm.lead_received_from === "Shop" ? "Shop Name" : "User Name"}
                  </label>
                  <input
                    className="border rounded w-full p-2"
                    name="lead_received_from_sub"
                    value={editForm.lead_received_from_sub || ""}
                    onChange={handleEditChange}
                  />
                </div>
              )}

              <div className="lg:col-span-4">
                <label className="block font-semibold mb-1">Comments</label>
                <input
                  className="border rounded w-full p-2"
                  name="comments"
                  value={editForm.comments || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block font-semibold mb-1">Details</label>
                <textarea
                  className="border rounded w-full p-2"
                  name="details"
                  value={editForm.details || ""}
                  onChange={handleEditChange}
                  rows={4}
                />
              </div>

              {/* Parent actions */}
              <div className="lg:col-span-4 flex gap-2 justify-end">
                <button type="button" onClick={() => setEditTicket(null)} className="px-4 py-2 rounded border">
                  Cancel
                </button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">
                  Save
                </button>
              </div>
            </form>

            <hr className="my-6" />

            {/* Sub-tickets area */}
            <div>
              <h3 className="text-lg font-bold mb-3">Sub-tickets</h3>

              {/* Existing children list */}
              <div className="mb-4">
                {childLoading ? (
                  <div className="text-gray-500">Loading sub-tickets…</div>
                ) : childList.length === 0 ? (
                  <div className="text-gray-500">No sub-tickets yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {childList.map((c) => (
                      <li key={c.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">#{c.id} — {c.subject}</div>
                            <div className="text-sm text-gray-600">
                              {c.status} {c.ticket_no ? `• ${c.ticket_no}` : ""}
                            </div>
                          </div>
                          <a className="text-orange-600 underline" href={`/admin/tickets/${c.id}`}>
                            Open
                          </a>
                        </div>
                        {c.details ? <div className="mt-1 text-sm">{c.details}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add sub-tickets dynamically — FULL fieldset like create */}
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">Add Sub-tickets</div>
                <button type="button" onClick={addSubRow} className="text-orange-600 font-semibold">
                  + Add Row
                </button>
              </div>

              <div className="space-y-4">
                {subRows.map((row, i) => (
                  <div key={i} className="border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Vehicle Reg. No (VRN)</label>
                        <input
                          value={row.vehicle_reg_no}
                          onChange={(e) => updateSubRow(i, "vehicle_reg_no", e.target.value)}
                          className="w-full border p-2 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Phone</label>
                        <input
                          value={row.phone}
                          onChange={(e) => updateSubRow(i, "phone", e.target.value)}
                          className="w-full border p-2 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Alt Phone</label>
                        <input
                          value={row.alt_phone}
                          onChange={(e) => updateSubRow(i, "alt_phone", e.target.value)}
                          className="w-full border p-2 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Subject</label>
                        <select
                          value={row.subject}
                          onChange={(e) => updateSubRow(i, "subject", e.target.value)}
                          className="w-full border p-2 rounded"
                        >
                          <option value="">Select Subject</option>
                          <option value="new_fastag">New FASTag</option>
                          <option value="replacement_fastag">Replacement FASTag</option>
                          <option value="hotlisted_fastag">Hotlisted FASTag</option>
                          <option value="kyc_related">KYC Related</option>
                          <option value="mobile_update">Mobile Number Updation</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Assigned To</label>
                        <select
                          value={row.assigned_to}
                          onChange={(e) => updateSubRow(i, "assigned_to", e.target.value)}
                          className="w-full border p-2 rounded"
                        >
                          <option value="self">Self</option>
                          <option value="2">Team Leader</option>
                          <option value="3">Manager</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Status</label>
                        <select
                          value={row.status}
                          onChange={(e) => updateSubRow(i, "status", e.target.value)}
                          className="w-full border p-2 rounded"
                        >
                          <option value="open">Open</option>
                          <option value="processing">Processing</option>
                          <option value="kyc_pending">KYC Pending</option>
                          <option value="done">Done</option>
                          <option value="waiting">Waiting</option>
                          <option value="closed">Closed</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Lead Received From</label>
                        <select
                          value={row.lead_received_from}
                          onChange={(e) => handleRowSourceChange(i, e.target.value)}
                          className="w-full border p-2 rounded"
                        >
                          <option value="">Select Source</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Google Map">Google Map</option>
                          <option value="Other">Other</option>
                          <option value="Toll-agent">Toll-agent</option>
                          <option value="ASM">ASM</option>
                          <option value="Shop">Shop</option>
                          <option value="Showroom">Showroom</option>
                          <option value="TL">TL</option>
                          <option value="Manager">Manager</option>
                        </select>

                        {row.lead_received_from === "Shop" && (
                          <div className="mt-2">
                            <ShopAutocomplete
                              value={row.selectedShop || null}
                              onSelect={(shop) => {
                                updateSubRow(i, "selectedShop", shop);
                                updateSubRow(i, "lead_by", shop ? String(shop.id) : "");
                              }}
                            />
                          </div>
                        )}

                        {["Toll-agent", "ASM", "TL", "Manager"].includes(row.lead_received_from) && (
                          <select
                            value={row.lead_by}
                            onChange={(e) => updateSubRow(i, "lead_by", e.target.value)}
                            className="w-full border p-2 rounded mt-2"
                          >
                            <option value="">{row.loadingUsers ? "Loading..." : `Select ${row.lead_received_from} Name`}</option>
                            {(row.users || []).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Customer Name</label>
                        <input
                          value={row.customer_name}
                          onChange={(e) => updateSubRow(i, "customer_name", e.target.value)}
                          className="w-full border p-2 rounded"
                        />
                      </div>

                      <div className="lg:col-span-4">
                        <label className="block font-semibold mb-1">Details</label>
                        <textarea
                          value={row.details}
                          onChange={(e) => updateSubRow(i, "details", e.target.value)}
                          className="w-full border p-2 rounded"
                          rows={3}
                        />
                      </div>

                      <div className="lg:col-span-4">
                        <label className="block font-semibold mb-1">Comments</label>
                        <input
                          value={row.comments}
                          onChange={(e) => updateSubRow(i, "comments", e.target.value)}
                          className="w-full border p-2 rounded"
                        />
                      </div>

                      <div className="lg:col-span-4 text-right">
                        <button type="button" onClick={() => removeSubRow(i)} className="text-red-600 hover:underline">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={createNewSubTickets}
                  disabled={addingSubs || subRows.every((r) => !r.subject.trim())}
                  className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-60"
                >
                  {addingSubs ? "Adding…" : `Create ${subRows.filter((r) => r.subject.trim()).length || ""} Sub-ticket(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket (Modal) — same as create-new page */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 w-full max-w-5xl relative mx-2 overflow-y-auto max-h-[95vh]">
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-500 text-2xl font-bold"
              onClick={() => setShowCreateModal(false)}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4">Create Ticket</h2>

            <form onSubmit={submitFullCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold mb-1">Vehicle Reg. No (VRN)</label>
                <input
                  name="vehicle_reg_no"
                  required
                  value={fcForm.vehicle_reg_no}
                  onChange={fcHandleChange}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone</label>
                <input
                  name="phone"
                  required
                  value={fcForm.phone}
                  onChange={fcHandleChange}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Alt Phone</label>
                <input
                  name="alt_phone"
                  value={fcForm.alt_phone}
                  onChange={fcHandleChange}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Subject</label>
                <select
                  name="subject"
                  required
                  value={fcForm.subject}
                  onChange={fcHandleChange}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Select Subject</option>
                  <option value="new_fastag">New FASTag</option>
                  <option value="replacement_fastag">Replacement FASTag</option>
                  <option value="hotlisted_fastag">Hotlisted FASTag</option>
                  <option value="kyc_related">KYC Related</option>
                  <option value="mobile_update">Mobile Number Updation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Assigned To</label>
                <select
                  name="assigned_to"
                  value={fcForm.assigned_to}
                  onChange={(e) =>
                    setFcForm((f) => ({
                      ...f,
                      assigned_to: e.target.value === "self" ? String(currentUserId) : e.target.value,
                    }))
                  }
                  className="w-full border p-2 rounded"
                >
                  <option value="self">Self</option>
                  <option value="2">Team Leader</option>
                  <option value="3">Manager</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Status</label>
                <select name="status" value={fcForm.status} onChange={fcHandleChange} className="w-full border p-2 rounded">
                  <option value="open">Open</option>
                  <option value="processing">Processing</option>
                  <option value="kyc_pending">KYC Pending</option>
                  <option value="done">Done</option>
                  <option value="waiting">Waiting</option>
                  <option value="closed">Closed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Lead Received From</label>
                <select
                  name="lead_received_from"
                  value={fcForm.lead_received_from}
                  onChange={fcHandleChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">Select Source</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Google Map">Google Map</option>
                  <option value="Other">Other</option>
                  <option value="Toll-agent">Toll-agent</option>
                  <option value="ASM">ASM</option>
                  <option value="Shop">Shop</option>
                  <option value="Showroom">Showroom</option>
                  <option value="TL">TL</option>
                  <option value="Manager">Manager</option>
                </select>

                {fcForm.lead_received_from === "Shop" && (
                  <div className="mt-2">
                    <ShopAutocomplete
                      value={fcSelectedShop}
                      onSelect={(shop) => {
                        setFcSelectedShop(shop);
                        setFcForm((f) => ({ ...f, role_user_id: shop ? shop.id : "" }));
                      }}
                    />
                  </div>
                )}

                {["Toll-agent", "ASM", "TL", "Manager"].includes(fcForm.lead_received_from) && (
                  <select
                    name="role_user_id"
                    value={fcForm.role_user_id}
                    onChange={fcHandleChange}
                    className="w-full border p-2 rounded mt-2"
                    required
                  >
                    <option value="">{fcLoadingUsers ? "Loading..." : `Select ${fcForm.lead_received_from} Name`}</option>
                    {fcUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">Customer Name</label>
                <input
                  name="customer_name"
                  value={fcForm.customer_name}
                  onChange={fcHandleChange}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div className="lg:col-span-4 md:col-span-2">
                <label className="block font-semibold mb-1">Details</label>
                <textarea
                  name="details"
                  value={fcForm.details}
                  onChange={fcHandleChange}
                  className="w-full border p-2 rounded"
                  rows={3}
                />
              </div>

              <div className="lg:col-span-4 md:col-span-2">
                <label className="block font-semibold mb-1">Comments</label>
                <input
                  name="comments"
                  value={fcForm.comments}
                  onChange={fcHandleChange}
                  className="w-full border p-2 rounded"
                />
              </div>

              {/* Sub-issues rows */}
              <div className="lg:col-span-4 md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-bold">Additional Issues (each row becomes a sub-ticket)</label>
                  <button type="button" onClick={fcAddRow} className="text-orange-600 font-semibold">
                    + Add Row
                  </button>
                </div>

                <div className="space-y-3">
                  {fcSubIssues.map((row, i) => (
                    <div key={i} className="grid md:grid-cols-2 gap-3 border rounded p-3">
                      <div>
                        <label className="block font-semibold mb-1">Issue Subject</label>
                        <input
                          value={row.subject}
                          onChange={(e) => fcUpdateRow(i, "subject", e.target.value)}
                          placeholder="e.g., KYC Pending / Hotlist / Replacement"
                          className="w-full border p-2 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Details</label>
                        <input
                          value={row.details}
                          onChange={(e) => fcUpdateRow(i, "details", e.target.value)}
                          className="w-full border p-2 rounded"
                        />
                      </div>
                      <div className="md:col-span-2 text-right">
                        <button type="button" onClick={() => fcRemoveRow(i)} className="text-red-600 hover:underline">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="lg:col-span-4 md:col-span-2 flex gap-2 justify-end">
                {fcError && <div className="text-red-600 mr-auto">{fcError}</div>}
                <button type="button" className="px-4 py-2 rounded border" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fcSaving}
                  className="bg-orange-500 text-white px-6 py-2 rounded shadow hover:bg-orange-600 disabled:opacity-60"
                >
                  {fcSaving ? "Saving..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
