"use client";
import { useEffect, useState } from "react";

const ROLES = [
  { label: "Regional Manager (ASM)", value: "asm" },
  { label: "Manager", value: "manager" },
  { label: "Team Leader (TL)", value: "team-leader" },
  { label: "Shop", value: "shop" },
  { label: "FSE", value: "fse" },
  { label: "Showroom", value: "showroom" },
  { label: "Toll Agent", value: "toll-agent" },
  { label: "Channel Partner", value: "channel-partner" },
];

const BANKS = [
  { label: "IDFC", value: "IDFC" },
  { label: "Axis", value: "Axis" },
  { label: "ICICI", value: "ICICI" },
  // ...add more as needed
];

// Defines which parent fields (dropdowns) to show for each role
const ROLE_PARENT_FIELDS: Record<string, string[]> = {
  asm: [],
  "channel-partner": [],
  manager: ["asm"],
  "team-leader": ["asm", "manager"],
  shop: ["asm", "manager", "team-leader"],
  fse: ["asm", "manager", "team-leader"],
  showroom: ["asm", "manager", "team-leader"],
  "toll-agent": ["asm", "manager", "team-leader"],
};

type Agent = {
  id: number;
  name: string;
  role: string;
  parent_user_id?: number;
};

export default function RegisterAgentForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    pincode: "",
    role: "asm",
    area: "",
    parent_asm: "",
    parent_manager: "",
    parent_team_leader: "",
    bank_ids: [{ bank_name: "", bank_reference_id: "" }],
  });
  const [message, setMessage] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);

  // Fetches all agents for dropdowns, always up to date
  const fetchAgents = () => {
    fetch("/api/agents/all")
      .then(res => res.json())
      .then(data => setAgents(data));
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Handles normal and role-specific changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      // When role changes, reset parent fields and area
      ...(name === "role"
        ? {
            parent_asm: "",
            parent_manager: "",
            parent_team_leader: "",
            area: value === "asm" ? prev.area : "",
            bank_ids:
              value === "toll-agent"
                ? prev.bank_ids.length
                  ? prev.bank_ids
                  : [{ bank_name: "", bank_reference_id: "" }]
                : [{ bank_name: "", bank_reference_id: "" }],
          }
        : {}),
    }));
  };

  // Dynamic handlers for bank_ids array
  const addBankId = () =>
    setForm(prev => ({
      ...prev,
      bank_ids: [...prev.bank_ids, { bank_name: "", bank_reference_id: "" }],
    }));

  const removeBankId = (idx: number) =>
    setForm(prev => ({
      ...prev,
      bank_ids: prev.bank_ids.length > 1 ? prev.bank_ids.filter((_, i) => i !== idx) : prev.bank_ids,
    }));

  const handleBankIdChange = (idx: number, field: string, value: string) =>
    setForm(prev => ({
      ...prev,
      bank_ids: prev.bank_ids.map((entry, i) =>
        i === idx ? { ...entry, [field]: value } : entry
      ),
    }));

  // Renders a parent agent dropdown (for ASM, Manager, Team Leader)
  const getParentDropdown = (roleField: string, roleLabel: string, options: Agent[], value: string) => (
    <div className="flex flex-col">
      <label className="text-sm font-semibold mb-1">{roleLabel}</label>
      <select
        name={roleField}
        value={value}
        onChange={handleChange}
        className="border rounded px-3 py-2"
      >
        <option value="">Direct/Admin/-</option>
        {options.map(a => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.role.replace("-", " ").toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );

  // Build payload and determine parent_user_id priority on submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine parent_user_id priority (Team Leader > Manager > ASM > NULL)
    let parent_user_id = null;
    if (form.parent_team_leader) parent_user_id = Number(form.parent_team_leader);
    else if (form.parent_manager) parent_user_id = Number(form.parent_manager);
    else if (form.parent_asm) parent_user_id = Number(form.parent_asm);

    const payload: any = {
      ...form,
      parent_user_id,
    };

    if (form.role !== "asm") delete payload.area;
    if (form.role !== "toll-agent") delete payload.bank_ids;
    // Remove extra parent fields (backend only uses parent_user_id)
    delete payload.parent_asm;
    delete payload.parent_manager;
    delete payload.parent_team_leader;

    if (!parent_user_id) payload.parent_user_id = null;

    const res = await fetch("/api/agents/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMessage(data.success ? `✅ Registered! ID: ${data.userId}` : `❌ ${data.error || "Registration failed"}`);
    if (data.success) {
      setForm({
        name: "",
        phone: "",
        pincode: "",
        role: "asm",
        area: "",
        parent_asm: "",
        parent_manager: "",
        parent_team_leader: "",
        bank_ids: [{ bank_name: "", bank_reference_id: "" }],
      });
      fetchAgents(); // Always refresh agents after registration
    }
  };

  // Parent dropdown fields based on role (all optional, default is direct/admin/-)
  const parentFields = ROLE_PARENT_FIELDS[form.role] || [];

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
      {/* Area input for ASM only */}
      {form.role === "asm" && (
        <input
          name="area"
          placeholder="Area (e.g., Coimbatore, Chennai)"
          value={form.area}
          onChange={handleChange}
          required
          className="border rounded px-3 py-2"
        />
      )}
      {/* Parent dropdowns dynamically rendered */}
      {parentFields.includes("asm") &&
        getParentDropdown("parent_asm", "Select ASM (Regional Manager)", agents.filter(a => a.role === "asm"), form.parent_asm)
      }
      {parentFields.includes("manager") &&
        getParentDropdown("parent_manager", "Select Manager", agents.filter(a => a.role === "manager"), form.parent_manager)
      }
      {parentFields.includes("team-leader") &&
        getParentDropdown("parent_team_leader", "Select Team Leader (TL)", agents.filter(a => a.role === "team-leader"), form.parent_team_leader)
      }
      {/* Bank fields for Toll Agent only */}
      {form.role === "toll-agent" && (
        <div>
          <label className="block font-semibold mb-2">Bank Details</label>
          {form.bank_ids.map((entry, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <select
                name="bank_name"
                value={entry.bank_name}
                onChange={e => handleBankIdChange(idx, "bank_name", e.target.value)}
                required
                className="border rounded px-3 py-2"
              >
                <option value="">Select Bank</option>
                {BANKS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
              <input
                name="bank_reference_id"
                placeholder="Referral/Third Party ID"
                value={entry.bank_reference_id}
                onChange={e => handleBankIdChange(idx, "bank_reference_id", e.target.value)}
                required
                className="border rounded px-3 py-2"
              />
              {form.bank_ids.length > 1 && (
                <button type="button" onClick={() => removeBankId(idx)} className="text-red-500 font-bold">X</button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="bg-green-600 text-white px-3 py-1 rounded"
            onClick={addBankId}
          >
            + Add Bank
          </button>
        </div>
      )}
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Register
      </button>
      {message && <p className="text-sm mt-2">{message}</p>}
    </form>
  );
}
