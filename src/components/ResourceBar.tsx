import { useId } from "react";

interface ResourceBarProps {
  label: string;
  current: number;
  max: number;
  tone: "hp" | "mp";
  onCurrentChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

export function ResourceBar({ label, current, max, tone, onCurrentChange, onMaxChange }: ResourceBarProps) {
  const id = useId();
  const safeMax = Math.max(1, max);
  const safeCurrent = Math.min(safeMax, Math.max(0, current));
  const percent = Math.round((safeCurrent / safeMax) * 100);

  return (
    <div className={`resource-bar resource-${tone}`}>
      <div className="resource-bar-row">
        <span className="resource-label" id={`${id}-label`}>
          {label}
        </span>
        <button
          type="button"
          className="resource-btn"
          aria-label={`Diminuir ${label} em 1`}
          onClick={() => onCurrentChange(Math.max(0, safeCurrent - 1))}
        >
          −
        </button>
        <input
          className="resource-current"
          type="number"
          inputMode="numeric"
          min={0}
          max={safeMax}
          aria-labelledby={`${id}-label`}
          value={safeCurrent}
          onChange={(event) => {
            const value = event.target.valueAsNumber;
            if (!Number.isNaN(value)) {
              onCurrentChange(Math.min(safeMax, Math.max(0, value)));
            }
          }}
        />
        <span className="resource-sep" aria-hidden="true">
          /
        </span>
        <input
          className="resource-max"
          type="number"
          inputMode="numeric"
          min={1}
          aria-label={`${label} máximo`}
          value={safeMax}
          onChange={(event) => {
            const value = event.target.valueAsNumber;
            if (!Number.isNaN(value)) {
              onMaxChange(Math.max(1, Math.floor(value)));
            }
          }}
        />
        <button
          type="button"
          className="resource-btn"
          aria-label={`Aumentar ${label} em 1`}
          onClick={() => onCurrentChange(Math.min(safeMax, safeCurrent + 1))}
        >
          +
        </button>
      </div>
      <div
        className="resource-track"
        role="meter"
        aria-valuenow={safeCurrent}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={`${label}: ${safeCurrent} de ${safeMax}`}
      >
        <div className={`resource-fill resource-fill-${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}