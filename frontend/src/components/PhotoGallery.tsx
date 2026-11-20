"use client";

import { useMemo, useState } from "react";
import { Check, Download, LayoutGrid, Maximize2 } from "lucide-react";

export type GalleryDensity = "medium" | "large";

export interface GalleryPhoto {
  id: string;
  filename: string;
  url: string;
  width?: number | null;
  height?: number | null;
}

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  density: GalleryDensity;
  onDensityChange: (density: GalleryDensity) => void;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  emptyTitle: string;
  emptyBody: string;
}

const DENSITY_OPTIONS: { id: GalleryDensity; label: string; icon: typeof LayoutGrid }[] = [
  { id: "medium", label: "Medium icons", icon: LayoutGrid },
  { id: "large", label: "Large icons", icon: Maximize2 },
];

const GRID_CLASS: Record<GalleryDensity, string> = {
  medium: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  large: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
};

const ASPECT_CLASS: Record<GalleryDensity, string> = {
  medium: "aspect-square",
  large: "aspect-[4/3]",
};

export function PhotoGallery({
  photos,
  density,
  onDensityChange,
  selected,
  onSelectedChange,
  emptyTitle,
  emptyBody,
}: PhotoGalleryProps) {
  const [downloading, setDownloading] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = photos.length > 0 && selected.length === photos.length;

  const toggle = (id: string) => {
    onSelectedChange(
      selectedSet.has(id) ? selected.filter((item) => item !== id) : [...selected, id]
    );
  };

  const toggleAll = () => {
    onSelectedChange(allSelected ? [] : photos.map((photo) => photo.id));
  };

  const downloadAll = async () => {
    const targets = photos.filter((photo) => selectedSet.has(photo.id));
    if (targets.length === 0) return;
    setDownloading(true);
    for (const photo of targets) {
      const link = document.createElement("a");
      link.href = photo.url;
      link.download = photo.filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    setDownloading(false);
  };

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h3 className="text-base font-semibold text-slate-900">{emptyTitle}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                allSelected ? "border-[#0053FF] bg-[#0053FF] text-white" : "border-slate-300 bg-white"
              }`}
            >
              {allSelected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            {allSelected ? "Clear" : "Select all"}
          </button>

          <button
            type="button"
            onClick={downloadAll}
            disabled={selected.length === 0 || downloading}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0053FF] px-3 text-xs font-bold text-white transition-colors hover:bg-[#0047db] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Downloading" : `Download${selected.length ? ` (${selected.length})` : " all"}`}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Gallery layout">
          {DENSITY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = density === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onDensityChange(option.id)}
                aria-pressed={active}
                aria-label={option.label}
                title={option.label}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${GRID_CLASS[density]}`}>
        {photos.map((photo) => {
          const isSelected = selectedSet.has(photo.id);
          return (
            <figure
              key={photo.id}
              className={`group relative overflow-hidden rounded-xl border bg-slate-100 ${
                isSelected ? "border-[#0053FF] ring-2 ring-[#0053FF]/25" : "border-slate-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.filename}
                loading="lazy"
                decoding="async"
                className={`w-full object-cover ${ASPECT_CLASS[density]}`}
              />

              <button
                type="button"
                onClick={() => toggle(photo.id)}
                aria-pressed={isSelected}
                aria-label={`Select ${photo.filename}`}
                className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/70 bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    isSelected ? "border-[#0053FF] bg-[#0053FF] text-white" : "border-slate-400 bg-white"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>

              <a
                href={photo.url}
                download={photo.filename}
                aria-label={`Download ${photo.filename}`}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/70 bg-white/90 text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#0053FF]"
              >
                <Download className="h-4 w-4" />
              </a>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
