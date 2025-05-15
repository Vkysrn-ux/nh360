"use client";
import { useState } from "react";

export default function RegisterUserForm({ role = "agent" }: { role?: "agent" | "user" }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    commission_rate: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create body based on role
    const payload = {
      ...form,
      role,
    };

    // If not agent, remove commission_rate
    if (role !== "agent") {
      delete payload.commission_rate;
    }

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
      <h2 className="text-xl font-bold">Register {role === "agent" ? "Agent" : "User"}</h2>
      <input name="name" placeholder="Name" onChange={handleChange} required className="border rounded px-3 py-2" />
      <input name="email" placeholder="Email" type="email" onChange={handleChange} required className="border rounded px-3 py-2" />
      <input name="phone" placeholder="Phone" onChange={handleChange} required className="border rounded px-3 py-2" />
      <input name="address" placeholder="Address" onChange={handleChange} required className="border rounded px-3 py-2" />
      <input name="password" placeholder="Password (optional)" type="password" onChange={handleChange} className="border rounded px-3 py-2" />

      {role === "agent" && (
        <input
          name="commission_rate"
          placeholder="Commission %"
          type="number"
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
      )}

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Register {role === "agent" ? "Agent" : "User"}
      </button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}
