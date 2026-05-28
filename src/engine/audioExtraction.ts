import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { safeMediaFileName } from "./ffmpegUtils";

const ffmpegAudioExtraction = new FFmpeg();
const CORE_BASE_URL = new URL("/ffmpeg-core-st/", location.href).href;
const OUTPUT_MIME_TYPE = "audio/wav";

let loadPromise: Promise<void> | null = null;
let extractionQueue: Promise<void> = Promise.resolve();

async function loadAudioExtractionFFmpeg(): Promise<void> {
  if (ffmpegAudioExtraction.loaded) return;

  if (!loadPromise) {
    loadPromise = (async () => {
      await ffmpegAudioExtraction.load({
        coreURL: await toBlobURL(
          `${CORE_BASE_URL}ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${CORE_BASE_URL}ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });
    })().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }

  await loadPromise;
}

function enqueueExtraction<T>(task: () => Promise<T>): Promise<T> {
  const run = extractionQueue.then(task, task);
  extractionQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function buildOutputFileName(sourceFile: File): string {
  const dotIndex = sourceFile.name.lastIndexOf(".");
  const baseName =
    dotIndex > 0 ? sourceFile.name.slice(0, dotIndex) : sourceFile.name;
  return `${baseName}_extracted.wav`;
}

async function runAudioExtraction(
  mediaId: string,
  sourceFile: File,
  startSeconds?: number,
  endSeconds?: number,
): Promise<File> {
  const inputName = safeMediaFileName(mediaId, sourceFile);
  const outputName = `audio_${mediaId}.wav`;
  const hasTrimRange =
    typeof startSeconds === "number" &&
    typeof endSeconds === "number" &&
    endSeconds > startSeconds;

  await loadAudioExtractionFFmpeg();
  await ffmpegAudioExtraction.writeFile(inputName, await fetchFile(sourceFile));

  try {
    const command = hasTrimRange
      ? [
          "-ss",
          `${startSeconds}`,
          "-i",
          inputName,
          "-t",
          `${endSeconds - startSeconds}`,
          "-map",
          "0:a:0",
          "-vn",
          "-c:a",
          "pcm_s16le",
          "-ar",
          "44100",
          "-ac",
          "2",
          outputName,
        ]
      : [
          "-i",
          inputName,
          "-map",
          "0:a:0",
          "-vn",
          "-c:a",
          "pcm_s16le",
          "-ar",
          "44100",
          "-ac",
          "2",
          outputName,
        ];

    await ffmpegAudioExtraction.exec(command);

    const raw = (await ffmpegAudioExtraction.readFile(
      outputName,
    )) as Uint8Array;
    const copy = new Uint8Array(raw.length);
    copy.set(raw);

    const blob = new Blob([copy], { type: OUTPUT_MIME_TYPE });
    return new File([blob], buildOutputFileName(sourceFile), {
      type: OUTPUT_MIME_TYPE,
    });
  } finally {
    await ffmpegAudioExtraction.deleteFile(inputName).catch(() => {});
    await ffmpegAudioExtraction.deleteFile(outputName).catch(() => {});
  }
}

export function extractAudioFromVideo(
  mediaId: string,
  sourceFile: File,
  startSeconds?: number,
  endSeconds?: number,
): Promise<File> {
  return enqueueExtraction(() =>
    runAudioExtraction(mediaId, sourceFile, startSeconds, endSeconds),
  );
}
