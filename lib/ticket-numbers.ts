import type { PoolConnection } from "mysql2/promise";

// Generate ticket number like NH360-YYYYMMDD-### for parent tickets
export async function generateTicketNo(conn: PoolConnection): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}${mm}${dd}`;

  const [rows] = await conn.query(
    "SELECT COUNT(*) AS count FROM tickets_nh WHERE DATE(created_at) = CURDATE()",
  );
  // @ts-ignore - RowDataPacket
  const todayCount = rows?.[0]?.count || 0;
  const seq = String(todayCount + 1).padStart(3, "0");
  return `NH360-${todayStr}-${seq}`;
}

// Generate ticket number for a child ticket using parent ticket_no
export async function generateChildTicketNo(
  conn: PoolConnection,
  parentId: number,
  parentTicketNo?: string,
): Promise<string> {
  let base = parentTicketNo;
  if (!base) {
    const [prow]: any = await conn.query(
      "SELECT ticket_no FROM tickets_nh WHERE id = ?",
      [parentId],
    );
    base = prow?.[0]?.ticket_no;
  }
  if (!base) {
    throw new Error("Parent ticket not found");
  }

  const [rows]: any = await conn.query(
    "SELECT COUNT(*) AS count FROM tickets_nh WHERE parent_ticket_id = ?",
    [parentId],
  );
  const count = rows?.[0]?.count || 0;
  const seq = String(count + 1).padStart(2, "0");
  return `${base}-${seq}`;
}
