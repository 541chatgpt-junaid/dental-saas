"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useCurrency } from "@/lib/useCurrency";

interface ReceiptProps {
  patient: {
    id: number;
    name: string;
    phone: string;
    address: string;
    age: number;
    gender: string;
    treatment: string;
    tooth_number: string;
    doctor_name: string;
    fee_total: number;
    fee_paid: number;
    status: string;
    created_at: string;
  };
  onClose: () => void;
}

interface Settings {
  clinic_name: string;
  clinic_address: string;
  clinic_phone: string;
  clinic_email: string;
}

export default function Receipt({ patient, onClose }: ReceiptProps) {
  const [settings, setSettings] = useState<Settings>({
    clinic_name: "DentEase Clinic",
    clinic_address: "",
    clinic_phone: "",
    clinic_email: "",
  });
  const { symbol } = useCurrency();

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("settings").select("*").single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  const remaining = patient.fee_total - patient.fee_paid;
  const date = new Date(patient.created_at).toLocaleDateString("en-PK", {
    day: "numeric", month: "long", year: "numeric"
  });

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl my-auto">

        {/* Action Buttons */}
        <div className="flex gap-2 p-3 bg-gray-50 border-b rounded-t-2xl print:hidden">
          <button onClick={handlePrint} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-xl text-xs font-medium">
            🖨️ Print
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-100 py-2 rounded-xl text-xs font-medium">
            Close
          </button>
        </div>

        {/* Receipt */}
        <div className="p-5">

          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold text-teal-700">{settings.clinic_name}</h1>
            {settings.clinic_address && <p className="text-xs text-gray-400">{settings.clinic_address}</p>}
            {settings.clinic_phone && <p className="text-xs text-gray-400">{settings.clinic_phone}</p>}
            {settings.clinic_email && <p className="text-xs text-gray-400">{settings.clinic_email}</p>}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 border-t-2 border-dashed border-gray-200"></div>
            <span className="text-xs text-gray-400 font-medium">RECEIPT</span>
            <div className="flex-1 border-t-2 border-dashed border-gray-200"></div>
          </div>

          {/* Receipt Info */}
          <div className="flex justify-between text-xs text-gray-400 mb-3">
            <span>Receipt #00{patient.id}</span>
            <span>{date}</span>
          </div>

          {/* Patient Info */}
          <div className="bg-teal-50 rounded-xl p-3 mb-3">
            <p className="text-xs font-semibold text-teal-600 mb-1.5">PATIENT DETAILS</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Name</span>
                <span className="text-xs font-semibold text-gray-700">{patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Phone</span>
                <span className="text-xs font-semibold text-gray-700">{patient.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Age / Gender</span>
                <span className="text-xs font-semibold text-gray-700">{patient.age} yrs · {patient.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Doctor</span>
                <span className="text-xs font-semibold text-gray-700">{patient.doctor_name || "-"}</span>
              </div>
            </div>
          </div>

          {/* Treatment */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">TREATMENT</p>
            <div className="flex justify-between items-center py-1.5 border-b border-dashed border-gray-100">
              <div>
                <p className="text-xs font-medium text-gray-700">{patient.treatment || "General Checkup"}</p>
                {patient.tooth_number && <p className="text-xs text-gray-400">Tooth: {patient.tooth_number}</p>}
              </div>
              <p className="text-xs font-semibold text-gray-700">{symbol} {patient.fee_total?.toLocaleString()}</p>
            </div>
          </div>

          {/* Fee Summary */}
          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total Fee</span>
              <span className="font-medium text-gray-700">{symbol} {patient.fee_total?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-semibold text-green-600">{symbol} {patient.fee_paid?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Remaining</span>
              <span className={`font-semibold ${remaining > 0 ? "text-orange-500" : "text-green-600"}`}>
                {symbol} {remaining?.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`rounded-xl p-2.5 text-center mb-3 ${patient.status === "Paid" ? "bg-green-50" : "bg-orange-50"}`}>
            <p className={`text-xs font-bold ${patient.status === "Paid" ? "text-green-600" : "text-orange-500"}`}>
              {patient.status === "Paid" ? "✅ FULLY PAID" : "⏳ PAYMENT PENDING"}
            </p>
          </div>

          {/* Footer */}
          <div className="text-center border-t border-dashed border-gray-200 pt-3">
            <p className="text-xs text-gray-400">Thank you for visiting</p>
            <p className="text-xs font-semibold text-teal-600">{settings.clinic_name}</p>
          </div>

        </div>
      </div>
    </div>
  );
}