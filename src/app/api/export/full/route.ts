import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";
import { BACKUP_TABLES, NEVER_BACKED_UP, snapshotClinic } from "@/lib/backup";

// The clinic's complete data, every table the app keeps for the clinic, as one Excel
// workbook (a sheet per table) or as JSON. Credentials and secret links are left out.
export const maxDuration = 60;
const CELL = 32000;   // Excel's limit is 32,767 characters per cell
const BINARY = new Set(["signature_png"]);

export async function GET(request: Request) {
  const o = await clinicOwner();
  if (!o) return NextResponse.json({ error: "Only the clinic owner can export all data." }, { status: 403 });
  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "xlsx";
  const snap = await snapshotClinic(o.db, o.clinicId);
  const day = snap.taken_at.slice(0, 10);

  if (format === "json") {
    return new Response(JSON.stringify(snap, null, 1), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="dentease-all-data-${day}.json"` } });
  }
  const wb = XLSX.utils.book_new();
  const about = [
    { Item: "Exported", Value: snap.taken_at },
    { Item: "Tables", Value: Object.keys(snap.tables).length },
    { Item: "Left out on purpose", Value: `${NEVER_BACKED_UP.join(", ")} (credentials and secret links). Drawn signatures are in the JSON export.` },
    ...BACKUP_TABLES.filter(t => snap.tables[t]).map(t => ({ Item: `Rows in ${t}`, Value: snap.tables[t].length })),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(about), "About");
  for (const t of BACKUP_TABLES) {
    const rows = snap.tables[t];
    if (!rows) continue;
    const flat = rows.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => !BINARY.has(k)).map(([k, v]) => {
      const x = v !== null && typeof v === "object" ? JSON.stringify(v) : v;
      return [k, typeof x === "string" && x.length > CELL ? x.slice(0, CELL) : x];
    })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat.length ? flat : [{}]), t.slice(0, 31));
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="dentease-all-data-${day}.xlsx"` } });
}
