import { useEffect, useState } from "react";

export default function AgentDetailModal({ agent, onClose }) {
  const [fastags, setFastags] = useState([]);
  const [filters, setFilters] = useState({ bank: "", classType: "", status: "" });
  const [supplierFilter, setSupplierFilter] = useState("");

  useEffect(() => {
    if (agent?.id) {
      fetch(`/api/fastags?assigned_to=${agent.id}`)
        .then(res => res.json())
        .then(setFastags);
    }
  }, [agent]);

  // Filtering logic
  const filteredFastags = fastags
    .filter(tag =>
      (!filters.bank || tag.bank_name === filters.bank) &&
      (!filters.classType || tag.fastag_class === filters.classType) &&
      (!filters.status || tag.status === filters.status) &&
      (!supplierFilter || (tag.supplier_short || tag.supplier_name) === supplierFilter)
    );

  // Calculate stats
  const soldCount = fastags.filter(tag => tag.status === "sold").length;
  const reassignedCount = fastags.filter(tag => tag.status === "reassigned").length;
  const availableCount = fastags.filter(tag => tag.status === "assigned" || tag.status === "available").length;

  // Unique filter options
  const bankOptions = [...new Set(fastags.map(t => t.bank_name))].filter(Boolean);
  const classOptions = [...new Set(fastags.map(t => t.fastag_class))].filter(Boolean);
  const statusOptions = [...new Set(fastags.map(t => t.status))].filter(Boolean);
  const uniqueSuppliers = Array.from(new Set(fastags.map(tag => tag.supplier_short || tag.supplier_name))).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-lg max-w-2xl w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-red-600 text-2xl">&times;</button>
        <h3 className="text-xl font-bold mb-2">{agent.name} (Agent Details)</h3>
        <div className="mb-4">
          <div><b>Email:</b> {agent.email}</div>
          <div><b>Phone:</b> {agent.phone}</div>
          <div><b>Commission:</b> {agent.commission_rate}%</div>
          <div><b>Status:</b> {agent.status}</div>
        </div>
        <div className="mb-4">
          <b>FASTag Stats:</b>
          <ul>
            <li>Sold: {soldCount}</li>
            <li>Reassigned: {reassignedCount}</li>
            <li>Available: {availableCount}</li>
            <li>Total: {fastags.length}</li>
          </ul>
        </div>
        {/* Filters */}
        <div className="flex gap-4 mb-4 flex-wrap">
          <select
            className="border p-2 rounded"
            value={filters.bank}
            onChange={e => setFilters(f => ({ ...f, bank: e.target.value }))}
          >
            <option value="">All Banks</option>
            {bankOptions.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            className="border p-2 rounded"
            value={filters.classType}
            onChange={e => setFilters(f => ({ ...f, classType: e.target.value }))}
          >
            <option value="">All Classes</option>
            {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="border p-2 rounded"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="border p-2 rounded"
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
          >
            <option value="">All Suppliers</option>
            {uniqueSuppliers.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {/* Filtered FASTags Table */}
        <div className="overflow-auto max-h-72">
          <table className="w-full text-sm border">
            <thead>
              <tr>
                <th className="border px-2 py-1">Tag Serial</th>
                <th className="border px-2 py-1">Bank</th>
                <th className="border px-2 py-1">Class</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Assigned/Updated</th>
                <th className="border px-2 py-1">Supplier</th>
                <th className="border px-2 py-1">Current Holder</th>
              </tr>
            </thead>
            <tbody>
              {filteredFastags.map(tag => (
                <tr key={tag.tag_serial}>
                  <td className="border px-2 py-1">{tag.tag_serial}</td>
                  <td className="border px-2 py-1">{tag.bank_name}</td>
                  <td className="border px-2 py-1">{tag.fastag_class}</td>
                  <td className="border px-2 py-1">{tag.status}</td>
                  <td className="border px-2 py-1">{tag.assigned_date ? new Date(tag.assigned_date).toLocaleString() : "-"}</td>
                  <td className="border px-2 py-1">{tag.supplier_short || tag.supplier_name}</td>
                  <td className="border px-2 py-1">{tag.current_holder}</td>
                </tr>
              ))}
              {filteredFastags.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-3">No FASTags found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
