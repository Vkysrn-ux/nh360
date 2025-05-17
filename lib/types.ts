export type FastagItem = {
  id: number;
  tag_serial: string;
  status: "in_stock" | "assigned" | "sold" | "deactivated";
  assigned_to_agent_id: number | null;
  purchase_price: number;
  assigned_to_role: "admin" | "agent" | "sold"; // optional, used for logic
};
