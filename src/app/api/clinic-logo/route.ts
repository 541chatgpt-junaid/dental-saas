import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";
import { invalidateClinic } from "@/lib/clinicCache";

// The clinic logo shown on the public booking page. Only the clinic owner can
// change it; the clinic always comes from the signed-in user. Files go to the
// public "clinic-logos" bucket under the clinic's own folder.

const BUCKET = "clinic-logos";
const MAX_BYTES = 1024 * 1024;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** The file's real type from its first bytes, not from what the browser claims */
function sniff(b: Uint8Array): { ext: string; type: string } | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

async function clearFolder(db: NonNullable<Awaited<ReturnType<typeof clinicOwner>>>["db"], clinicId: string) {
  const { data } = await db.storage.from(BUCKET).list(clinicId);
  if (data?.length) await db.storage.from(BUCKET).remove(data.map(f => `${clinicId}/${f.name}`));
}

export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can change the logo.", 403);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Choose an image file.");
  if (file.size > MAX_BYTES) return fail("The logo must be 1 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return fail("Use a PNG, JPG or WebP image.");

  const { db, clinicId } = o;
  await clearFolder(db, clinicId);
  // A new name each time so browsers and the booking page never show a stale logo
  const path = `${clinicId}/logo-${Date.now()}.${kind.ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, upsert: false });
  if (error) return fail("Could not upload the logo. Please try again.", 500);
  const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: saveErr } = await db.from("clinics").update({ logo_url: url }).eq("id", clinicId);
  if (saveErr) return fail("Could not save the logo. Please try again.", 500);
  invalidateClinic(clinicId);
  return NextResponse.json({ success: true, url });
}

export async function DELETE() {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can change the logo.", 403);
  await clearFolder(o.db, o.clinicId);
  const { error } = await o.db.from("clinics").update({ logo_url: null }).eq("id", o.clinicId);
  if (error) return fail("Could not remove the logo. Please try again.", 500);
  invalidateClinic(o.clinicId);
  return NextResponse.json({ success: true });
}
