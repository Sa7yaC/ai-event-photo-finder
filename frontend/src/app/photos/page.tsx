"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Check, Download, Share2, Upload } from "lucide-react";

type PhotoType = "uploaded" | "downloaded";
type PhotoFilter = "all" | PhotoType;

interface VaultPhoto {
  id: string;
  url: string;
  event: string;
  type: PhotoType;
  date: string;
  quality: string;
}

const PHOTOS: VaultPhoto[] = [
  {
    id: "p1",
    url: "https://images.pexels.com/photos/31530948/pexels-photo-31530948.jpeg?auto=compress&cs=tinysrgb&w=600",
    event: "Houston Wedding 2026",
    type: "downloaded",
    date: "Nov 14, 2026",
    quality: "4K RAW",
  },
  {
    id: "p2",
    url: "https://images.pexels.com/photos/36729779/pexels-photo-36729779.jpeg?auto=compress&cs=tinysrgb&w=600",
    event: "Friends Cafe Reunion",
    type: "uploaded",
    date: "Nov 12, 2026",
    quality: "12 MP",
  },
  {
    id: "p3",
    url: "https://images.pexels.com/photos/19408342/pexels-photo-19408342.jpeg?auto=compress&cs=tinysrgb&w=600",
    event: "Traditional Gala",
    type: "downloaded",
    date: "Nov 10, 2026",
    quality: "4K",
  },
  {
    id: "p4",
    url: "https://images.pexels.com/photos/4791743/pexels-photo-4791743.jpeg?auto=compress&cs=tinysrgb&w=600",
    event: "Tech Summit 2026",
    type: "uploaded",
    date: "Nov 08, 2026",
    quality: "4K",
  },
];

const FILTERS: { id: PhotoFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "uploaded", label: "Uploaded" },
  { id: "downloaded", label: "Downloaded" },
];

export default function PhotosPage() {
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPhotos = PHOTOS.filter((photo) => {
    if (activeFilter === "all") return true;
    return photo.type === activeFilter;
  });

  const copiedPhoto = PHOTOS.find((photo) => photo.id === copiedId);

  const copyLink = (photo: VaultPhoto) => {
    navigator.clipboard.writeText(photo.url).catch(() => {
      // Clipboard access can be blocked; the control still confirms visually.
    });
    setCopiedId(photo.id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === photo.id ? null : current));
    }, 2000);
  };

  return (
    <DashboardLayout>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <header className="max-w-2xl space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Photos
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Uploaded and downloaded photos, kept at full resolution.
          </p>
        </header>

        <div
          role="group"
          aria-label="Filter photos"
          className="mt-6 flex items-center gap-4 overflow-x-auto border-b border-slate-200 sm:gap-7"
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.id;
            const count =
              filter.id === "all"
                ? PHOTOS.length
                : PHOTOS.filter((photo) => photo.type === filter.id).length;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                aria-pressed={active}
                className={`-mb-px flex shrink-0 cursor-pointer items-center gap-2 border-b-2 pt-1 pb-3 text-xs font-semibold transition-colors sm:text-sm ${
                  active
                    ? "border-[#0053FF] text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    active ? "bg-[#0053FF]/10 text-[#0053FF]" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {filteredPhotos.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
            <h2 className="text-base font-semibold text-slate-900">No photos here yet</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              Upload photos to an event or download your matches, and they will appear in this
              view.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredPhotos.map((photo) => (
              <article
                key={photo.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-[#0053FF]/35"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`${photo.event} photo`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm">
                    {photo.type === "uploaded" ? (
                      <Upload className="h-3 w-3" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    {photo.type}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div>
                    <h2 className="truncate text-sm font-semibold text-slate-900">
                      {photo.event}
                    </h2>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{photo.date}</span>
                      <span className="truncate text-right">{photo.quality}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <a
                      href={photo.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-[#0053FF] transition-colors hover:bg-[#0053FF]/10"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyLink(photo)}
                      aria-label={`Copy link for ${photo.event}`}
                      title="Copy photo link"
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      {copiedId === photo.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p aria-live="polite" className="sr-only">
          {copiedPhoto ? `Photo link for ${copiedPhoto.event} copied` : ""}
        </p>
      </main>
    </DashboardLayout>
  );
}
