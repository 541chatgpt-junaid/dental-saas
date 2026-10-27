"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/dateFormat";
import { Columns2, ExternalLink, FileText, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { saveErrorMessage } from "@/lib/formSave";
import EmptyState from "@/components/EmptyState";

type Category = "xray" | "opg" | "before" | "after" | "document";
interface PatientFile {
  id: string; file_path: string; file_name: string; mime_type: string | null; size_bytes: number | null;
  category: Category; note: string | null; created_at: string; url?: string;
}

const BUCKET = "patient-files";
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const CATEGORIES: { key: Category; label: string }[] = [
  { key: "xray", label: "X-ray" }, { key: "opg", label: "OPG" },
  { key: "before", label: "Before" }, { key: "after", label: "After" }, { key: "document", label: "Document" },
];
const catLabel = (c: Category) => CATEGORIES.find(x => x.key === c)?.label ?? c;
const fmtSize = (b: number | null) => (!b ? "" : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/** Shrinks large phone photos to at most 2000px / JPEG so uploads stay fast. PDFs and small images pass through. */
async function prepare(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export default function PatientFiles({ patientId, clinicId }: { patientId: number; clinicId: string | null }) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<Category>("xray");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(0);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [viewing, setViewing] = useState<PatientFile | null>(null);
  const [compare, setCompare] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: e } = await supabase.from("patient_files").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
    if (e) { setError("Could not load files. Has supabase_clinic_tools.sql been run?"); setLoading(false); return; }
    const rows = data as PatientFile[];
    if (rows.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map(r => r.file_path), 60 * 60);
      const urls = new Map((signed || []).map(s => [s.path, s.signedUrl]));
      rows.forEach(r => { r.url = urls.get(r.file_path) || undefined; });
    }
    setError("");
    setFiles(rows);
    setLoading(false);
  }, [patientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
  useEffect(() => { load(); }, [load]);

  const upload = async (list: FileList | null) => {
    if (!list?.length || !clinicId) return;
    setError("");
    const supabase = createClient();
    const picked = Array.from(list);
    setUploading(picked.length);
    for (const original of picked) {
      if (!ACCEPTED.includes(original.type)) { setError(`${original.name}: only JPG, PNG, WebP or PDF files can be uploaded.`); setUploading(n => n - 1); continue; }
      const file = await prepare(original);
      if (file.size > MAX_BYTES) { setError(`${original.name} is larger than 10 MB.`); setUploading(n => n - 1); continue; }
      const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
      const path = `${clinicId}/${patientId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) { setError(`${original.name}: ${upErr.message}`); setUploading(n => n - 1); continue; }
      const { error: rowErr } = await supabase.from("patient_files").insert([{
        clinic_id: clinicId, patient_id: patientId, file_path: path, file_name: original.name,
        mime_type: file.type, size_bytes: file.size, category, note: note.trim() || null,
      }]);
      if (rowErr) { await supabase.storage.from(BUCKET).remove([path]); setError(`${original.name}: ${rowErr.message}`); }
      setUploading(n => n - 1);
    }
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
    load();
  };

  const remove = async (f: PatientFile) => {
    if (!confirm(`Delete ${f.file_name}? This cannot be undone.`)) return;
    setViewing(null);
    setFiles(list => list.filter(x => x.id !== f.id));
    const supabase = createClient();
    const { error } = await supabase.from("patient_files").delete().eq("id", f.id);
    if (error) {
      // Keep the file (and its record) when the record can't be deleted
      setFiles(list => [f, ...list]);
      alert(saveErrorMessage(error, "file").replace("save", "delete"));
      return;
    }
    await supabase.storage.from(BUCKET).remove([f.file_path]);
  };

  const shown = files.filter(f => filter === "all" || f.category === filter);
  const isImage = (f: PatientFile) => (f.mime_type || "").startsWith("image/");
  const latest = (c: Category) => files.find(f => f.category === c && isImage(f));
  const before = latest("before"), after = latest("after");

  return (
    <div className="space-y-4">
      <div className="form-panel bg-white rounded-xl border border-brand-100 p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-brand-600">Type</span>
            <select value={category} onChange={e => setCategory(e.target.value as Category)}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="block min-w-[200px] flex-1">
            <span className="mb-1 block text-xs text-brand-600">Note</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Periapical #36, pre-RCT"
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
          </label>
          <input ref={inputRef} type="file" multiple accept={ACCEPTED.join(",")} className="hidden" onChange={e => upload(e.target.files)} />
          <button onClick={() => inputRef.current?.click()} disabled={!!uploading || !clinicId}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? `Uploading ${uploading}…` : "Upload files"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-brand-500">JPG, PNG, WebP or PDF up to 10 MB. Large photos are resized automatically. Files are private to your clinic.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {([["all", "All"], ...CATEGORIES.map(c => [c.key, c.label])] as [Category | "all", string][]).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-full px-3.5 py-1 text-xs font-medium ${filter === k ? "bg-brand-700 text-white" : "border border-brand-200 bg-white text-brand-700 hover:border-gold"}`}>
            {l} ({k === "all" ? files.length : files.filter(f => f.category === k).length})
          </button>
        ))}
        {before && after && (
          <button onClick={() => setCompare(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-1 text-xs font-semibold text-navy">
            <Columns2 className="h-3.5 w-3.5" /> Compare before / after
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-brand-400">Loading files…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-brand-100 bg-white">
          <EmptyState icon={ImagePlus} title="No files yet" hint="Upload X-rays, OPGs and before/after photos to keep them with this patient's record." />
        </div>
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map(f => (
            <button key={f.id} onClick={() => (isImage(f) ? setViewing(f) : f.url && window.open(f.url, "_blank", "noopener"))}
              className="group overflow-hidden rounded-xl border border-brand-100 bg-white text-left transition-shadow hover:shadow-lg">
              <div className="relative aspect-[4/3] bg-brand-50">
                {isImage(f) && f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.file_name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-brand-400"><FileText className="h-10 w-10" /></div>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-navy/80 px-2 py-0.5 text-[10px] font-semibold text-white">{catLabel(f.category)}</span>
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-medium text-brand-800">{f.note || f.file_name}</p>
                <p className="text-[10px] text-brand-500">{formatDate(f.created_at)} · {fmtSize(f.size_bytes)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {viewing && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-3" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewing.url} alt={viewing.file_name} className="max-h-[75vh] w-full rounded-xl bg-black object-contain" />
            <div className="flex flex-wrap items-center gap-2 px-1 pt-3">
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{catLabel(viewing.category)}</span>
              <p className="min-w-0 flex-1 truncate text-sm text-brand-800">{viewing.note || viewing.file_name}</p>
              <a href={viewing.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold"><ExternalLink className="h-3.5 w-3.5" /> Full size</a>
              <button onClick={() => remove(viewing)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              <button onClick={() => setViewing(null)} aria-label="Close" className="rounded-lg p-1.5 text-brand-500 hover:bg-brand-50"><X className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {compare && before && after && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4 backdrop-blur-sm" onClick={() => setCompare(false)}>
          <div className="w-full max-w-5xl rounded-2xl bg-white p-4" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-brand-800">Before / After</h3>
              <button onClick={() => setCompare(false)} aria-label="Close" className="rounded-lg p-1.5 text-brand-500 hover:bg-brand-50"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[before, after].map(f => (
                <figure key={f.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.file_name} className="aspect-[4/3] w-full rounded-xl bg-black object-contain" />
                  <figcaption className="mt-1.5 text-center text-xs text-brand-600">
                    <span className="font-semibold">{catLabel(f.category)}</span> · {formatDate(f.created_at)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
