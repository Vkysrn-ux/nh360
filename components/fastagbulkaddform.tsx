"use client";
import React, { useState, useEffect } from "react";

type Supplier = { id: number; name: string };

export default function FastagBulkAddForm() {
  const [form, setForm] = useState({
    serial_from: "",
    serial_to: "",
    supplier_id: "",
    purchase_date: "",
    purchase_price: "",
    remarks: "",
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetch suppliers from API
    fetch("/api/suppliers")
      .then((res) => res.json())
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Submitting...");
    const res = await fetch("/api/fastags/bulk-add", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setMessage(data.success ? `✅ Added ${data.count} Fastags!` : `❌ ${data.error}`);
  };

  return (
    <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold mb-8 text-center">Fastag Inventory - Bulk Add</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="mb-1 text-gray-600 font-medium block">Serial From</label>
          <input
            name="serial_from"
            type="number"
            className="border w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Start Serial"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="mb-1 text-gray-600 font-medium block">Serial To</label>
          <input
            name="serial_to"
            type="number"
            className="border w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="End Serial"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="mb-1 text-gray-600 font-medium block">Supplier</label>
          <select
            name="supplier_id"
            className="border w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.supplier_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 text-gray-600 font-medium block">Purchase Date</label>
          <input
            name="purchase_date"
            type="date"
            className="border w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="mb-1 text-gray-600 font-medium block">Price</label>
          <input
            name="purchase_price"
            type="number"
            className="border w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Purchase Price"
            onChange={handleChange}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 text-gray-600 font-medium block">Remarks</label>
          <input
            name="remarks"
            type="text"
            className="border w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Remarks (optional)"
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="bg-blue-600 w-full text-white font-semibold px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
          >
            Add Fastags
          </button>
        </div>
      </form>
      {message && <div className="mt-6 text-center text-lg">{message}</div>}
    </div>
  );
}
