"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  api, 
  EventItem, 
  EventStats, 
  SelfieSearchResult, 
  SelfieSearchResponse 
} from "@/lib/api";
import { 
  Camera, 
  UploadCloud, 
  Sparkles, 
  ShieldCheck, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sliders, 
  Users, 
  Maximize2, 
  X, 
  Calendar, 
  Layers, 
  ArrowLeft,
  Share2,
  Check,
  SwitchCamera,
  Compass,
  Trash2,
  ChevronRight,
  RotateCcw
} from "lucide-react";

type AngleType = "front" | "left" | "right";

interface AngleSlot {
  key: AngleType;
  title: string;
  badge: string;
  description: string;
  guidePrompt: string;
  rotationDegree: number;
  file: File | null;
  previewUrl: string | null;
}

function AttendeeSearchContent() {
  const params = useParams();
  const rawIdentifier = params.eventId as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab: "guided" (3 angle slots with live click / upload on each) vs "batch" (drop multiple photos)
  const [activeTab, setActiveTab] = useState<"guided" | "batch">("guided");

  // 3-Angle Guided State
  const [angleSlots, setAngleSlots] = useState<Record<AngleType, AngleSlot>>({
    front: {
      key: "front",
      title: "Front Face",
      badge: "Angle 1",
      description: "Direct frontal view with natural lighting",
      guidePrompt: "Look straight into the camera",
      rotationDegree: 0,
      file: null,
      previewUrl: null,
    },
    left: {
      key: "left",
      title: "Left Profile",
      badge: "Angle 2",
      description: "Turn head 30° to 45° to your left",
      guidePrompt: "Turn your head slightly to the left",
      rotationDegree: -8,
      file: null,
      previewUrl: null,
    },
    right: {
      key: "right",
      title: "Right Profile",
      badge: "Angle 3",
      description: "Turn head 30° to 45° to your right",
      guidePrompt: "Turn your head slightly to the right",
      rotationDegree: 8,
      file: null,
      previewUrl: null,
    },
  });

  // Modal Camera Viewfinder State (for clicking live selfie for any angle)
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTargetAngle, setCameraTargetAngle] = useState<AngleType>("front");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File upload input ref & target
  const slotFileRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const [targetSlotUpload, setTargetSlotUpload] = useState<AngleType>("front");

  const triggerNativeCamera = (angle: AngleType) => {
    setTargetSlotUpload(angle);
    nativeCameraRef.current?.click();
  };

  // Batch Multi-Photo Dropzone State
  const [batchFiles, setBatchFiles] = useState<{ file: File; previewUrl: string }[]>([]);

  // Search Settings & State
  const [tolerance, setTolerance] = useState<number>(0.48);
  const [searching, setSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SelfieSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Lightbox Modal
  const [activePhoto, setActivePhoto] = useState<SelfieSearchResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load Event
  useEffect(() => {
    async function loadEvent() {
      if (!rawIdentifier) return;
      setLoading(true);
      setError(null);
      try {
        let ev: EventItem;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawIdentifier);
        
        if (isUuid) {
          ev = await api.getEvent(rawIdentifier);
        } else {
          try {
            ev = await api.getEventBySlug(rawIdentifier);
          } catch {
            ev = await api.getEvent(rawIdentifier);
          }
        }
        setEvent(ev);

        const st = await api.getEventStats(ev.id).catch(() => null);
        setStats(st);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load event.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [rawIdentifier]);

  // Camera Management
  const startCameraStream = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Camera unavailable or permission denied. Please allow camera access in browser or upload a photo directly.");
      setCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const openCameraForAngle = (angle: AngleType) => {
    setCameraTargetAngle(angle);
    setCameraModalOpen(true);
    startCameraStream();
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setCameraModalOpen(false);
  };

  // Flip front/back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    if (cameraModalOpen) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraModalOpen, facingMode]);

  // Click / Snap photo from live camera
  const handleSnapCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie_${cameraTargetAngle}.jpg`, { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(blob);

      setAngleSlots((prev) => ({
        ...prev,
        [cameraTargetAngle]: {
          ...prev[cameraTargetAngle],
          file,
          previewUrl,
        },
      }));

      // Next angle suggestion logic
      if (cameraTargetAngle === "front" && !angleSlots.left.file) {
        setCameraTargetAngle("left");
      } else if (cameraTargetAngle === "left" && !angleSlots.right.file) {
        setCameraTargetAngle("right");
      } else {
        closeCameraModal();
      }
    }, "image/jpeg", 0.95);
  };

  // Upload photo into an angle slot
  const handleSlotFileSelected = (angle: AngleType, file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const validExts = [".jpg", ".jpeg", ".png", ".webp"];
    if (!validExts.includes(ext) && !file.type.startsWith("image/")) {
      setSearchError("Please select a JPG, JPEG, PNG, or WebP photo.");
      return;
    }

    setSearchError(null);
    const previewUrl = URL.createObjectURL(file);
    setAngleSlots((prev) => ({
      ...prev,
      [angle]: {
        ...prev[angle],
        file,
        previewUrl,
      },
    }));
  };

  const clearSlot = (angle: AngleType) => {
    const current = angleSlots[angle];
    if (current.previewUrl) {
      URL.revokeObjectURL(current.previewUrl);
    }
    setAngleSlots((prev) => ({
      ...prev,
      [angle]: {
        ...prev[angle],
        file: null,
        previewUrl: null,
      },
    }));
  };

  // Batch Multi-Photo Handlers
  const handleBatchFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: { file: File; previewUrl: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) continue;
      newItems.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setBatchFiles((prev) => [...prev, ...newItems]);
    setSearchError(null);
    e.target.value = "";
  };

  const removeBatchFile = (index: number) => {
    setBatchFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Gather probe files for search
  const getSelectedFiles = (): File[] => {
    if (activeTab === "guided") {
      const files: File[] = [];
      if (angleSlots.front.file) files.push(angleSlots.front.file);
      if (angleSlots.left.file) files.push(angleSlots.left.file);
      if (angleSlots.right.file) files.push(angleSlots.right.file);
      return files;
    } else {
      return batchFiles.map((b) => b.file);
    }
  };

  // Search Action
  const handleSearch = async () => {
    if (!event) return;
    const probeFiles = getSelectedFiles();
    if (probeFiles.length === 0) {
      setSearchError("Please capture or upload at least one selfie angle to search.");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResponse(null);

    try {
      const response = await api.searchBySelfie(event.id, probeFiles, tolerance, 60);
      setSearchResponse(response);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSearchError(err.message);
      } else {
        setSearchError("Face recognition search failed. Please try again.");
      }
    } finally {
      setSearching(false);
    }
  };

  const copyEventLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const calculateConfidence = (dist: number | null): number => {
    if (dist === null) return 85;
    const score = Math.max(50, Math.min(99, Math.round((1 - (dist / 0.8)) * 100)));
    return score;
  };

  const totalCapturedAngles = [
    Boolean(angleSlots.front.file),
    Boolean(angleSlots.left.file),
    Boolean(angleSlots.right.file),
  ].filter(Boolean).length;

  const totalProbesCount = activeTab === "guided" ? totalCapturedAngles : batchFiles.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
        <p className="text-sm text-slate-400 font-mono tracking-wide">Connecting to Event Gallery...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Event Not Found</h2>
          <p className="text-sm text-slate-400">{error || "The event does not exist or has expired."}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/20"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Hidden file input for slot uploads */}
      <input
        ref={slotFileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/pjpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.JPG,.JPEG,.PNG,.WEBP"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSlotFileSelected(targetSlotUpload, file);
          e.target.value = "";
        }}
      />

      {/* Hidden native device camera input */}
      <input
        ref={nativeCameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSlotFileSelected(targetSlotUpload, file);
          e.target.value = "";
        }}
      />

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Camera className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              PhotoFinder AI
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={copyEventLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors"
              title="Share event link"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Copied" : "Share"}</span>
            </button>
            <Link
              href={`/events/${event.id}/manage`}
              className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-mono"
            >
              Organizer portal →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-10">
        {/* Event Hero Banner */}
        <section className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-slate-950 p-6 sm:p-10 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

          <div className="relative space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ATTENDEE PORTAL
              </span>
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Multi-Angle Precision Verification
              </span>
              {event.event_date && (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  {event.event_date}
                </span>
              )}
              {stats && (
                <span className="text-xs text-indigo-300 flex items-center gap-1 font-mono bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  <Layers className="h-3.5 w-3.5" />
                  {stats.processed_photos} photos indexed ({stats.detected_faces} faces)
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {event.name}
            </h1>
            {event.description && (
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {event.description}
              </p>
            )}

            <div className="pt-1 flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Event slug:</span>
              <span className="text-slate-200 bg-slate-800/70 px-2 py-0.5 rounded border border-slate-700/50">
                {event.slug}
              </span>
            </div>
          </div>
        </section>

        {/* Biometric Privacy Pledge */}
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md p-4 sm:p-5 flex items-start gap-3.5 shadow-lg shadow-indigo-950/30">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-slate-300">
            <p className="font-semibold text-white">Privacy First Architecture</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Your probe selfies are processed in-memory using deep learning (Dlib ResNet-34 metric embeddings).
              They are never written to disk, never saved to the database, and are discarded immediately after searching.
            </p>
          </div>
        </section>

        {/* 3-Angle Selfie Capture & Upload Card */}
        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 space-y-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  3-Angle Facial Search
                </h2>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {totalCapturedAngles}/3 Angles Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                For each angle, you can either <strong>click a live selfie</strong> or <strong>upload an image</strong>.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("guided")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "guided"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>3-Angle Probes</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("batch")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "batch"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Drop Multiple Photos</span>
              </button>
            </div>
          </div>

          {activeTab === "guided" ? (
            /* ============================================================ */
            /* TAB 1: 3-ANGLE PROBES (REALTIME CLICK OR UPLOAD PER PROBE)   */
            /* ============================================================ */
            <div className="space-y-6">
              {/* Top Guided Camera Launcher Banner */}
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Camera className="h-4 w-4" />
                    Interactive Camera Wizard
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Step through Front → Left 45° → Right 45° with live alignment guides in one seamless flow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCameraForAngle(angleSlots.front.file ? (angleSlots.left.file ? "right" : "left") : "front")}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 shrink-0"
                >
                  <Camera className="h-4 w-4" />
                  <span>Launch Camera Wizard</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 3 Dedicated Angle Probe Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["front", "left", "right"] as AngleType[]).map((angleKey) => {
                  const slot = angleSlots[angleKey];
                  const hasPhoto = Boolean(slot.file && slot.previewUrl);

                  return (
                    <div
                      key={angleKey}
                      className={`relative rounded-3xl p-5 border flex flex-col justify-between transition-all ${
                        hasPhoto
                          ? "border-emerald-500/40 bg-emerald-950/10 shadow-lg shadow-emerald-950/20"
                          : "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 font-semibold">
                            {slot.badge}
                          </span>
                          {hasPhoto && (
                            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Captured
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white">{slot.title}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{slot.description}</p>
                        </div>
                      </div>

                      {/* Card Body: Preview or Selection Buttons */}
                      <div className="my-4">
                        {hasPhoto ? (
                          <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-emerald-500/40 bg-black group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={slot.previewUrl!}
                              alt={slot.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                              <button
                                type="button"
                                onClick={() => openCameraForAngle(angleKey)}
                                className="h-9 w-9 rounded-xl bg-slate-900/90 text-white hover:bg-indigo-600 flex items-center justify-center transition-colors shadow-lg"
                                title="Retake Live Selfie"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetSlotUpload(angleKey);
                                  slotFileRef.current?.click();
                                }}
                                className="h-9 w-9 rounded-xl bg-slate-900/90 text-white hover:bg-indigo-600 flex items-center justify-center transition-colors shadow-lg"
                                title="Upload Different File"
                              >
                                <UploadCloud className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => clearSlot(angleKey)}
                                className="h-9 w-9 rounded-xl bg-slate-900/90 text-white hover:bg-rose-600 flex items-center justify-center transition-colors shadow-lg"
                                title="Remove Angle"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Pose guidance silhouette */}
                            <div className="relative aspect-[4/3] w-full rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center p-3 text-center">
                              <div
                                className={`w-12 h-14 rounded-[45%] border-2 border-indigo-400/50 bg-indigo-500/10 flex items-center justify-center transition-transform ${
                                  angleKey === "left" ? "-rotate-12" : angleKey === "right" ? "rotate-12" : ""
                                }`}
                              >
                                <Compass className="h-5 w-5 text-indigo-400" />
                              </div>
                              <span className="text-[11px] text-slate-300 mt-2 font-medium">
                                {slot.guidePrompt}
                              </span>
                            </div>

                            {/* Dual Action Buttons: Live Selfie OR File Upload */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => openCameraForAngle(angleKey)}
                                className="py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/25 group"
                                title="Click live selfie using camera"
                              >
                                <Camera className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                <span>Take Selfie</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setTargetSlotUpload(angleKey);
                                  slotFileRef.current?.click();
                                }}
                                className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                                title="Upload photo file from device"
                              >
                                <UploadCloud className="h-4 w-4 text-slate-400" />
                                <span>Upload File</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions when photo present */}
                      {hasPhoto && (
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => openCameraForAngle(angleKey)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                          >
                            <Camera className="h-3 w-3" />
                            <span>Retake live</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetSlotUpload(angleKey);
                              slotFileRef.current?.click();
                            }}
                            className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          >
                            <UploadCloud className="h-3 w-3" />
                            <span>Upload file</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* TAB 2: MULTI-PHOTO BATCH DROP                                 */
            /* ============================================================ */
            <div className="space-y-6">
              <label className="w-full rounded-3xl border-2 border-dashed border-slate-700/70 hover:border-indigo-500 bg-slate-950/60 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/pjpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.JPG,.JPEG,.PNG,.WEBP"
                  onChange={handleBatchFiles}
                  className="hidden"
                />
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <span className="text-sm font-semibold text-white">Drop Multiple Photos of Yourself</span>
                <span className="text-xs text-slate-400 mt-1">
                  Upload 1 to 5 photos with different angles, expressions, or candid shots (JPG, PNG, WebP)
                </span>
                <span className="mt-4 text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-3.5 py-1.5 rounded-full border border-indigo-500/20">
                  Select Multiple Files
                </span>
              </label>

              {/* Thumbnails of batch files */}
              {batchFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {batchFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-square group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={`Probe ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeBatchFile(idx)}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 flex items-center justify-center transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-2 left-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/70 text-slate-200">
                          Angle #{idx + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tolerance Slider & Search Trigger */}
          <div className="pt-4 border-t border-slate-800/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-200">Face Match Sensitivity</span>
                  <p className="text-[11px] text-slate-400">
                    High-Precision Mode ({tolerance.toFixed(2)}) — Strict matching for frontal &amp; angled shots (zero other people)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.35"
                  max="0.52"
                  step="0.01"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseFloat(e.target.value))}
                  className="w-36 accent-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-indigo-400 w-10 text-right">
                  {tolerance.toFixed(2)}
                </span>
              </div>
            </div>

            {searchError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{searchError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleSearch}
                disabled={totalProbesCount === 0 || searching}
                className="w-full sm:w-auto min-w-[280px] flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/40 hover:scale-[1.01]"
              >
                {searching ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing {totalProbesCount} Angle Probe(s)...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>
                      Search with {totalProbesCount > 0 ? `${totalProbesCount} Probe Angle${totalProbesCount > 1 ? "s" : ""}` : "Selfie"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Search Results Display */}
        {searchResponse && (
          <section className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <span>
                    Found {searchResponse.total_results} Photo{searchResponse.total_results === 1 ? "" : "s"}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Matched across {searchResponse.faces_detected_in_selfie} probe facial vector(s) with high-precision identity verification
                </p>
              </div>

              {searchResponse.total_results > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                    Showing top {searchResponse.results.length} matches
                  </span>
                </div>
              )}
            </div>

            {searchResponse.total_results === 0 ? (
              /* Empty State */
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-12 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-white">No Matching Photos Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  We couldn&apos;t find any photos with a matching facial vector at tolerance {tolerance.toFixed(2)}.
                  Try capturing all 3 angles (Front, Left, Right) or adjusting the sensitivity slider above to 0.60–0.65.
                </p>
              </div>
            ) : (
              /* Photo Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {searchResponse.results.map((photo) => {
                  const conf = photo.confidence ?? calculateConfidence(photo.best_distance);
                  const isGroup = photo.matched_faces > 1;

                  return (
                    <div
                      key={photo.photo_id}
                      className="group relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900 hover:border-indigo-500/60 transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col"
                    >
                      {/* Image container */}
                      <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={api.getPhotoDownloadUrl(photo.photo_id)}
                          alt={photo.original_filename}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                          <span className="text-[10px] font-mono font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/85 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-md">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            Verified
                          </span>
                          {isGroup && (
                            <span className="text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/85 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-md">
                              <Users className="h-3 w-3" />
                              Group
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay with Lightbox trigger */}
                        <button
                          type="button"
                          onClick={() => setActivePhoto(photo)}
                          className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]"
                          title="Preview full size"
                        >
                          <div className="h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md hover:scale-110 transition-transform">
                            <Maximize2 className="h-5 w-5" />
                          </div>
                        </button>
                      </div>

                      {/* Card Footer */}
                      <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-200 font-medium truncate" title={photo.original_filename}>
                            {photo.original_filename}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500">
                            Dist: {photo.best_distance !== null ? photo.best_distance.toFixed(3) : "N/A"}
                          </p>
                        </div>

                        <a
                          href={api.getPhotoDownloadUrl(photo.photo_id)}
                          download={photo.original_filename}
                          className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
                          title="Download photograph"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ============================================================ */}
      {/* REALTIME CAMERA SNAP MODAL (FOR ALL 3 PROBE ANGLES)          */}
      {/* ============================================================ */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">
                  Capturing: {angleSlots[cameraTargetAngle].title}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  {angleSlots[cameraTargetAngle].badge}
                </span>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Angle Selection Tabs inside Camera */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full justify-between">
              {(["front", "left", "right"] as AngleType[]).map((aKey) => (
                <button
                  key={aKey}
                  type="button"
                  onClick={() => setCameraTargetAngle(aKey)}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    cameraTargetAngle === aKey
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {angleSlots[aKey].title}
                </button>
              ))}
            </div>

            {/* Live Camera Viewfinder */}
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-slate-800 bg-black flex flex-col items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        closeCameraModal();
                        triggerNativeCamera(cameraTargetAngle);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Open Device Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeCameraModal();
                        setTargetSlotUpload(cameraTargetAngle);
                        slotFileRef.current?.click();
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                    >
                      <UploadCloud className="h-4 w-4 text-slate-400" />
                      <span>Upload File Instead</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
                  />

                  {/* Pose Guidance Frame */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={`w-52 h-64 rounded-[48%] border-2 border-dashed shadow-[0_0_40px_rgba(99,102,241,0.25)] animate-pulse transition-all ${
                        cameraTargetAngle === "front"
                          ? "border-indigo-400/80"
                          : cameraTargetAngle === "left"
                          ? "border-cyan-400/80 -rotate-8"
                          : "border-violet-400/80 rotate-8"
                      }`}
                    />
                  </div>

                  {/* Flip Camera Button */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="h-8 w-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-slate-700/60 transition-colors"
                      title="Switch camera"
                    >
                      <SwitchCamera className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Angle Guideline Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30">
                      {angleSlots[cameraTargetAngle].guidePrompt}
                    </span>
                  </div>

                  {/* Snap Trigger */}
                  <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={handleSnapCamera}
                      disabled={!cameraActive}
                      className="h-16 w-16 rounded-full bg-white hover:scale-105 active:scale-95 transition-all p-1.5 shadow-2xl flex items-center justify-center group disabled:opacity-50"
                      title={`Snap ${angleSlots[cameraTargetAngle].title}`}
                    >
                      <div className="w-full h-full rounded-full border-2 border-slate-900 group-hover:bg-indigo-600 transition-colors" />
                    </button>
                    <span className="text-[11px] font-mono text-slate-300 drop-shadow-md">
                      Tap circle to snap {angleSlots[cameraTargetAngle].title}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Alternative: Upload File for this angle */}
            <div className="w-full flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">Prefer a photo from your gallery?</span>
              <button
                type="button"
                onClick={() => {
                  closeCameraModal();
                  setTargetSlotUpload(cameraTargetAngle);
                  slotFileRef.current?.click();
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Upload {angleSlots[cameraTargetAngle].title}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute -top-12 right-0 h-9 w-9 rounded-full bg-slate-800 text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={api.getPhotoDownloadUrl(activePhoto.photo_id)}
              alt={activePhoto.original_filename}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl border border-slate-800"
            />

            <div className="mt-4 flex items-center justify-between w-full max-w-xl bg-slate-900/90 px-5 py-3 rounded-2xl border border-slate-800 text-xs">
              <div>
                <p className="font-semibold text-white">{activePhoto.original_filename}</p>
                <p className="text-slate-400 font-mono text-[11px]">
                  Status: Verified Match • Distance: {activePhoto.best_distance?.toFixed(3)}
                </p>
              </div>
              <a
                href={api.getPhotoDownloadUrl(activePhoto.photo_id)}
                download={activePhoto.original_filename}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-lg shadow-indigo-600/30"
              >
                <Download className="h-4 w-4" />
                <span>Download Photo</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendeeSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
          Loading Event...
        </div>
      }
    >
      <AttendeeSearchContent />
    </Suspense>
  );
}
