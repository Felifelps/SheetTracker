import type { Character } from "../domain/character";

interface NotesSectionProps {
  character: Character;
  update: (updater: (c: Character) => Character) => void;
}

export function NotesSection({ character, update }: NotesSectionProps) {
  return (
    <section className="panel">
      <h2>Anotações</h2>
      <label htmlFor="char-notes" className="visually-hidden">
        Anotações livres do personagem
      </label>
      <textarea
        id="char-notes"
        className="notes-textarea"
        rows={5}
        placeholder="Tatuagens, dívidas, pistas, contatos…"
        value={character.notes}
        onChange={(event) => {
          const text = event.target.value;
          update((c) => ({ ...c, notes: text }));
        }}
      />
    </section>
  );
}