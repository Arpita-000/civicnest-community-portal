"use client";

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { errMsg, uploadImage } from "../lib/api";

type Img = { id: string; name: string; size: number; preview: string; url?: string; progress: number };

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUploader({
  label,
  maxCount,
  max,
  value: _value,
  onChange,
}: {
  label?: string;
  maxCount?: number;
  max?: number;
  value?: string[];
  /** Called with the URLs of every fully uploaded image (and how many are still uploading) whenever the set changes. */
  onChange: ((urls: string[], uploading: number) => void) | ((urls: string[]) => void);
}) {
  const effectiveMax = maxCount ?? max ?? 5;
  const [images, setImages] = useState<Img[]>([]);
  const [dragging, setDragging] = useState(false);
  const live = useRef<Img[]>([]);
  live.current = images;

  useEffect(() => {
    onChange(
      images.filter((i) => i.url).map((i) => i.url as string),
      images.filter((i) => !i.url).length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  useEffect(
    () => () => {
      live.current.forEach((i) => URL.revokeObjectURL(i.preview));
    },
    []
  );

  const patch = (id: string, fields: Partial<Img>) => setImages((prev) => prev.map((i) => (i.id === id ? { ...i, ...fields } : i)));

  const addFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    const room = effectiveMax - live.current.length;
    if (files.length > room) toast.error(`You can attach up to ${effectiveMax} photos.`);

    for (const file of files.slice(0, Math.max(room, 0))) {
      if (!ACCEPT.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG or WebP images are allowed.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5MB.`);
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { id, name: file.name, size: file.size, preview, progress: 0 }]);
      uploadImage(file, (p) => patch(id, { progress: Math.min(p, 99) }))
        .then((url) => patch(id, { url, progress: 100 }))
        .catch((err) => {
          toast.error(errMsg(err, `Upload of ${file.name} failed. Please try again.`));
          URL.revokeObjectURL(preview);
          setImages((prev) => prev.filter((i) => i.id !== id));
        });
    }
  };

  const remove = (img: Img) => {
    URL.revokeObjectURL(img.preview);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
  };

  return (
    <div className="space-y-3">
      {label && <label className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">{label}</label>}

      {images.length < effectiveMax && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed cursor-pointer transition-colors bg-slate-50 dark:bg-[#0b1215] ${
            dragging ? "border-[#40826D]" : "border-slate-300 dark:border-[#1e3040] hover:border-[#40826D]"
          }`}
        >
          <i className="ri-upload-cloud-2-line text-3xl text-slate-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-300 mt-1">Click or drag to upload</span>
          <span className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wider">JPEG, PNG, WebP · max 5MB</span>
          <input
            type="file"
            accept={ACCEPT.join(",")}
            multiple={effectiveMax > 1}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative rounded-xl overflow-hidden aspect-square bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm group">
              <img src={img.preview} alt={img.name} className="w-full h-full object-cover" />
              {img.progress < 100 && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#40826D" strokeWidth="3" strokeDasharray={`${img.progress * 0.942} 100`} strokeLinecap="round" className="transition-all duration-300" />
                  </svg>
                  <span className="text-white text-xs font-bold mt-2 drop-shadow-md">{img.progress}%</span>
                </div>
              )}
              {img.progress === 100 && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-[#40826D] rounded-full flex items-center justify-center shadow-md">
                  <i className="ri-check-line text-white text-sm" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent pt-6 pb-2 px-3">
                <span className="text-white/90 text-[11px] font-bold tracking-wide">{(img.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <button type="button" onClick={() => remove(img)} aria-label={`Remove ${img.name}`} className="absolute top-2 right-2 w-7 h-7 bg-slate-900/60 hover:bg-rose-500 rounded-full flex items-center justify-center transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 backdrop-blur-md cursor-pointer">
                <i className="ri-close-line text-white text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
