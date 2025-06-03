"use client";
import { useState, useEffect } from "react";
import Link from "next/link"

export default function TicketListPage() {
  const [tickets, setTickets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [editTicket, setEditTicket] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Fetch tickets
  const fetchTickets = () => {
    fetch("/api/tickets")
      .then(res => res.json())
      .then(data => setTickets(data || []))
      .catch(() => setTickets([]));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleView = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedTicket(null);
  };

  // Edit handlers
  const handleEdit = (ticket) => {
    setEditTicket(ticket);
    setEditForm(ticket);
    setShowModal(false);
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    await fetch("/api/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, id: editTicket.id }),
    });
    setEditTicket(null);
    fetchTickets(); // Refresh list
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">FASTag Ticket List</h1>
      <Link href="/admin/tickets/new">
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded shadow font-semibold">
          + Create Ticket
        </button>
      </Link>
      <table className="min-w-full border mt-4">
        <thead>
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Mobile</th>
            <th className="px-4 py-2">Vehicle</th>
            <th className="px-4 py-2">Source</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Created</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td className="border px-4 py-2">{t.id}</td>
              <td className="border px-4 py-2">{t.customer_name}</td>
              <td className="border px-4 py-2">{t.phone}</td>
              <td className="border px-4 py-2">{t.vehicle_reg_no}</td>
              {/* --- Source: Main → Sub --- */}
              <td className="border px-4 py-2">
                {t.lead_received_from_sub
                  ? `${t.lead_received_from} → ${t.lead_received_from_sub}`
                  : t.lead_received_from}
              </td>
              <td className="border px-4 py-2">{t.status}</td>
              <td className="border px-4 py-2">
                {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
              </td>
              <td className="border px-4 py-2">
                <button
                  className="text-orange-500 hover:underline mr-2"
                  onClick={() => handleView(t)}
                >
                  View
                </button>
                <button
                  className="text-blue-500 hover:underline"
                  onClick={() => handleEdit(t)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* View Modal */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute top-4 right-4 text-gray-600 hover:text-red-500 text-2xl font-bold"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Ticket Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <Detail label="Ticket No" value={selectedTicket.ticket_no} />
              <Detail label="Customer" value={selectedTicket.customer_name} />
              <Detail label="Mobile" value={selectedTicket.phone} />
              <Detail label="Vehicle" value={selectedTicket.vehicle_reg_no} />
              {/* --- Source: Main → Sub --- */}
              <Detail
                label="Source"
                value={
                  selectedTicket.lead_received_from_sub
                    ? `${selectedTicket.lead_received_from} → ${selectedTicket.lead_received_from_sub}`
                    : selectedTicket.lead_received_from
                }
              />
              <Detail label="Status" value={selectedTicket.status} />
              <Detail label="Created" value={selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : ""} />
              <Detail label="Subject" value={selectedTicket.subject} />
              <Detail label="Assigned To" value={selectedTicket.assigned_to} />
              <Detail label="Alt Phone" value={selectedTicket.alt_phone} />
              <Detail label="Lead By" value={selectedTicket.lead_by} />
              <Detail label="Comments" value={selectedTicket.comments} />
            </div>
            <div className="mt-4">
              <span className="font-semibold">Details:</span>
              <div className="whitespace-pre-line border rounded p-2 bg-gray-50 mt-1">
                {selectedTicket.details}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 w-full max-w-lg relative mx-2 overflow-y-auto max-h-[95vh]">
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-500 text-2xl font-bold"
              onClick={() => setEditTicket(null)}
              aria-label="Close"
            >×</button>
            <h2 className="text-xl font-bold mb-4">Edit Ticket</h2>
            <form onSubmit={submitEdit} className="space-y-3">
              <Input label="Customer Name" name="customer_name" value={editForm.customer_name || ""} onChange={handleEditChange} />
              <Input label="Mobile" name="phone" value={editForm.phone || ""} onChange={handleEditChange} />
              {/* Vehicle No is just shown, not editable */}
              <div className="mb-2">
                <label className="block font-semibold mb-1">Vehicle No</label>
                <div className="px-2 py-2 border rounded bg-gray-100 text-gray-500">{editTicket.vehicle_reg_no || "-"}</div>
              </div>
              <Input label="Status" name="status" value={editForm.status || ""} onChange={handleEditChange} />
              <Input label="Subject" name="subject" value={editForm.subject || ""} onChange={handleEditChange} />
              <Input label="Assigned To" name="assigned_to" value={editForm.assigned_to || ""} onChange={handleEditChange} />
              <Input label="Alt Phone" name="alt_phone" value={editForm.alt_phone || ""} onChange={handleEditChange} />
              <Input label="Lead By" name="lead_by" value={editForm.lead_by || ""} onChange={handleEditChange} />
              {/* --- Source: Main menu (not editable here) --- */}
              <Input label="Source" name="lead_received_from" value={editForm.lead_received_from || ""} onChange={handleEditChange} />
              {/* --- Sub value for ASM/Shop --- */}
              {editForm.lead_received_from && (
                <Input
                  label={
                    editForm.lead_received_from === "Shop"
                      ? "Shop Name"
                      : "User Name"
                  }
                  name="lead_received_from_sub"
                  value={editForm.lead_received_from_sub || ""}
                  onChange={handleEditChange}
                />
              )}
              <Input label="Comments" name="comments" value={editForm.comments || ""} onChange={handleEditChange} />
              <div>
                <label className="block font-semibold mb-1">Details</label>
                <textarea
                  className="border rounded w-full p-2"
                  name="details"
                  value={editForm.details || ""}
                  onChange={handleEditChange}
                  rows={3}
                />
              </div>
              <button className="bg-blue-500 text-white px-4 py-2 rounded w-full sm:w-auto" type="submit">
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="mb-2">
      <span className="font-semibold">{label}:</span> {value ?? "-"}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="mb-2">
      <label className="block font-semibold mb-1">{label}</label>
      <input className="border rounded w-full p-2" {...props} />
    </div>
  );
}
