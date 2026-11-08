"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { api, EventItem, EventStats, PhotoItem, BatchUploadResponse } from "@/lib/api";
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
  Info,
  Calendar,
  Layers,
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
      setOrganizerToken(cached);
      setTokenInput(cached);
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
      alert(err instanceof Error ? err.message : "Failed to delete photograph");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Event Header Banner */}
        {event && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    {event.status}
                  </span>
                  {event.event_date && (
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      {event.event_date}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {event.name}
                </h1>
                {event.description && (
                  <p className="text-slate-400 text-sm max-w-2xl">{event.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/events/${event.slug || event.id}`}
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-colors border border-indigo-500/30"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Attendee Search</span>
                </Link>
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors border border-slate-700"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-400">Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span>Copy Attendee Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Organizer Token Guard */}
        {!organizerToken && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Key className="h-4 w-4" />
              <span>Organizer Authentication Required</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              To upload photographs, browse the gallery, or delete items, enter the Organizer Token provided when this event was created.
            </p>
            <form onSubmit={handleSaveToken} className="flex gap-2 max-w-lg">
              <input
                type="password"
                placeholder="Paste your organizer_token here..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shrink-0"
              >
                Save & Unlock
              </button>
            </form>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
              <span className="text-xs text-slate-400 flex items-center justify-between">
                <span>Total Photos</span>
                <ImageIcon className="h-4 w-4 text-indigo-400" />
              </span>
              <div className="text-2xl font-bold font-mono text-white">{stats.total_photos}</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
              <span className="text-xs text-slate-400 flex items-center justify-between">
                <span>Indexed / Processed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400">{stats.processed_photos}</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
              <span className="text-xs text-slate-400 flex items-center justify-between">
                <span>Pending Processing</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400">{stats.pending_photos}</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
              <span className="text-xs text-slate-400 flex items-center justify-between">
                <span>Failed</span>
                <AlertCircle className="h-4 w-4 text-rose-400" />
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400">{stats.failed_photos}</div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {organizerToken && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-indigo-400" />
                <span>Bulk Photo Ingestion</span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload photos in JPG, PNG, or WEBP (up to 15 MB each). Photos are stored safely in persistent storage and queued for facial recognition.
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                uploading
                  ? "border-indigo-500/50 bg-indigo-500/5 opacity-60 pointer-events-none"
                  : "border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/60"
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
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-indigo-400 hover:text-indigo-300">
                    Click to browse
                  </span>{" "}
                  <span className="text-slate-400 text-sm">or drag and drop multiple photographs</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Supported formats: JPG, JPEG, PNG, WEBP • Max 15 MB per file
                </p>
              </div>
            </div>

            {/* Uploading Progress */}
            {uploading && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3 text-indigo-300 text-xs animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                <span>Uploading and validating photographs in persistent storage...</span>
              </div>
            )}

            {/* Batch Upload Summary Feedback */}
            {uploadResult && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                  <span className="text-emerald-400">
                    ✓ Uploaded: {uploadResult.total_uploaded}
                  </span>
                  {uploadResult.total_duplicates > 0 && (
                    <span className="text-amber-400">
                      ⚠ Duplicates Skipped: {uploadResult.total_duplicates}
                    </span>
                  )}
                  {uploadResult.total_failed > 0 && (
                    <span className="text-rose-400">
                      ✗ Failed: {uploadResult.total_failed}
                    </span>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono border-t border-slate-900 pt-2">
                  {uploadResult.results.map((res, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 text-slate-400">
                      <span className="truncate max-w-xs">{res.filename}</span>
                      <span
                        className={
                          res.status === "uploaded"
                            ? "text-emerald-400"
                            : res.status === "duplicate"
                            ? "text-amber-400"
                            : "text-rose-400"
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
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-400" />
              <span>Event Photo Gallery ({photos.length})</span>
            </h2>

            {organizerToken && photos.length > 0 && (
              <button
                type="button"
                onClick={handleReindex}
                disabled={reindexing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                title="Re-extract face embeddings for all gallery photos with high-precision face recognition"
              >
                <Sparkles className={`h-3.5 w-3.5 ${reindexing ? "animate-spin text-amber-400" : "text-indigo-400"}`} />
                <span>{reindexing ? "Re-indexing Faces..." : "Re-index Faces"}</span>
              </button>
            )}
          </div>

          {reindexResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                Successfully re-indexed {reindexResult.photos_reindexed} photo(s) and detected {reindexResult.total_faces_detected} face embedding(s)!
              </span>
            </div>
          )}

          {photos.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 space-y-2">
              <ImageIcon className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-xs">No photographs uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  {/* Image Preview */}
                  <div className="aspect-square bg-slate-950 relative overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={api.getPhotoDownloadUrl(photo.id)}
                      alt={photo.original_filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Status Badge */}
                    <span className="absolute top-2 left-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-amber-400 border border-white/10 uppercase">
                      {photo.processing_status}
                    </span>

                    {/* Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={api.getPhotoDownloadUrl(photo.id)}
                        download={photo.original_filename}
                        className="p-2 rounded-lg bg-slate-800/90 text-white hover:bg-indigo-600 transition-colors"
                        title="Download original"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="p-2 rounded-lg bg-slate-800/90 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Photo Info */}
                  <div className="p-2.5 space-y-0.5">
                    <p className="text-xs text-slate-200 truncate font-medium">
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
    </div>
  );
}

export default function EventManagePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
          <div className="animate-pulse text-sm text-slate-400">Loading event manager...</div>
        </div>
      }
    >
      <EventManageContent />
    </Suspense>
  );
}
