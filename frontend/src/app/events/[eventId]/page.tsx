"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  api,
  EventItem,
  EventView,
  SelfieSearchResponse,
} from "@/lib/api";
import {
  PhotoGallery,
  type GalleryDensity,
  type GalleryPhoto,
} from "@/components/PhotoGallery";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Images,
  RefreshCw,
  Search,
  Share2,
  SwitchCamera,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

type SelfieMode = "live" | "upload";
type SelfieAngle = "front" | "left" | "right";

const SELFIE_ORDER: SelfieAngle[] = ["front", "left", "right"];

const SELFIE_CUES: Record<SelfieAngle, { label: string; short: string; hint: string }> = {
  front: {
    label: "Look in front",
    short: "Front",
    hint: "Look straight into the camera",
  },
  left: {
    label: "Look left",
    short: "Left",
    hint: "Turn your head to the left",
  },
  right: {
    label: "Look right",
    short: "Right",
    hint: "Turn your head to the right",
  },
};

interface SelfieShot {
  file: File;
  preview: string;
}

function AttendeeEventContent() {
  const params = useParams();
  const rawIdentifier = params.eventId as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [eventView, setEventView] = useState<EventView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Host album
  const [hostPhotos, setHostPhotos] = useState<GalleryPhoto[]>([]);
  const [hostPhotosLoading, setHostPhotosLoading] = useState(false);
  const [hostDensity, setHostDensity] = useState<GalleryDensity>("medium");
  const [hostSelected, setHostSelected] = useState<string[]>([]);

  // Selfie
  const [mode, setMode] = useState<SelfieMode>("live");
  const [shots, setShots] = useState<Partial<Record<SelfieAngle, SelfieShot>>>({});
  const [captureAngle, setCaptureAngle] = useState<SelfieAngle>("front");
  const shotsRef = useRef(shots);
  const [selfieError, setSelfieError] = useState<string | null>(null);

  // Camera
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Search
  const [searching, setSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SelfieSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchDensity, setMatchDensity] = useState<GalleryDensity>("medium");
  const [matchSelected, setMatchSelected] = useState<string[]>([]);

  const resultsRef = useRef<HTMLElement>(null);
  const selfieSectionRef = useRef<HTMLElement>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      if (!rawIdentifier) return;
      setLoading(true);
      setError(null);
      try {
        let ev: EventItem;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          rawIdentifier
        );

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

        const view = await api.getEventView(ev.id).catch(() => null);
        setEventView(view);

        if (view?.is_host) {
          setHostPhotosLoading(true);
          try {
            const photoData = await api.listPhotosForHost(ev.id, 200);
            setHostPhotos(
              photoData.items.map((photo) => ({
                id: photo.id,
                filename: photo.original_filename,
                url: api.getPhotoDownloadUrl(photo.id),
                width: photo.image_width,
                height: photo.image_height,
              }))
            );
          } catch {
            setHostPhotos([]);
          } finally {
            setHostPhotosLoading(false);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load event.");
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [rawIdentifier]);

  useEffect(() => {
    if (!searchResponse) return;
    const timer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [searchResponse]);

  useEffect(() => {
    shotsRef.current = shots;
  }, [shots]);

  useEffect(() => {
    return () => {
      Object.values(shotsRef.current).forEach((shot) => {
        if (shot) URL.revokeObjectURL(shot.preview);
      });
    };
  }, []);

  const startCameraStream = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Camera unavailable or permission denied. You can upload a photo instead.");
      setCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const openCamera = () => {
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    const nextAngle = SELFIE_ORDER.find((angle) => !shots[angle]) ?? "front";
    setCaptureAngle(nextAngle);
    setCameraOpen(true);
  };

  const closeCamera = () => {
    stopCameraStream();
    setCameraOpen(false);
    requestAnimationFrame(() => lastTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (!cameraOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCameraStream();
    return () => stopCameraStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen, facingMode]);

  useEffect(() => {
    if (!cameraOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCamera();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen]);

  const setShot = (angle: SelfieAngle, file: File) => {
    const previous = shots[angle];
    if (previous) URL.revokeObjectURL(previous.preview);
    const preview = URL.createObjectURL(file);
    setShots((prev) => ({ ...prev, [angle]: { file, preview } }));
    setSelfieError(null);
    setSearchError(null);
  };

  const clearSelfie = () => {
    Object.values(shots).forEach((shot) => {
      if (shot) URL.revokeObjectURL(shot.preview);
    });
    setShots({});
    setCaptureAngle("front");
    setSearchResponse(null);
    setMatchSelected([]);
    setSelfieError(null);
  };

  const handleCapture = () => {
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

    const angle = captureAngle;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${angle}.jpg`, { type: "image/jpeg" });
        setShot(angle, file);

        if (angle === "front") {
          setCaptureAngle("left");
        } else if (angle === "left") {
          setCaptureAngle("right");
        } else {
          closeCamera();
        }
      },
      "image/jpeg",
      0.95
    );
  };

  const handleUpload = (input: React.ChangeEvent<HTMLInputElement>) => {
    const target = input.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    target.value = "";
    if (files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      const validType = file.type.startsWith("image/");
      const validExt = [".jpg", ".jpeg", ".png", ".webp"].includes(
        file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      );
      if (!validType && !validExt) {
        setSelfieError("Choose JPG, PNG, or WebP images.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setSelfieError("Each image must be 10 MB or smaller.");
        return;
      }
      validFiles.push(file);
    }

    // If all three slots are filled, a new selection starts a fresh set.
    let base = shots;
    if (SELFIE_ORDER.every((angle) => shots[angle])) {
      Object.values(shots).forEach((shot) => {
        if (shot) URL.revokeObjectURL(shot.preview);
      });
      base = {};
    }

    const next = { ...base };
    const freeAngles = SELFIE_ORDER.filter((angle) => !next[angle]);
    for (const file of validFiles.slice(0, freeAngles.length)) {
      const angle = freeAngles.shift();
      if (!angle) break;
      next[angle] = { file, preview: URL.createObjectURL(file) };
    }

    setShots(next);
    setCaptureAngle(SELFIE_ORDER.find((angle) => !next[angle]) ?? "front");
    setSelfieError(null);
    setSearchError(null);
  };

  const switchToUpload = () => {
    closeCamera();
    setMode("upload");
    window.setTimeout(() => uploadInputRef.current?.click(), 100);
  };

  const handleSearch = async () => {
    if (!event) return;
    const probeFiles = SELFIE_ORDER.map((angle) => shots[angle]?.file).filter(
      (file): file is File => Boolean(file)
    );

    if (probeFiles.length < 3) {
      setSelfieError("Take the front, left, and right selfies first.");
      selfieSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const response = await api.searchBySelfie(
        event.id,
        probeFiles,
        event.match_tolerance ?? 0.5,
        200
      );
      setSearchResponse(response);
      setMatchSelected([]);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Face search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const copyEventLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).catch(() => {
      // Clipboard access can be blocked; the button still confirms visually.
    });
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const totalPhotos = eventView?.total_photos ?? 0;
  const attendees = eventView?.attendees ?? 0;

  const capturedAngles = SELFIE_ORDER.filter((angle) => Boolean(shots[angle]));
  const allCaptured = capturedAngles.length === 3;
  const firstShot = SELFIE_ORDER.map((angle) => shots[angle]).find(Boolean);
  const frontPreview = shots.front?.preview ?? firstShot?.preview ?? null;

  const matchPhotos: GalleryPhoto[] =
    searchResponse?.results.map((photo) => ({
      id: photo.photo_id,
      filename: photo.original_filename,
      url: api.getPhotoDownloadUrl(photo.photo_id),
    })) ?? [];

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-slate-50/70 font-sans text-slate-900">
        <RefreshCw className="h-8 w-8 animate-spin text-[#0053FF]" />
        <p className="text-sm font-medium tracking-wide text-slate-500">Loading event</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/70 p-4 text-slate-900">
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Event not found</h2>
          <p className="text-sm text-slate-500">
            {error || "The event does not exist or has expired."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0053FF] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0047db]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sharext</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70 font-sans text-slate-900 selection:bg-[#0053FF] selection:text-white">
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />

      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/sharext-logo-dark.png"
              alt="Sharext"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copyEventLink}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              title="Share event link"
            >
              {copiedLink ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              <span>{copiedLink ? "Copied" : "Share"}</span>
            </button>
            {eventView?.is_host && (
              <Link
                href={`/events/${event.id}/manage`}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-slate-800"
              >
                <span>Manage album</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      <p aria-live="polite" className="sr-only">
        {copiedLink ? "Event link copied" : ""}
      </p>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-100/50 blur-3xl" />
          <div className="relative space-y-4">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {event.name}
            </h1>
            {event.description && (
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#0053FF]" />
                <span>
                  Posted by{" "}
                  <span className="font-semibold text-slate-900">
                    {event.host_name || "Sharext"}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Images className="h-3.5 w-3.5 text-slate-400" />
                <span>{totalPhotos} photos</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span>{attendees} attended</span>
              </span>
            </div>
          </div>
        </section>

        {eventView?.is_host && (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                  All uploaded photos
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {hostPhotos.length} {hostPhotos.length === 1 ? "photo" : "photos"} in this event.
                </p>
              </div>
              <Link
                href={`/events/${event.id}/manage`}
                className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:self-auto"
              >
                Manage album
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-4">
              {hostPhotosLoading ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-16 text-sm text-slate-500">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading album
                </div>
              ) : (
                <PhotoGallery
                  photos={hostPhotos}
                  density={hostDensity}
                  onDensityChange={setHostDensity}
                  selected={hostSelected}
                  onSelectedChange={setHostSelected}
                  emptyTitle="No photos uploaded yet"
                  emptyBody="Upload photos from the organizer portal and they will appear here."
                />
              )}
            </div>
          </section>
        )}

        {searchResponse && (
          <section ref={resultsRef} className="scroll-mt-24 space-y-6">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900 sm:text-2xl">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <span>
                    Found {searchResponse.total_results} photo
                    {searchResponse.total_results === 1 ? "" : "s"}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {searchResponse.total_results === 0
                    ? "No matches for this selfie."
                    : "Your matched photos are shown first."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {frontPreview && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frontPreview}
                      alt="Your selfie"
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                    <div className="pr-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Your selfie
                      </p>
                      <p className="text-[11px] text-slate-600">Used for this search</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    selfieSectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Scan again
                </button>
              </div>
            </div>

            {searchResponse.total_results === 0 ? (
              <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  No matching photos
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                  Try a clearer, front-facing selfie with good light.
                </p>
              </div>
            ) : (
              <PhotoGallery
                photos={matchPhotos}
                density={matchDensity}
                onDensityChange={setMatchDensity}
                selected={matchSelected}
                onSelectedChange={setMatchSelected}
                emptyTitle="No matching photos"
                emptyBody="Try a different selfie."
              />
            )}
          </section>
        )}

        <section
          ref={selfieSectionRef}
          className="scroll-mt-24 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-lg font-black text-slate-900 sm:text-xl">Upload the selfie</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Take front, left, and right. All three are used to find your photos.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-5">
            <div className="flex w-full max-w-sm items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("live")}
                aria-pressed={mode === "live"}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  mode === "live"
                    ? "bg-[#0053FF] text-white shadow-md shadow-[#0053FF]/20"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Live selfie</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                aria-pressed={mode === "upload"}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  mode === "upload"
                    ? "bg-[#0053FF] text-white shadow-md shadow-[#0053FF]/20"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Upload selfie</span>
              </button>
            </div>

            {capturedAngles.length > 0 ? (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-end gap-2">
                    {SELFIE_ORDER.map((angle) => (
                      <div key={angle} className="flex flex-col items-center gap-1">
                        {shots[angle] ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={shots[angle]!.preview}
                              alt={`${SELFIE_CUES[angle].short} selfie`}
                              className="h-20 w-16 rounded-xl object-cover ring-2 ring-emerald-400"
                            />
                          </>
                        ) : (
                          <div className="flex h-20 w-16 items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-white/60 text-[10px] font-bold text-emerald-700">
                            {SELFIE_CUES[angle].short}
                          </div>
                        )}
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wide ${
                            shots[angle] ? "text-emerald-700" : "text-emerald-500"
                          }`}
                        >
                          {SELFIE_CUES[angle].short}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      {capturedAngles.length} of 3 selfies captured
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700">
                      {allCaptured
                        ? "Ready to search."
                        : "Take the remaining angles to search."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (mode === "live") openCamera();
                        else uploadInputRef.current?.click();
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {mode === "live" ? (allCaptured ? "Retake" : "Continue") : "Replace"}
                    </button>
                    <button
                      type="button"
                      onClick={clearSelfie}
                      aria-label="Remove selfies"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300 bg-white text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : mode === "live" ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-[#0053FF]">
                  <Camera className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">Take 3 selfies</p>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  We&apos;ll guide you through front, left, and right.
                </p>
                <button
                  type="button"
                  onClick={openCamera}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0053FF] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0047db]"
                >
                  <Camera className="h-4 w-4" />
                  <span>Start 3 selfies</span>
                </button>
              </div>
            ) : (
              <label
                role="button"
                tabIndex={0}
                onClick={() => uploadInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    uploadInputRef.current?.click();
                  }
                }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition-all hover:border-[#0053FF] hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0053FF]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-[#0053FF]">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">Choose 3 selfies</p>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Front, left, and right. JPG, PNG, or WebP, up to 10 MB each.
                </p>
              </label>
            )}

            {selfieError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{selfieError}</span>
              </div>
            )}

            {searchError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSearch}
              disabled={!allCaptured || searching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0053FF] px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-[#0053FF]/25 transition-all hover:bg-[#0047db] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[240px]"
            >
              {searching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Searching photos</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search my photos</span>
                </>
              )}
            </button>
            {!allCaptured && (
              <p className="text-[11px] text-slate-500">
                Capture all three angles to search.
              </p>
            )}
          </div>
        </section>
      </main>

      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeCamera();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-title"
            className="relative flex w-full max-w-md flex-col items-center space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex w-full items-center justify-between border-b border-slate-100 pb-3">
              <span id="camera-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Camera className="h-4 w-4 text-[#0053FF]" />
                Take 3 selfies
              </span>
              <button
                type="button"
                onClick={closeCamera}
                aria-label="Close camera"
                autoFocus
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0053FF]">
                Step {SELFIE_ORDER.indexOf(captureAngle) + 1} of 3
              </p>
              <p className="mt-0.5 text-base font-black text-[#0053FF]">
                {SELFIE_CUES[captureAngle].label}
              </p>
              <p className="text-[11px] text-slate-600">
                {SELFIE_CUES[captureAngle].hint}
              </p>
            </div>

            <div className="flex w-full items-center justify-center gap-1.5">
              {SELFIE_ORDER.map((angle) => {
                const done = Boolean(shots[angle]);
                const current = captureAngle === angle;
                return (
                  <span
                    key={angle}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      done
                        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : current
                        ? "border-[#0053FF] bg-[#0053FF] text-white"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                    }`}
                  >
                    {done && <Check className="h-3 w-3" strokeWidth={3} />}
                    {SELFIE_CUES[angle].short}
                  </span>
                );
              })}
            </div>

            <div className="relative flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-inner">
              {cameraError ? (
                <div className="space-y-3 p-6 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                  <p className="text-xs leading-relaxed text-slate-300">{cameraError}</p>
                  <button
                    type="button"
                    onClick={switchToUpload}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0053FF] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0047db]"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload a selfie</span>
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-64 w-48 rounded-[48%] border-2 border-dashed border-[#0053FF]/70 shadow-[0_0_40px_rgba(0,83,255,0.3)]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/80 text-white backdrop-blur-md transition-colors hover:bg-slate-900"
                    title="Switch camera"
                  >
                    <SwitchCamera className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCapture}
                      disabled={!cameraActive}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-white p-1.5 shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      title={`Capture ${SELFIE_CUES[captureAngle].short}`}
                    >
                      <span className="h-full w-full rounded-full border-2 border-slate-900" />
                    </button>
                    <span className="text-[11px] font-semibold text-white drop-shadow-md">
                      Tap to capture {SELFIE_CUES[captureAngle].short.toLowerCase()}
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={switchToUpload}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0053FF] hover:underline"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload a photo instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendeeEventPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50/70 text-sm font-medium text-slate-500">
          Loading event
        </div>
      }
    >
      <AttendeeEventContent />
    </Suspense>
  );
}
