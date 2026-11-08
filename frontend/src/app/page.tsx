"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  Database, 
  Server, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Cpu
} from "lucide-react";

interface HealthData {
  status: string;
  app_name: string;
  version: string;
  database_connected: boolean;
  timestamp: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl}/api/v1/health`, {
        cache: "no-store",
      });
      const end = performance.now();
      setLatency(Math.round(end - start));

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      const data: HealthData = await res.json();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to connect to backend API");
      }
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                PhotoFinder AI
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Stage 1 Foundation
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a
              href={`${apiUrl}/api/v1/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <span>API Swagger</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Banner Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Development Checkpoint & Architecture Verification</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            AI-Powered Event Photo Platform
          </h1>
          <p className="text-slate-400 max-w-2xl text-base">
            Stage 1 establishes the unified Next.js + FastAPI + pgvector foundation. 
            Verify backend service communication, PostgreSQL vector readiness, and health telemetry below.
          </p>
        </div>

        {/* Live Diagnostics Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Live Backend Health Telemetry</h2>
                <p className="text-xs text-slate-400 font-mono">Target: {apiUrl}/api/v1/health</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lastChecked && (
                <span className="text-xs text-slate-400">
                  Last checked: <span className="text-slate-200 font-mono">{lastChecked}</span>
                </span>
              )}
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Probe</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Metric */}
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>FastAPI Service</span>
                <Server className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                {loading ? (
                  <span className="text-sm text-slate-400 animate-pulse">Connecting...</span>
                ) : health ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-base font-bold text-emerald-400 uppercase tracking-wider font-mono">
                      {health.status}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                    <span className="text-base font-bold text-rose-400 font-mono">OFFLINE</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {health ? `${health.app_name} (v${health.version})` : error || "Connection failed"}
              </p>
            </div>

            {/* Database Metric */}
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>PostgreSQL + pgvector</span>
                <Database className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                {loading ? (
                  <span className="text-sm text-slate-400 animate-pulse">Checking DB...</span>
                ) : health?.database_connected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-base font-bold text-emerald-400 font-mono">CONNECTED</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                    <span className="text-base font-bold text-amber-400 font-mono">STANDBY / DISCONNECTED</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {health?.database_connected
                  ? "PostgreSQL connectivity operational"
                  : "Database awaiting Docker start"}
              </p>
            </div>

            {/* Latency Metric */}
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Round-Trip Latency</span>
                <Activity className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100">
                {latency !== null ? `${latency} ms` : "—"}
              </div>
              <p className="text-[11px] text-slate-400">Frontend to API response</p>
            </div>

            {/* Environment Metric */}
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Architecture</span>
                <Layers className="h-4 w-4" />
              </div>
              <div className="text-base font-bold font-mono text-indigo-400">
                Next.js 15 + FastAPI
              </div>
              <p className="text-[11px] text-slate-400">Modular Clean Architecture</p>
            </div>
          </div>

          {/* Raw JSON Inspector */}
          {health && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Raw Health Endpoint Response Payload</span>
                <span className="font-mono text-emerald-400">HTTP 200 OK</span>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                {JSON.stringify(health, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                Backend Connection Notice
              </div>
              <p>
                Could not reach the backend at <code className="text-rose-200">{apiUrl}/api/v1/health</code>.
                Ensure the FastAPI backend is running via <code className="text-indigo-300">uvicorn app.main:app --reload</code> or Docker Compose.
              </p>
            </div>
          )}
        </div>

        {/* System Architecture Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-semibold text-slate-100">Next.js 15 Frontend</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full TypeScript App Router stack, styled with Tailwind CSS and Lucide React. 
              Equipped with camera APIs ready for attendee selfie capture and responsive event galleries.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-semibold text-slate-100">FastAPI 0.115 Backend</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Modular Python API separated into core, models, schemas, services, AI provider adapters, and storage. 
              Includes Pydantic validation, strict CORS, and structured health telemetry.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-semibold text-slate-100">PostgreSQL + pgvector</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Containerized pgvector database with persistent volume storage, ready for high-dimensional facial embedding storage 
              and exact/ANN similarity search with strict event-level scoping.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-400">
        AI-Powered Event Photo Platform • Stage 1 Project Foundation
      </footer>
    </div>
  );
}
