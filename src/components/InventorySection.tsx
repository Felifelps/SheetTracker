import { useState } from "react";
import type { Character } from "../domain/character";
import { generateId } from "../utils/id";

interface InventorySectionProps {
  character: Character;
  update: (updater: (c: Character) => Character) => void;
}

export function InventorySection({ character, update }: InventorySectionProps) {
  const [newName, setNewName] = useState("");
  const [newDamage, setNewDamage] = useState("");
  const [newDescription, setNewDescription] = useState("");

  function addItem() {
    const name = newName.trim();
    if (!name) return;
    update((c) => ({
      ...c,
      inventory: [
        ...c.inventory,
        {
          id: generateId(),
          name,
          damage: newDamage.trim() || undefined,
          description: newDescription.trim() || undefined,
          quantity: 1,
        },
      ],
    }));
    setNewName("");
    setNewDamage("");
    setNewDescription("");
  }

  function updateItem(
    id: string,
    patch: Partial<{
      name: string;
      damage?: string;
      description?: string;
      quantity: number;
      acBonus?: number;
      equipped?: boolean;
    }>
  ) {
    update((c) => ({
      ...c,
      inventory: c.inventory.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function removeItem(id: string) {
    update((c) => ({
      ...c,
      inventory: c.inventory.filter((item) => item.id !== id),
    }));
  }

  return (
    <section className="panel">
      <h2>Inventário</h2>
      <p className="hint">
        CA = 10 + Destreza + bônus de CA dos itens equipados. Use o campo "CA +" no item e marque
        "Equip." para aplicá-lo.
      </p>
      {character.inventory.length === 0 && (
        <p className="section-empty">Nenhum item. Use o formulário abaixo para adicionar.</p>
      )}
      <ul className="inventory-list">
        {character.inventory.map((item) => (
          <li key={item.id} className="inventory-row">
            <div className="stepper stepper-inline">
              <button
                type="button"
                className="stepper-btn"
                aria-label={`Diminuir quantidade de ${item.name}`}
                onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}
              >
                −
              </button>
              <span className="use-value" aria-label={`Quantidade de ${item.name}`}>
                {item.quantity}
              </span>
              <button
                type="button"
                className="stepper-btn"
                aria-label={`Aumentar quantidade de ${item.name}`}
                onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
              >
                +
              </button>
            </div>
            <div className="inventory-fields">
              <input
                className="inventory-name"
                type="text"
                value={item.name}
                aria-label={`Nome do item`}
                onChange={(event) => updateItem(item.id, { name: event.target.value })}
              />
              <input
                className="inventory-damage"
                type="text"
                placeholder="Dano (ex.: 1d4)"
                value={item.damage ?? ""}
                aria-label={`Dano de ${item.name}`}
                onChange={(event) =>
                  updateItem(item.id, {
                    damage: event.target.value.trim() || undefined,
                  })
                }
              />
              <input
                className="inventory-desc"
                type="text"
                placeholder="Detalhes"
                value={item.description ?? ""}
                aria-label={`Detalhes de ${item.name}`}
                onChange={(event) =>
                  updateItem(item.id, {
                    description: event.target.value.trim() || undefined,
                  })
                }
              />
              <input
                className="inventory-ac"
                type="number"
                inputMode="numeric"
                placeholder="CA +"
                aria-label={`Bônus de CA de ${item.name}`}
                value={item.acBonus ?? ""}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  updateItem(item.id, {
                    acBonus: Number.isNaN(value) ? undefined : value,
                  });
                }}
              />
              <label className="check-label check-label-small equip-label">
                <input
                  type="checkbox"
                  checked={item.equipped ?? false}
                  onChange={() =>
                    updateItem(item.id, { equipped: !(item.equipped ?? false) })
                  }
                  aria-label={`Equipar ${item.name}`}
                />
                <span>Equip.</span>
              </label>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remover ${item.name}`}
              onClick={() => removeItem(item.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="add-row add-row-form">
        <label htmlFor="item-name" className="visually-hidden">
          Nome do novo item
        </label>
        <input
          id="item-name"
          type="text"
          placeholder="Item (ex.: Adaga)"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addItem();
          }}
        />
        <label htmlFor="item-damage" className="visually-hidden">
          Dano do novo item
        </label>
        <input
          id="item-damage"
          type="text"
          placeholder="Dano (ex.: 1d4)"
          className="inventory-damage"
          value={newDamage}
          onChange={(event) => setNewDamage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addItem();
          }}
        />
        <label htmlFor="item-desc" className="visually-hidden">
          Detalhes do novo item
        </label>
        <input
          id="item-desc"
          type="text"
          placeholder="Detalhes"
          className="inventory-desc"
          value={newDescription}
          onChange={(event) => setNewDescription(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addItem();
          }}
        />
        <button type="button" className="btn" disabled={!newName.trim()} onClick={addItem}>
          Adicionar
        </button>
      </div>
    </section>
  );
}