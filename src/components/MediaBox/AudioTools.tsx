import { useState } from 'react';
import { Wand2, SlidersHorizontal, ChevronDown, ChevronRight } from 'lucide-react';

interface EqBand {
  label: string;
  frequency: number;
  value: number;
}

const DEFAULT_EQ_BANDS: EqBand[] = [
  { label: '32', frequency: 32, value: 50 },
  { label: '125', frequency: 125, value: 50 },
  { label: '500', frequency: 500, value: 50 },
  { label: '2k', frequency: 2000, value: 50 },
  { label: '8k', frequency: 8000, value: 50 },
  { label: '16k', frequency: 16000, value: 50 },
];

/** Maps a 0–100 slider value to a -12 to +12 dB gain string. */
function toDbLabel(value: number): string {
  const db = Math.round(((value - 50) / 50) * 12);
  return db > 0 ? `+${db}` : `${db}`;
}

export default function AudioTools() {
  const [aiExpanded, setAiExpanded] = useState(true);
  const [eqExpanded, setEqExpanded] = useState(false);
  const [eqBands, setEqBands] = useState<EqBand[]>(DEFAULT_EQ_BANDS);

  function updateBand(index: number, value: number) {
    setEqBands(prev => prev.map((b, i) => (i === index ? { ...b, value } : b)));
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-muted text-xs font-semibold uppercase tracking-widest px-1 mb-3">Audio Tools</p>

      {/* Better Audio AI */}
      <div className="glass-card rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setAiExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-glass transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blood-red/20 flex items-center justify-center shrink-0">
              <Wand2 className="w-3.5 h-3.5 text-accent-red" />
            </div>
            <span className="text-accent-white text-xs font-semibold">Better Audio AI</span>
          </div>
          {aiExpanded
            ? <ChevronDown className="w-4 h-4 text-muted shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
        </button>

        {aiExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-glass-border">
            <ul className="pt-2 space-y-1">
              {['Removes background noise', 'Suppresses room reverb', 'Enhances voice clarity'].map(item => (
                <li key={item} className="flex items-center gap-2 text-muted text-xs">
                  <span className="w-1 h-1 rounded-full bg-accent-red shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="w-full py-1.5 rounded-lg bg-blood-red/20 hover:bg-blood-red/35 text-accent-red text-xs font-semibold transition-colors mt-1"
            >
              Enhance Audio
            </button>
          </div>
        )}
      </div>

      {/* Audio Equalizer */}
      <div className="glass-card rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setEqExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-glass transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blood-red/20 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent-red" />
            </div>
            <span className="text-accent-white text-xs font-semibold">Audio Equalizer</span>
          </div>
          {eqExpanded
            ? <ChevronDown className="w-4 h-4 text-muted shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
        </button>

        {eqExpanded && (
          <div className="px-3 pb-3 border-t border-glass-border pt-3 space-y-2">
            {eqBands.map((band, i) => (
              <div key={band.frequency} className="flex items-center gap-2">
                <span className="text-muted text-[10px] w-7 text-right shrink-0">{band.label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={band.value}
                  onChange={e => updateBand(i, Number(e.target.value))}
                  className="flex-1 h-1 rounded-full appearance-none bg-dark-elevated accent-blood-red cursor-pointer"
                />
                <span className="text-muted text-[10px] w-7 shrink-0">{toDbLabel(band.value)}dB</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
