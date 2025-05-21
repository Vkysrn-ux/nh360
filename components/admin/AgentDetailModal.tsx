import { useEffect, useState } from "react";

export default function AgentDetailModal({ agent, onClose }) {
  const [fastags, setFastags] = useState([]);
  const [filters, setFilters] = useState({ bank: "", classType: "", status: "" });

  useEffect(() => {
    // Fetch fastags assigned to this agent (replace with your API call)
    fetch(`/api/fastags?assigned_to=${agent.id}`).then(res => res.json()).then(setFastags);
  }, [agent]);

  // Filtering logic
  const filteredFastags = fastags.filter(tag => {
    return (!filters.bank || tag.bank_name === filters.bank) &&
           (!filters.classType || tag.fastag_class === filters.classType) &&
           (!filters.status || tag.status === filters.status);
  });

  // Calculate stats
  const soldCount = fastags.filter(tag => tag.status === "sold").length;
  const reassignedCount = fastags.filter(tag => tag.status === "reassigned").length;
  const availableCount = fastags.filter(tag => tag.status === "available").length;

  // Unique filter options
  const bankOptions = [...new Set(fastags.map(t => t.bank_name))].filter(Boolean);
  const classOptions = [...new Set(fastags.map(t => t.fastag_class))].filter(Boolean);
  const statusOptions = [...new Set(fastags.map(t => t.status))].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-lg max-w-2xl w-full">
        <button onClick={onClose} className="float-right text-gray-500 hover:text-red-600">&times;</button>
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
        <div className="flex gap-4 mb-4">
          <select
            className="border p-2 rounded"
            value={filters.bank}
            onChange={e => setFilters(f => ({ ...f, bank: e.target.value }))}
          >
            <option value="">All Banks</option>
            {bankOptions.map(b => <option key={b}>{b}</option>)}
          </select>
          <select
            className="border p-2 rounded"
            value={filters.classType}
            onChange={e => setFilters(f => ({ ...f, classType: e.target.value }))}
          >
            <option value="">All Classes</option>
            {classOptions.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            className="border p-2 rounded"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Status</option>
            {statusOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {/* Filtered FASTags Table */}
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Tag ID</th>
              <th>Bank</th>
              <th>Class</th>
              <th>Status</th>
              <th>Assigned/Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredFastags.map(tag => (
              <tr key={tag.id}>
                <td>{tag.tag_number}</td>
                <td>{tag.bank_name}</td>
                <td>{tag.fastag_class}</td>
                <td>{tag.status}</td>
                <td>{tag.updated_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
