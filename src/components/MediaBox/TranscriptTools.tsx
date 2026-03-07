import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { generateTranscript } from '../../video-processing/transcript.service';

export default function TranscriptTools() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState('');

  async function handleGenerate() {
    setIsGenerating(true);
    // In a real implementation, pass the active clip's file path here
    const result = await generateTranscript('active-clip');
    if (result.success && result.data) {
      setTranscript(result.data.fullText);
    } else {
      setTranscript('Transcript generation is not yet connected to a backend.');
    }
    setIsGenerating(false);
  }

  return (
    <div className="p-3 space-y-3">
      <p className="text-muted text-xs font-semibold uppercase tracking-widest px-1">Transcript</p>

      {/* Generate action */}
      <div className="glass-card rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blood-red/20 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 text-accent-red" />
          </div>
          <span className="text-accent-white text-xs font-semibold">Generate Transcript</span>
        </div>
        <p className="text-muted text-xs leading-relaxed">
          Extract a text transcript from the selected video or audio clip.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-1.5 rounded-lg bg-blood-red/20 hover:bg-blood-red/35 text-accent-red text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Transcript viewer */}
      <div className="glass-card rounded-xl p-3">
        <p className="text-muted text-xs font-medium mb-2">Output</p>
        <div className="min-h-28 text-xs text-muted-light leading-relaxed">
          {transcript || (
            <span className="text-muted italic text-xs">
              No transcript yet. Select a clip and click Generate.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
