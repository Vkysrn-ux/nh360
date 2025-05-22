"use client";
import { useState } from "react";

export default function RegisterUserForm({ role = "agent" }: { role?: "agent" | "user" }) {
  // For agent, only these fields
  const [form, setForm] = useState({
    name: "",
    phone: "",
    pincode: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only send what's needed
    const payload: any = { ...form, role };

    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setMessage(data.success ? `✅ Registered! ID: ${data.userId}` : `❌ ${data.error}`);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 max-w-xl p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold">Register Agent</h2>
      <input
        name="name"
        placeholder="Name"
        onChange={handleChange}
        required
        className="border rounded px-3 py-2"
      />
      <input
        name="phone"
        placeholder="Phone"
        onChange={handleChange}
        required
        className="border rounded px-3 py-2"
      />
      <input
        name="pincode"
        placeholder="Pincode"
        onChange={handleChange}
        required
        className="border rounded px-3 py-2"
      />

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Register Agent
      </button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}
