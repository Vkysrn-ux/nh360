export interface FastagItem {
  id: string;
  bankName: string;
  fastagType: string;
  batchNumber: string;
  price: number;
  assignedTo: string | null;
  assignedToRole: "admin" | "agent" | "sold";
  status: string;
  createdAt: string;
}
