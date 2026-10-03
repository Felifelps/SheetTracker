import type { SystemDefinition } from "../domain/system";

interface AttributeGridProps {
  system: SystemDefinition;
  attributes: Record<string, number>;
  onChange: (attributeId: string, value: number) => void;
}

export function AttributeGrid({ system, attributes, onChange }: AttributeGridProps) {
  return (
    <div className="attribute-grid">
      {system.attributes.map((attr) => {
        const value = attributes[attr.id] ?? 0;
        return (
          <div key={attr.id} className="attribute-cell">
            <span className="attribute-abbr" title={attr.name}>
              {attr.abbr}
            </span>
            <div className="stepper">
              <button
                type="button"
                className="stepper-btn"
                aria-label={`Diminuir ${attr.name}`}
                onClick={() => onChange(attr.id, value - 1)}
              >
                −
              </button>
              <span className={`attribute-value ${value < 0 ? "attribute-negative" : ""}`}>
                {value > 0 ? "+" : ""}
                {value}
              </span>
              <button
                type="button"
                className="stepper-btn"
                aria-label={`Aumentar ${attr.name}`}
                onClick={() => onChange(attr.id, value + 1)}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}