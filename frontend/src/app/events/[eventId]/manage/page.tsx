"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, EventItem, EventStats, PhotoItem, BatchUploadResponse } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  ArrowLeft, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  Share2, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  Calendar,
  Clock,
  Sparkles,
  ExternalLink
} from "lucide-react";

function EventManageContent() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [organizerToken, setOrganizerToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BatchUploadResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState<{ photos_reindexed: number; total_faces_detected: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize token from storage
  useEffect(() => {
    const cached = api.getStoredOrganizerToken(eventId);
    if (cached) {
      /* eslint-disable react-hooks/set-state-in-effect -- initialize the editor from the stored organizer token */
      setOrganizerToken(cached);
      setTokenInput(cached);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [eventId]);

  const loadData = async (token = organizerToken) => {
    setLoading(true);
    setError(null);
    try {
      const [ev, st] = await Promise.all([
        api.getEvent(eventId),
        api.getEventStats(eventId),
      ]);
      setEvent(ev);
      setStats(st);

      if (token) {
        try {
          const photoData = await api.listPhotos(eventId, token, 100);
          setPhotos(photoData.items);
        } catch (photoErr: unknown) {
          console.warn("Could not load photos with token", photoErr);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load event data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // The initial load mirrors the current event/token into the editor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, organizerToken]);

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      api.saveOrganizerToken(eventId, tokenInput.trim());
      setOrganizerToken(tokenInput.trim());
      loadData(tokenInput.trim());
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!organizerToken) {
      setError("Please provide and save your Organizer Token before uploading photographs.");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const fileArray = Array.from(files);
      const res = await api.uploadPhotos(eventId, fileArray, organizerToken);
      setUploadResult(res);
      // Reload photos and stats
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Upload failed");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!organizerToken) return;
    if (!confirm("Are you sure you want to delete this photograph? It will also be removed from storage.")) {
      return;
    }

    try {
      await api.deletePhoto(photoId, organizerToken);
      // Immediately remove from state
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      // Refresh stats
      const st = await api.getEventStats(eventId);
      setStats(st);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete photograph");
    }
  };

  const handleReindex = async () => {
    if (!organizerToken) return;
    setReindexing(true);
    setError(null);
    setReindexResult(null);
    try {
      const res = await api.reindexPhotos(eventId, organizerToken);
      setReindexResult(res);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to re-index photographs");
      }
    } finally {
      setReindexing(false);
    }
  };

  const copyShareLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/events/${event.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout activeEventId={eventId}>
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:border-slate-300 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-[#0053FF]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-start gap-2 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
            <button
              type="button"
              onClick={() => loadData()}
              className="shrink-0 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        )}

        {/* Event Header Banner */}
        {event && (
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-sm p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-semibold">
                    {event.status}
                  </span>
                  {event.event_date && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3 text-[#0053FF]" />
                      {event.event_date}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {event.name}
                </h1>
                {event.description && (
                  <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">{event.description}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Link
                  href={`/events/${event.slug || event.id}`}
                  target="_blank"
                  className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0053FF] hover:bg-[#0047db] text-white text-xs font-bold transition-all shadow-md shadow-[#0053FF]/20 border border-[#0053FF] sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Attendee Search</span>
                </Link>
                <button
                  onClick={copyShareLink}
                  className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all border border-slate-200/90 shadow-sm sm:w-auto"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700">Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 text-slate-500" />
                      <span>Copy Attendee Link</span>
                    </>
                  )}
                </button>
              </div>
              <p aria-live="polite" className="sr-only">
                {copiedLink ? "Attendee link copied" : ""}
              </p>
            </div>
          </div>
        )}

        {/* Organizer Token Guard */}
        {!organizerToken && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <Key className="h-4 w-4 text-amber-600" />
              <span>Organizer Authentication Required</span>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed max-w-2xl">
              To upload photographs, browse the gallery, or delete items, enter the Organizer Token provided when this event was created.
            </p>
            <form onSubmit={handleSaveToken} className="flex w-full max-w-lg flex-col gap-2 sm:flex-row">
              <label htmlFor="organizer-token" className="sr-only">
                Organizer token
              </label>
              <input
                id="organizer-token"
                type="password"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste your organizer_token here..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full min-w-0 flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-base text-slate-900 focus:outline-none focus:border-[#0053FF] focus:ring-2 focus:ring-[#0053FF]/20 font-mono shadow-inner sm:py-2 sm:text-xs"
              />
              <button
                type="submit"
                className="w-full shrink-0 px-4 py-2.5 rounded-xl bg-[#FCAA02] hover:bg-[#e59b02] text-slate-950 font-bold text-xs transition-colors shadow-md sm:w-auto sm:py-2"
              >
                Save &amp; Unlock
              </button>
            </form>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-1">
              <span className="text-xs text-slate-500 flex items-center justify-between font-medium">
                <span>Total Photos</span>
                <ImageIcon className="h-4 w-4 text-[#0053FF]" />
              </span>
              <div className="text-2xl font-black font-mono text-slate-900">{stats.total_photos}</div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-1">
              <span className="text-xs text-slate-500 flex items-center justify-between font-medium">
                <span>Indexed / Processed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </span>
              <div className="text-2xl font-black font-mono text-emerald-600">{stats.processed_photos}</div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-1">
              <span className="text-xs text-slate-500 flex items-center justify-between font-medium">
                <span>Pending Processing</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </span>
              <div className="text-2xl font-black font-mono text-amber-600">{stats.pending_photos}</div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-1">
              <span className="text-xs text-slate-500 flex items-center justify-between font-medium">
                <span>Failed</span>
                <AlertCircle className="h-4 w-4 text-rose-500" />
              </span>
              <div className="text-2xl font-black font-mono text-rose-600">{stats.failed_photos}</div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {organizerToken && (
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-sm p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-[#0053FF]" />
                <span>Bulk Photo Ingestion</span>
              </h2>
              <p className="text-xs text-slate-500">
                Upload photos in JPG, PNG, or WEBP (up to 15 MB each). Photos are stored safely in persistent storage and queued for facial recognition.
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload photographs"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0053FF] ${
                uploading
                  ? "border-[#0053FF]/50 bg-blue-50/50 opacity-60 pointer-events-none"
                  : "border-slate-300 hover:border-[#0053FF] hover:bg-blue-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/pjpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.JPG,.JPEG,.PNG,.WEBP"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />

              <div className="space-y-3 max-w-sm mx-auto">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#0053FF] flex items-center justify-center mx-auto shadow-sm">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[#0053FF] hover:underline">
                    Click to browse
                  </span>{" "}
                  <span className="text-slate-500 text-sm">or drag and drop multiple photographs</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Supported formats: JPG, JPEG, PNG, WEBP • Max 15 MB per file
                </p>
              </div>
            </div>

            {/* Uploading Progress */}
            {uploading && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-[#0053FF] text-xs font-semibold animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                <span>Uploading and validating photographs in persistent storage...</span>
              </div>
            )}

            {/* Batch Upload Summary Feedback */}
            {uploadResult && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono font-bold">
                  <span className="text-emerald-700">
                    ✓ Uploaded: {uploadResult.total_uploaded}
                  </span>
                  {uploadResult.total_duplicates > 0 && (
                    <span className="text-amber-700">
                      ⚠ Duplicates Skipped: {uploadResult.total_duplicates}
                    </span>
                  )}
                  {uploadResult.total_failed > 0 && (
                    <span className="text-rose-600">
                      ✗ Failed: {uploadResult.total_failed}
                    </span>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono border-t border-slate-200 pt-2">
                  {uploadResult.results.map((res, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 text-slate-600">
                      <span className="truncate max-w-xs">{res.filename}</span>
                      <span
                        className={
                          res.status === "uploaded"
                            ? "text-emerald-700 font-semibold"
                            : res.status === "duplicate"
                            ? "text-amber-700 font-semibold"
                            : "text-rose-600 font-semibold"
                        }
                      >
                        {res.status.toUpperCase()}: {res.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Organizer Photo Gallery */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-[#0053FF]" />
              <span>Event Photo Gallery ({photos.length})</span>
            </h2>

            {organizerToken && photos.length > 0 && (
              <button
                type="button"
                onClick={handleReindex}
                disabled={reindexing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                title="Re-extract face embeddings for all gallery photos with high-precision face recognition"
              >
                <Sparkles className={`h-3.5 w-3.5 ${reindexing ? "animate-spin text-amber-500" : "text-[#0053FF]"}`} />
                <span>{reindexing ? "Re-indexing Faces..." : "Re-index Faces"}</span>
              </button>
            )}
          </div>

          {reindexResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-mono">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Successfully re-indexed {reindexResult.photos_reindexed} photo(s) and detected {reindexResult.total_faces_detected} face embedding(s)!
              </span>
            </div>
          )}

          {photos.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-300 rounded-3xl bg-white/60 space-y-2">
              <ImageIcon className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-slate-500 text-xs font-medium">No photographs uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
                >
                  {/* Image Preview */}
                  <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={api.getPhotoDownloadUrl(photo.id)}
                      alt={photo.original_filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Status Badge */}
                    <span className="absolute top-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200 shadow-sm uppercase font-semibold">
                      {photo.processing_status}
                    </span>

                    {/* Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2 [@media(hover:none)]:opacity-100">
                      <a
                        href={api.getPhotoDownloadUrl(photo.id)}
                        download={photo.original_filename}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 hover:text-white hover:bg-[#0053FF] shadow-md transition-colors"
                        title="Download original"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-600 hover:text-white hover:bg-rose-600 shadow-md transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Photo Info */}
                  <div className="p-2.5 space-y-0.5 bg-white border-t border-slate-100">
                    <p className="text-xs text-slate-800 truncate font-semibold">
                      {photo.original_filename}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{formatFileSize(photo.file_size)}</span>
                      {photo.image_width && photo.image_height && (
                        <span>{photo.image_width}×{photo.image_height}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

export default function EventManagePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50/70 text-slate-500 flex items-center justify-center font-sans">
          <div className="animate-pulse text-sm font-medium">Loading event manager...</div>
        </div>
      }
    >
      <EventManageContent />
    </Suspense>
  );
}
