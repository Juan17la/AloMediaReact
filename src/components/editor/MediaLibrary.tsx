import { useRef, useState, useEffect, useCallback } from "react";
import { FilePlus2, Plus, Search } from "lucide-react";
import { useEditorStore, fileMap } from "../../store/editorStore";
import { MediaCard, LoadingCard } from "./MediaCard";
import { AiToolsPanel } from "./AiToolsPanel";
import { generateId } from "../../utils/id";
import { generateProxy } from "../../engine/proxyEngine";
import type { Clip, Media, Track } from "../../project/projectTypes";
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig";
import { triggerFileInputRef } from "../../utils/fileInputTrigger";
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments";
import { DEFAULT_SPEED } from "../../constants/speed";
import { toMs, toSeconds } from "../../utils/time";
import { parseSrtFile } from "../../utils/srtParser.ts";

interface PendingMedia {
  tempId: string;
  fileName: string;
}

// Shared trigger ref is imported from utils to avoid exporting non-component
// values from a component file (required by react-refresh plugin).

const ghostBtn =
  "flex items-center gap-[5px] h-7 px-[10px] rounded-lg text-[11px] font-semibold tracking-[0.04em] text-white/80 bg-white/5 border border-white/10 hover:bg-white/9 hover:border-white/[0.18] active:scale-95 transition-all duration-100 cursor-pointer";

const tabBase =
  "h-full px-3.5 text-[11px] font-semibold bg-transparent border-0 border-b-2 rounded-none cursor-pointer transition-[color] duration-120";
const tabActive = "text-accent-white border-b-accent-red";
const tabInactive = "text-muted border-b-transparent";

type LibraryTab = "library" | "ai-tools";

export function MediaLibrary() {
  const addMedia = useEditorStore((s) => s.addMedia);
  const importSubtitlesAsGroup = useEditorStore((s) => s.importSubtitlesAsGroup);
  const setProxyState = useEditorStore((s) => s.setProxyState);
  const proxyMap = useEditorStore((s) => s.proxyMap);
  const idbResolvedMediaIds = useEditorStore((s) => s.idbResolvedMediaIds);
  const media = useEditorStore((s) => s.project.media ?? []);
  const playhead = useEditorStore((s) => s.playhead);
  const tracks = useEditorStore((s) => s.project.tracks ?? []);
  const addClip = useEditorStore((s) => s.addClip);
  const addTrack = useEditorStore((s) => s.addTrack);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<LibraryTab>("library");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [subtitleImportingIds, setSubtitleImportingIds] = useState<Set<string>>(new Set());
  const dropZoneRef = useRef<HTMLDivElement>(null);
  // One object URL per mediaId, revoked on unmount
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    triggerFileInputRef.current = () => inputRef.current?.click();
    return () => {
      triggerFileInputRef.current = null;
    };
  }, []);

  function getObjectUrl(mediaId: string): string | undefined {
    const existing = objectUrlsRef.current.get(mediaId);
    if (existing) return existing;
    const file = fileMap.get(mediaId);
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.set(mediaId, url);
    return url;
  }

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Clear selection if the selected media item is removed from the library
  useEffect(() => {
    if (selectedMediaId && !media.find((m) => m.id === selectedMediaId)) {
      setSelectedMediaId(null);
    }
  }, [media, selectedMediaId]);

  function isSubtitleFile(file: File): boolean {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = file.type.toLowerCase();
    return ext === "srt" || mime === "application/x-subrip" || mime === "application/srt" || mime === "text/srt" || mime === "text/x-srt";
  }

  function isSubtitleMedia(mediaItem: Media): boolean {
    return mediaItem.type === "subtitles";
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const fileArray = Array.from(files);
    const newPending: PendingMedia[] = fileArray.map((file) => ({
      tempId: generateId(),
      fileName: file.name,
    }));
    setPending((prev) => [...prev, ...newPending]);
    await Promise.all(
      fileArray.map(async (file, i) => {
        const m = await addMedia(file);
        setPending((prev) =>
          prev.filter((p) => p.tempId !== newPending[i].tempId),
        );
        if (m.type === "video") {
          setProxyState(m.id, { status: "pending", objectUrl: null });
          generateProxy(
            m.id,
            file,
            (url) => setProxyState(m.id, { status: "ready", objectUrl: url }),
            () => setProxyState(m.id, { status: "error", objectUrl: null }),
          );
        }
      }),
    );
  }

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setDropError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node | null)
    ) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const accepted: File[] = [];
      const rejected: string[] = [];

      Array.from(e.dataTransfer.files).forEach((file) => {
        if (
          file.type.startsWith("video/") ||
          file.type.startsWith("audio/") ||
          file.type.startsWith("image/") ||
          isSubtitleFile(file)
        ) {
          accepted.push(file);
        } else {
          rejected.push(file.name);
        }
      });

      if (rejected.length > 0) {
        setDropError(
          `Unsupported: ${rejected.slice(0, 2).join(", ")}${rejected.length > 2 ? ` +${rejected.length - 2} more` : ""}`,
        );
        setTimeout(() => setDropError(null), 3500);
      }

      if (accepted.length > 0) {
        const dt = new DataTransfer();
        accepted.forEach((f) => dt.items.add(f));
        await handleFiles(dt.files);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [addMedia, setProxyState],
  );

  function insertMediaAtPlayhead(item: Media) {
    if (isSubtitleMedia(item)) return;

    const trackType = item.type === "audio" ? "audio" : "video";
    const roundedPlayhead = toSeconds(toMs(playhead));
    const duration = item.duration ?? 5;
    const timelineStart = roundedPlayhead;
    const timelineEnd = toSeconds(toMs(roundedPlayhead + duration));

    let targetTrack: Track | undefined = tracks.find(
      (track) =>
        track.type === trackType &&
        !(track.clips ?? []).some(
          (clip) =>
            timelineStart < clip.timelineEnd &&
            timelineEnd > clip.timelineStart,
        ),
    );

    if (!targetTrack) {
      targetTrack = addTrack(trackType);
    }

    const newClip: Clip =
      item.type === "audio"
        ? {
            id: generateId(),
            trackId: targetTrack.id,
            type: "audio",
            mediaId: item.id,
            timelineStart,
            timelineEnd,
            mediaStart: 0,
            mediaEnd: duration,
            volume: 1,
            speed: DEFAULT_SPEED,
            audioConfig: { ...DEFAULT_AUDIO_CONFIG },
          }
        : item.type === "image"
          ? {
              id: generateId(),
              trackId: targetTrack.id,
              type: "image",
              mediaId: item.id,
              timelineStart,
              timelineEnd,
              transform: { x: 0, y: 0, width: 1280, height: 720, rotation: 0 },
              colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
            }
          : {
              id: generateId(),
              trackId: targetTrack.id,
              type: "video",
              mediaId: item.id,
              timelineStart,
              timelineEnd,
              mediaStart: 0,
              mediaEnd: duration,
              volume: 1,
              speed: DEFAULT_SPEED,
              transform: { x: 0, y: 0, width: 1280, height: 720, rotation: 0 },
              colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
              audioConfig: { ...DEFAULT_AUDIO_CONFIG },
            };

    addClip(newClip);
  }

  async function handleSubtitleImport(item: Media) {
    if (!isSubtitleMedia(item)) return;

    const source = fileMap.get(item.id);
    if (!source) {
      window.alert("Subtitle source file is no longer available.");
      return;
    }

    const content = await source.text();
    const parsed = parseSrtFile(content);
    if (parsed.length === 0) {
      window.alert("No valid subtitles were found in the file.");
      return;
    }

    const confirmed = window.confirm(`Import ${parsed.length} subtitle clips from ${item.name}?`);
    if (!confirmed) return;

    setSubtitleImportingIds(prev => new Set(prev).add(item.id));
    try {
      await importSubtitlesAsGroup(item.name.replace(/\.srt$/i, ""), source);
    } finally {
      setSubtitleImportingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  const hasItems = media.length > 0 || pending.length > 0;

  const filteredMedia = searchQuery.trim()
    ? media.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : media;

  const selectedMedia = selectedMediaId
    ? (media.find((m) => m.id === selectedMediaId) ?? null)
    : null;

  return (
    <div
      ref={dropZoneRef}
      className="flex flex-col h-full w-80 overflow-hidden relative border-l border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.35),0_16px_32px_rgba(0,0,0,0.20)]"
      style={{
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none bg-[rgba(34,34,48,0.85)] border-2 border-accent-red">
          <FilePlus2 size={28} className="text-accent-red" />
          <span className="text-[11px] font-semibold text-accent-white">
            Drop files here
          </span>
        </div>
      )}

      {/* Drop error */}
      {dropError && (
        <div className="absolute bottom-2 left-2 right-2 z-20 pointer-events-none rounded bg-dark-elevated border border-[#7f1d1d] px-2 py-1 text-[10px] text-red-400">
          {dropError}
        </div>
      )}

      {/* Panel header */}
      <div className="flex items-center shrink-0 h-10 my-1 mx-3 px-2">
        <span className="flex-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-muted">
          Media
        </span>
        {activeTab === "library" && (
          <button
            onClick={() => inputRef.current?.click()}
            title="Add media"
            className={ghostBtn}
          >
            <Plus size={14} />
            Add Files
          </button>
        )}
      </div>

      {/* Tab row */}
      <div className="flex shrink-0 h-8 border-b border-b-white/7 mx-3">
        <button
          onClick={() => setActiveTab("library")}
          className={[tabBase, activeTab === "library" ? tabActive : tabInactive].join(" ")}
        >
          Library
        </button>
        <button
          onClick={() => setActiveTab("ai-tools")}
          className={[tabBase, activeTab === "ai-tools" ? tabActive : tabInactive].join(" ")}
        >
          AI Tools
        </button>
      </div>

      {/* Search bar — library tab only */}
      {activeTab === "library" && hasItems && (
        <div
          className="flex items-center shrink-0 gap-1.5 my-1 mx-3 px-3 py-2 bg-black/30 border border-white/8 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-accent-red/55 focus-within:ring-2 focus-within:ring-accent-red/12"
          style={{
            backdropFilter: "blur(16px) saturate(140%)",
            WebkitBackdropFilter: "blur(16px) saturate(140%)",
          }}
        >
          <Search size={11} className="text-white/30 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none! text-[11px] text-accent-white font-[inherit] placeholder-white/40 focus:outline-none focus:ring-0 border-none! shadow-none! focus:shadow-none!"
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*,image/*,.srt,text/plain,text/srt,text/x-srt,application/x-subrip"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* ── Library tab ────────────────────────────────────────────────────── */}
      {activeTab === "library" && (
        <>
          {/* Empty state */}
          {!hasItems && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 p-4">
              <div
                className="border-2 border-dashed border-dark-border w-full flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer"
                onClick={() => inputRef.current?.click()}
              >
                <FilePlus2 size={24} className="text-muted" />
                <span className="text-[10px] text-muted text-center">
                  Click or drop
                  <br />
                  video, audio or images
                </span>
              </div>
            </div>
          )}

          {/* Media grid — 2 cols, gap acts as border */}
          {hasItems && (
            <div className="flex-1 overflow-y-auto my-1 mx-3 grid grid-cols-2 gap-0.5 content-start">
              {filteredMedia.map((item) => {
                const isSelected = selectedMediaId === item.id;
                return (
                  <div
                    key={item.id}
                    className={[
                      "min-w-0 overflow-hidden relative rounded-lg transition-shadow duration-120",
                      isSelected
                        ? "ring-2 ring-accent-red/70 ring-offset-1 ring-offset-transparent"
                        : "",
                    ].join(" ")}
                    onClick={() =>
                      setSelectedMediaId(isSelected ? null : item.id)
                    }
                    onDoubleClick={() => insertMediaAtPlayhead(item)}
                  >
                    <MediaCard
                      media={item}
                      objectUrl={getObjectUrl(item.id)}
                      proxyStatus={proxyMap[item.id]?.status}
                      onInsertAtPlayhead={() => insertMediaAtPlayhead(item)}
                      onImportSubtitles={() => void handleSubtitleImport(item)}
                      isImportingSubtitles={subtitleImportingIds.has(item.id)}
                    />
                    {idbResolvedMediaIds.has(item.id) && (
                      <div
                        title="Loaded from local cache"
                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 pointer-events-none"
                      />
                    )}
                  </div>
                );
              })}
              {pending.map((p) => (
                <div key={p.tempId} className="min-w-0 overflow-hidden">
                  <LoadingCard fileName={p.fileName} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── AI Tools tab ───────────────────────────────────────────────────── */}
      {activeTab === "ai-tools" && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Re-mount when selected media changes to reset internal state */}
          <AiToolsPanel
            key={selectedMediaId ?? "none"}
            selectedMedia={selectedMedia}
          />
        </div>
      )}
    </div>
  );
}
