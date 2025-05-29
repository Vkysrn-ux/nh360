"use client";
import { useEffect, useState } from "react";

// Define available roles for dropdown
const ROLES = [
  { label: "Toll Agent", value: "toll-agent" },
  { label: "Team Leader", value: "team-leader" },
  { label: "Executive", value: "executive" },
  { label: "Shop / SHO", value: "shop" },
];

type Agent = {
  id: number;
  name: string;
  role: string;
};

export default function RegisterAgentForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    pincode: "",
    role: "toll-agent",
    parent_agent_id: "",
  });
  const [message, setMessage] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);

  // Fetch all agents (and other valid parent roles)
  useEffect(() => {
    fetch("/api/agents/all")
      .then(res => res.json())
      .then(data => setAgents(data));
  }, []);

  // Handle changes in any form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Map frontend value to backend field name
    const payload = {
      ...form,
      parent_user_id: form.parent_agent_id ? Number(form.parent_agent_id) : null,
    };
    delete payload.parent_agent_id;
    if (!payload.parent_user_id) delete payload.parent_user_id;

    const res = await fetch("/api/agents/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setMessage(data.success ? `✅ Registered! ID: ${data.userId}` : `❌ ${data.error}`);
    if (data.success) {
      setForm({
        name: "",
        phone: "",
        pincode: "",
        role: "toll-agent",
        parent_agent_id: "",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 max-w-xl p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold">Register Agent/Shop</h2>
      <input
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={handleChange}
        required
        className="border rounded px-3 py-2"
      />
      <input
        name="phone"
        placeholder="Phone"
        value={form.phone}
        onChange={handleChange}
        required
        className="border rounded px-3 py-2"
      />
      <input
        name="pincode"
        placeholder="Pincode"
        value={form.pincode}
        onChange={handleChange}
        required
        className="border rounded px-3 py-2"
      />

      {/* Role Selector */}
      <select
        name="role"
        value={form.role}
        onChange={handleChange}
        className="border rounded px-3 py-2"
      >
        {ROLES.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      {/* Parent Agent Selector */}
      <select
        name="parent_agent_id"
        value={form.parent_agent_id}
        onChange={handleChange}
        className="border rounded px-3 py-2"
      >
        <option value="">No Parent (Top-level)</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.role})
          </option>
        ))}
      </select>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Register
      </button>
      {message && <p className="text-sm mt-2">{message}</p>}
    </form>
  );
}
