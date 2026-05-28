import type {
  AudioConfig,
  Clip,
  ClipTransition,
  ColorAdjustments,
  Media,
  Project,
  TextStyle,
  Track,
  TrackType,
  Transform,
} from "../../project/projectTypes";

export interface ProjectSlice {
  project: Project;
  missingMediaIds: Set<string>;
  idbResolvedMediaIds: Set<string>;
  addMedia: (file: File) => Promise<Media>;
  importSubtitlesAsGroup: (
    groupName: string,
    file: File,
  ) => Promise<{ trackId: string; groupId: string; clipCount: number }>;
  addClip: (clip: Clip) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newStart: number, trackId: string) => void;
  moveClipsBatch: (
    moves: Array<{ clipId: string; newStart: number; trackId: string }>,
  ) => void;
  splitClip: (clipId: string, time: number) => void;
  addTrack: (type: TrackType) => Track;
  removeTrack: (trackId: string) => void;
  reorderTrack: (sourceTrackId: string, targetTrackId: string) => void;
  resizeClip: (clipId: string, newEnd: number) => void;
  updateClipTransform: (clipId: string, transform: Partial<Transform>) => void;
  updateClipTransformsBatch: (
    updates: Array<{ clipId: string; transform: Partial<Transform> }>,
  ) => void;
  commitTransform: (clipId: string) => void;
  commitTransformsBatch: () => void;
  updateClipColorAdjustments: (
    clipId: string,
    adjustments: ColorAdjustments,
  ) => void;
  updateClipAudioConfig: (clipId: string, config: Partial<AudioConfig>) => void;
  setClipTransitionIn: (
    clipId: string,
    transition: ClipTransition | undefined,
  ) => void;
  setClipTransitionOut: (
    clipId: string,
    transition: ClipTransition | undefined,
  ) => void;
  setClipSpeed: (clipId: string, speed: number) => void;
  updateTextClip: (
    clipId: string,
    updates: { content?: string; style?: Partial<TextStyle> },
  ) => void;
  updateTextClipsBatch: (
    updates: Array<{ clipId: string; style: Partial<TextStyle> }>,
  ) => void;
  extractAudioFromClip: (clipId: string) => Promise<Media | null>;
  removeMedia: (mediaId: string) => void;
  setMissingMediaIds: (ids: Set<string>) => void;
  loadProject: (project: Project) => Promise<void>;
  resetProject: () => void;
}

export type ProjectMediaActions = Pick<
  ProjectSlice,
  | "setMissingMediaIds"
  | "loadProject"
  | "addMedia"
  | "importSubtitlesAsGroup"
  | "removeMedia"
  | "resetProject"
>;

export type ProjectTimelineActions = Pick<
  ProjectSlice,
  | "addClip"
  | "removeClip"
  | "moveClip"
  | "moveClipsBatch"
  | "splitClip"
  | "addTrack"
  | "removeTrack"
  | "reorderTrack"
  | "resizeClip"
  | "extractAudioFromClip"
>;

export type ProjectClipPropertyActions = Pick<
  ProjectSlice,
  | "updateClipTransform"
  | "updateClipTransformsBatch"
  | "commitTransform"
  | "commitTransformsBatch"
  | "updateClipColorAdjustments"
  | "updateClipAudioConfig"
  | "setClipTransitionIn"
  | "setClipTransitionOut"
  | "setClipSpeed"
  | "updateTextClip"
  | "updateTextClipsBatch"
>;
