"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";

interface Lab {
  id: number;
  patient_name: string;
  lab_name: string;
  work_type: string;
  units: number;
  shade: string;
  material: string;
  given_date: string;
  delivery_date: string;
  fee: number;
  fee_paid: number;
  status: string;
  notes: string;
  tooth_chart: string;
  user_id: string;
}

const WORK_TYPES = [
  "Crown","Bridge","Denture","Retainer","Night Guard",
  "Implant Crown","Implant Bridge","Veneer","Inlay","Onlay",
  "Post & Core","Coping","Full Mouth Rehabilitation","Partial Denture",
  "Complete Denture","Flipper","Maryland Bridge","Zirconia Bridge",
  "PFM Bridge","Surgical Stent","Bleaching Tray","Sport Guard",
];

const MATERIALS = [
  "Zirconia","PFM (Porcelain Fused to Metal)","E-max (Lithium Disilicate)",
  "Acrylic","Metal (Cobalt Chrome)","Metal (Gold Alloy)",
  "Full Cast Metal","Composite Resin","PEEK","Titanium",
  "Hybrid Ceramic","Feldspathic Porcelain","Pressed Ceramic",
  "BruxZir Solid Zirconia","Multilayer Zirconia","High Translucency Zirconia",
];

const UPPER_TEETH = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const LOWER_TEETH = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

const TOOTH_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  crown:   { bg:"#FAEEDA", border:"#BA7517", text:"#633806", label:"CRW" },
  bridge:  { bg:"#E1F5EE", border:"#0F6E56", text:"#085041", label:"BRG" },
  missing: { bg:"#FCEBEB", border:"#A32D2D", text:"#791F1F", label:"MSS" },
  implant: { bg:"#EEEDFE", border:"#534AB7", text:"#3C3489", label:"IMP" },
  veneer:  { bg:"#FBEAF0", border:"#993556", text:"#72243E", label:"VNR" },
  rct:     { bg:"#FAC775", border:"#854F0B", text:"#633806", label:"RCT" },
  inlay:   { bg:"#E6F1FB", border:"#185FA5", text:"#0C447C", label:"INL" },
  pontic:  { bg:"#D3D1C7", border:"#5F5E5A", text:"#2C2C2A", label:"PNT" },
  guard:   { bg:"#EAF3DE", border:"#3B6D11", text:"#27500A", label:"GRD" },
  denture: { bg:"#F4C0D1", border:"#993556", text:"#72243E", label:"DEN" },
};

function getWorkKey(wt: string): string {
  const w = wt.toLowerCase();
  if (w.includes("bridge")) return "bridge";
  if (w.includes("implant")) return "implant";
  if (w.includes("veneer")) return "veneer";
  if (w.includes("rct") || w.includes("post")) return "rct";
  if (w.includes("inlay") || w.includes("onlay")) return "inlay";
  if (w.includes("missing")) return "missing";
  if (w.includes("pontic")) return "pontic";
  if (w.includes("night guard") || w.includes("sport guard") || w.includes("bleaching") || w.includes("retainer") || w.includes("stent")) return "guard";
  if (w.includes("denture") || w.includes("flipper") || w.includes("full mouth")) return "denture";
  return "crown";
}

function getAutoTeeth(wt: string): Record<string, string> {
  const w = wt.toLowerCase();
  const key = getWorkKey(wt);
  const all32: Record<string, string> = {};
  const allUpper: Record<string, string> = {};
  const allLower: Record<string, string> = {};
  UPPER_TEETH.forEach(t => { all32[t] = key; allUpper[t] = key; });
  LOWER_TEETH.forEach(t => { all32[t] = key; allLower[t] = key; });

  if (w.includes("complete denture") || w.includes("full mouth") || w.includes("bleaching tray") || w.includes("night guard") || w.includes("sport guard")) return all32;
  if (w.includes("upper") && w.includes("denture")) return allUpper;
  if (w.includes("lower") && w.includes("denture")) return allLower;
  if (w.includes("denture") || w.includes("flipper")) return all32;
  if (w.includes("retainer") || w.includes("surgical stent")) return all32;
  return {};
}

function ToothChart({ value, onChange, workType, onUnitsChange }: {
  value: string;
  onChange: (v: string) => void;
  workType: string;
  onUnitsChange: (u: string) => void;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [prevWorkType, setPrevWorkType] = useState(workType);

  useEffect(() => {
    try { if (value) setSelected(JSON.parse(value)); } catch {}
  }, []);

  useEffect(() => {
    if (workType === prevWorkType) return;
    setPrevWorkType(workType);
    const auto = getAutoTeeth(workType);
    if (Object.keys(auto).length > 0) {
      setSelected(auto);
      onChange(JSON.stringify(auto));
      onUnitsChange(String(Object.keys(auto).length));
    } else {
      setSelected({});
      onChange("");
      onUnitsChange("1");
    }
  }, [workType]);

  const handleTooth = (num: string) => {
    const updated = { ...selected };
    const workKey = getWorkKey(workType);
    if (updated[num]) {
      delete updated[num];
    } else {
      updated[num] = workKey;
    }
    setSelected(updated);
    onChange(JSON.stringify(updated));
    onUnitsChange(String(Object.keys(updated).length || 1));
  };

  const ToothBtn = ({ num }: { num: string }) => {
    const work = selected[num];
    const col = work ? TOOTH_COLORS[work] : null;
    const isMolar = parseInt(num[1]) >= 6;
    return (
      <button
        type="button"
        onClick={() => handleTooth(num)}
        style={col ? { backgroundColor: col.bg, borderColor: col.border, color: col.text } : {}}
        className={`${isMolar ? "w-8 h-9" : "w-7 h-8"} text-xs rounded border font-medium transition-all flex flex-col items-center justify-center
          ${!col ? "bg-white border-teal-200 text-teal-600 hover:bg-teal-50" : ""}`}
      >
        <span className="text-[9px] leading-none">{num}</span>
        {col && <span className="text-[7px] leading-none mt-0.5">{col.label}</span>}
      </button>
    );
  };

  const summary: Record<string, string[]> = {};
  Object.entries(selected).forEach(([t, w]) => {
    if (!summary[w]) summary[w] = [];
    summary[w].push(t);
  });

  const currentKey = getWorkKey(workType);
  const currentCol = TOOTH_COLORS[currentKey] || TOOTH_COLORS.crown;
  const selectedCount = Object.keys(selected).length;

  return (
    <div className="border border-teal-100 rounded-xl p-3 bg-teal-50 md:col-span-2">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-xs font-semibold text-teal-700">Tooth Chart (FDI) — click tooth to mark / unmark</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-teal-500">Active work:</span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full border"
            style={{ backgroundColor: currentCol.bg, borderColor: currentCol.border, color: currentCol.text }}
          >
            {workType}
          </span>
          {selectedCount > 0 && (
            <span className="text-xs text-teal-500">{selectedCount} teeth</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex items-center justify-center gap-0.5 mb-1">
            <span className="text-[10px] text-teal-400 w-14 text-right mr-1">Upper R</span>
            {UPPER_TEETH.slice(0,8).map(n => <ToothBtn key={n} num={n} />)}
            <div className="w-px h-8 bg-teal-300 mx-1" />
            {UPPER_TEETH.slice(8).map(n => <ToothBtn key={n} num={n} />)}
            <span className="text-[10px] text-teal-400 w-14 ml-1">Upper L</span>
          </div>
          <div className="border-t border-teal-200 my-1 mx-14" />
          <div className="flex items-center justify-center gap-0.5 mt-1">
            <span className="text-[10px] text-teal-400 w-14 text-right mr-1">Lower R</span>
            {LOWER_TEETH.slice(0,8).map(n => <ToothBtn key={n} num={n} />)}
            <div className="w-px h-8 bg-teal-300 mx-1" />
            {LOWER_TEETH.slice(8).map(n => <ToothBtn key={n} num={n} />)}
            <span className="text-[10px] text-teal-400 w-14 ml-1">Lower L</span>
          </div>
        </div>
      </div>

      {Object.keys(summary).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(summary).map(([w, ts]) => (
            <span key={w} className="text-[10px] bg-white border border-teal-200 text-teal-700 px-2 py-0.5 rounded-full">
              {w}: {ts.join(", ")}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            const auto = getAutoTeeth(workType);
            const allKey = getWorkKey(workType);
            const all32: Record<string, string> = {};
            UPPER_TEETH.forEach(t => { all32[t] = allKey; });
            LOWER_TEETH.forEach(t => { all32[t] = allKey; });
            const target = Object.keys(auto).length > 0 ? auto : all32;
            setSelected(target);
            onChange(JSON.stringify(target));
            onUnitsChange(String(Object.keys(target).length));
          }}
          className="text-xs text-teal-600 hover:underline"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => {
            const allKey = getWorkKey(workType);
            const upper: Record<string, string> = {};
            UPPER_TEETH.forEach(t => { upper[t] = allKey; });
            setSelected(upper);
            onChange(JSON.stringify(upper));
            onUnitsChange(String(UPPER_TEETH.length));
          }}
          className="text-xs text-teal-600 hover:underline"
        >
          Upper only
        </button>
        <button
          type="button"
          onClick={() => {
            const allKey = getWorkKey(workType);
            const lower: Record<string, string> = {};
            LOWER_TEETH.forEach(t => { lower[t] = allKey; });
            setSelected(lower);
            onChange(JSON.stringify(lower));
            onUnitsChange(String(LOWER_TEETH.length));
          }}
          className="text-xs text-teal-600 hover:underline"
        >
          Lower only
        </button>
        {Object.keys(selected).length > 0 && (
          <button
            type="button"
            onClick={() => { setSelected({}); onChange(""); onUnitsChange("1"); }}
            className="text-xs text-red-400 hover:underline"
          >
            Reset all
          </button>
        )}
      </div>
    </div>
  );
}

export default function Labs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    patient_name: "", lab_name: "", work_type: "Crown",
    units: "1", shade: "", material: "Zirconia",
    given_date: "", delivery_date: "", fee: "", fee_paid: "0",
    status: "Pending", notes: "", tooth_chart: "",
  });
  const router = useRouter();
  const { symbol } = useCurrency();

  const fetchLabs = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("labs").select("*").eq("user_id", user?.id).order("id", { ascending: false });
    if (data) setLabs(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchLabs();
  }, [router]);

  const resetForm = () => {
    setForm({ patient_name: "", lab_name: "", work_type: "Crown", units: "1", shade: "", material: "Zirconia", given_date: "", delivery_date: "", fee: "", fee_paid: "0", status: "Pending", notes: "", tooth_chart: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("labs").insert([{
      patient_name: form.patient_name, lab_name: form.lab_name,
      work_type: form.work_type, units: parseInt(form.units) || 1,
      shade: form.shade, material: form.material,
      given_date: form.given_date, delivery_date: form.delivery_date,
      fee: parseInt(form.fee) || 0, fee_paid: parseInt(form.fee_paid) || 0,
      status: form.status, notes: form.notes,
      tooth_chart: form.tooth_chart, user_id: user?.id,
    }]);
    resetForm();
    setLoading(false);
    fetchLabs();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("labs").update({
      patient_name: form.patient_name, lab_name: form.lab_name,
      work_type: form.work_type, units: parseInt(form.units) || 1,
      shade: form.shade, material: form.material,
      given_date: form.given_date, delivery_date: form.delivery_date,
      fee: parseInt(form.fee) || 0, fee_paid: parseInt(form.fee_paid) || 0,
      status: form.status, notes: form.notes, tooth_chart: form.tooth_chart,
    }).eq("id", editingId);
    resetForm();
    setLoading(false);
    fetchLabs();
  };

  const openEdit = (l: Lab) => {
    setEditingId(l.id);
    setForm({
      patient_name: l.patient_name, lab_name: l.lab_name,
      work_type: l.work_type, units: l.units.toString(),
      shade: l.shade || "", material: l.material,
      given_date: l.given_date || "", delivery_date: l.delivery_date || "",
      fee: l.fee.toString(), fee_paid: l.fee_paid.toString(),
      status: l.status, notes: l.notes || "", tooth_chart: l.tooth_chart || "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this lab record?")) return;
    const supabase = createClient();
    await supabase.from("labs").delete().eq("id", id);
    fetchLabs();
  };

  const handlePayment = async (lab: Lab, extraPayment: number) => {
    const supabase = createClient();
    const newPaid = lab.fee_paid + extraPayment;
    const newStatus = newPaid >= lab.fee ? "Delivered" : lab.status;
    await supabase.from("labs").update({ fee_paid: newPaid, status: newStatus }).eq("id", lab.id);
    fetchLabs();
  };

  const updateStatus = async (lab: Lab, newStatus: string) => {
    const supabase = createClient();
    await supabase.from("labs").update({ status: newStatus }).eq("id", lab.id);
    fetchLabs();
  };

  const getChartSummary = (chartJson: string) => {
    try {
      const data = JSON.parse(chartJson);
      const keys = Object.keys(data);
      if (!keys.length) return "";
      return keys.slice(0, 4).join(", ") + (keys.length > 4 ? ` +${keys.length - 4} more` : "");
    } catch { return ""; }
  };

  const showAnyForm = showForm || !!editingId;

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Lab Records</h2>
            <p className="text-sm text-teal-600 mt-1">Total: {labs.length} records</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add</button>
        </div>

        {showAnyForm && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">{editingId ? "Edit Lab Record" : "New Lab Record"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">

              <input placeholder="Patient Name" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Lab Name" value={form.lab_name} onChange={e => setForm({...form, lab_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />

              <div>
                <label className="block text-xs text-teal-600 mb-1">Work Type</label>
                <select value={form.work_type} onChange={e => setForm({...form, work_type: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {WORK_TYPES.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-teal-600 mb-1">Units (auto from chart)</label>
                <input type="number" value={form.units} onChange={e => setForm({...form, units: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>

              <input placeholder="Shade (e.g. A1, B2, OM2)" value={form.shade} onChange={e => setForm({...form, shade: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />

              <div>
                <label className="block text-xs text-teal-600 mb-1">Material</label>
                <select value={form.material} onChange={e => setForm({...form, material: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {MATERIALS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-teal-600 mb-1">Given Date</label>
                <input type="date" value={form.given_date} onChange={e => setForm({...form, given_date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-teal-600 mb-1">Delivery Date</label>
                <input type="date" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>

              <input placeholder={`Total Fee (${symbol})`} type="number" value={form.fee} onChange={e => setForm({...form, fee: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder={`Fee Paid (${symbol})`} type="number" value={form.fee_paid} onChange={e => setForm({...form, fee_paid: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />

              <div>
                <label className="block text-xs text-teal-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Quality Check</option>
                  <option>Ready</option>
                  <option>Delivered</option>
                </select>
              </div>

              <input placeholder="Notes / Special instructions" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />

              <ToothChart
                value={form.tooth_chart}
                workType={form.work_type}
                onChange={v => setForm(prev => ({...prev, tooth_chart: v}))}
                onUnitsChange={u => setForm(prev => ({...prev, units: u}))}
              />

            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : editingId ? "Update Record" : "Save Record"}
              </button>
              <button onClick={resetForm} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
          <div className="md:hidden divide-y divide-teal-50">
            {labs.length === 0 ? (
              <p className="text-center py-10 text-teal-400 text-sm">No lab records yet</p>
            ) : (
              labs.map(l => (
                <div key={l.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-teal-800 text-sm">{l.patient_name}</p>
                      <p className="text-xs text-teal-500">{l.lab_name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      l.status === "Delivered" ? "bg-green-100 text-green-700" :
                      l.status === "Ready" ? "bg-blue-100 text-blue-700" :
                      l.status === "Quality Check" ? "bg-purple-100 text-purple-700" :
                      l.status === "In Progress" ? "bg-yellow-100 text-yellow-700" :
                      "bg-orange-100 text-orange-700"}`}>{l.status}</span>
                  </div>
                  <p className="text-xs text-teal-600">{l.work_type} x{l.units} · {l.shade} · {l.material}</p>
                  {l.tooth_chart && <p className="text-xs text-teal-400 mt-0.5">Teeth: {getChartSummary(l.tooth_chart)}</p>}
                  <p className="text-xs text-teal-400 mt-1">Delivery: {l.delivery_date}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-teal-600">Paid: {symbol} {l.fee_paid} / {symbol} {l.fee}</p>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(l)} className="text-teal-600 text-xs font-medium">✏️</button>
                      {l.fee_paid < l.fee && <button onClick={() => { const a = prompt(`Payment:`); if (a) handlePayment(l, parseInt(a)); }} className="text-teal-600 text-xs font-medium">Pay</button>}
                      {l.status !== "Delivered" && <button onClick={() => updateStatus(l, "Delivered")} className="text-green-600 text-xs font-medium">Delivered</button>}
                      <button onClick={() => handleDelete(l.id)} className="text-red-400 text-xs font-medium">🗑️</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teal-50">
                <tr>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Patient</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Lab</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Work</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Teeth</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Delivery</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Fee</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Paid</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {labs.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-teal-400">No lab records yet</td></tr>
                ) : (
                  labs.map(l => (
                    <tr key={l.id} className="border-t border-teal-50 hover:bg-teal-50">
                      <td className="px-4 py-3 font-medium text-teal-800">{l.patient_name}</td>
                      <td className="px-4 py-3 text-teal-700">{l.lab_name}</td>
                      <td className="px-4 py-3 text-teal-700">
                        {l.work_type} x{l.units}
                        <p className="text-xs text-teal-400">{l.shade} · {l.material}</p>
                      </td>
                      <td className="px-4 py-3 text-teal-500 text-xs max-w-24">{getChartSummary(l.tooth_chart)}</td>
                      <td className="px-4 py-3 text-teal-700">{l.delivery_date}</td>
                      <td className="px-4 py-3 text-teal-700">{symbol} {l.fee}</td>
                      <td className="px-4 py-3 text-teal-700">{symbol} {l.fee_paid}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          l.status === "Delivered" ? "bg-green-100 text-green-700" :
                          l.status === "Ready" ? "bg-blue-100 text-blue-700" :
                          l.status === "Quality Check" ? "bg-purple-100 text-purple-700" :
                          l.status === "In Progress" ? "bg-yellow-100 text-yellow-700" :
                          "bg-orange-100 text-orange-700"}`}>{l.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => openEdit(l)} className="text-teal-600 text-xs font-medium">✏️ Edit</button>
                          {l.fee_paid < l.fee && <button onClick={() => { const a = prompt(`Payment for ${l.patient_name}:`); if (a) handlePayment(l, parseInt(a)); }} className="text-teal-600 text-xs font-medium">Pay</button>}
                          {l.status !== "Delivered" && <button onClick={() => updateStatus(l, "Delivered")} className="text-green-600 text-xs font-medium">Delivered</button>}
                          <button onClick={() => handleDelete(l.id)} className="text-red-400 text-xs font-medium">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}