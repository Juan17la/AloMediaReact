import { useState } from 'react';
import { Sun, Moon, Droplets, Thermometer, RotateCcw } from 'lucide-react';

interface VisualSetting {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SETTINGS: VisualSetting[] = [
  { id: 'brightness', label: 'Brightness', icon: Sun },
  { id: 'contrast', label: 'Contrast', icon: Moon },
  { id: 'saturation', label: 'Saturation', icon: Droplets },
  { id: 'temperature', label: 'Temperature', icon: Thermometer },
];

type SettingValues = Record<string, number>;

const DEFAULTS: SettingValues = {
  brightness: 50,
  contrast: 50,
  saturation: 50,
  temperature: 50,
};

/** Maps a 0–100 slider value to a signed offset string centred at 0. */
function toOffsetLabel(value: number): string {
  const offset = Math.round(value - 50);
  return offset > 0 ? `+${offset}` : `${offset}`;
}

export default function VisualEnhancement() {
  const [values, setValues] = useState<SettingValues>(DEFAULTS);

  function updateSetting(id: string, value: number) {
    setValues(prev => ({ ...prev, [id]: value }));
  }

  function resetAll() {
    setValues(DEFAULTS);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest">Visual</p>
        <button
          type="button"
          onClick={resetAll}
          className="flex items-center gap-1 text-muted hover:text-accent-white text-xs transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="glass-card rounded-xl p-3 space-y-3">
        {SETTINGS.map(({ id, label, icon: Icon }) => (
          <div key={id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-accent-red" />
                <span className="text-accent-white text-xs font-medium">{label}</span>
              </div>
              <span className="text-muted text-[10px] tabular-nums w-6 text-right">
                {toOffsetLabel(values[id])}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={values[id]}
              onChange={e => updateSetting(id, Number(e.target.value))}
              className="w-full h-1 rounded-full appearance-none bg-dark-elevated accent-blood-red cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
