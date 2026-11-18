"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Settings, 
  Bell, 
  Shield, 
  Sparkles, 
  Check, 
  Save 
} from "lucide-react";

const STORAGE_KEY = "sharext_settings";

export default function SettingsPage() {
  const [matchConfidence, setMatchConfidence] = useState(75);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<{
        matchConfidence: number;
        emailAlerts: boolean;
        autoDownload: boolean;
        publicProfile: boolean;
      }>;
      /* eslint-disable react-hooks/set-state-in-effect -- hydrate saved preferences once */
      if (typeof stored.matchConfidence === "number") setMatchConfidence(stored.matchConfidence);
      if (typeof stored.emailAlerts === "boolean") setEmailAlerts(stored.emailAlerts);
      if (typeof stored.autoDownload === "boolean") setAutoDownload(stored.autoDownload);
      if (typeof stored.publicProfile === "boolean") setPublicProfile(stored.publicProfile);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Ignore malformed local data and keep the defaults.
    }
  }, []);

  const handleSave = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ matchConfidence, emailAlerts, autoDownload, publicProfile })
      );
    } catch {
      // Saving can be blocked; the confirmation still appears for the session.
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout>
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center shadow-md">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Settings
              </h1>
              <p className="text-slate-500 text-sm">
                Configure your AI matching sensitivity, notification preferences, and privacy controls.
              </p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* 1. AI Face Recognition & Matching Sensitivity */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
              <Sparkles className="h-5 w-5 text-[#FCAA02]" />
              <span>AI Face Recognition & Matching</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Match Confidence Threshold</h4>
                  <p className="text-xs text-slate-500">
                    Higher values return fewer false positives; lower values find more angles/lighting variations.
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-[#0053FF] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                  {matchConfidence}%
                </span>
              </div>

              <input
                type="range"
                min="50"
                max="95"
                aria-label="Match confidence threshold"
                value={matchConfidence}
                onChange={(e) => setMatchConfidence(Number(e.target.value))}
                className="w-full accent-[#0053FF] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>More matches (50%)</span>
                <span>Balanced (75%)</span>
                <span>Strict accuracy (95%)</span>
              </div>
            </div>
          </div>

          {/* 2. Notifications & Alerts */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
              <Bell className="h-5 w-5 text-[#0053FF]" />
              <span>Notifications & Alerts</span>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Instant Face Match Notifications</div>
                  <div className="text-xs text-slate-500">Email me immediately when an event uploads new photos containing my face.</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[#0053FF] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Automatic Premium High-Res Cloud Sync</div>
                  <div className="text-xs text-slate-500">Automatically sync full-resolution photos to your private vault.</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoDownload}
                  onChange={(e) => setAutoDownload(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[#0053FF] rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* 3. Privacy & Security */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span>Privacy & Security</span>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Profile Searchability</div>
                  <div className="text-xs text-slate-500">Allow event organizers to invite you to private galleries based on past attendances.</div>
                </div>
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(e) => setPublicProfile(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[#0053FF] rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <p role="status" aria-live="polite" className="text-xs font-semibold text-emerald-600">
              {saved && (
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4" /> Preferences saved
                </span>
              )}
            </p>

            <button
              onClick={handleSave}
              className="inline-flex shrink-0 items-center gap-2 px-6 py-3 rounded-xl bg-[#0053FF] hover:bg-[#0047db] active:scale-95 text-white font-bold text-sm transition-all shadow-md shadow-[#0053FF]/20 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save preferences</span>
            </button>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

