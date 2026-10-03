import { createContext, useContext, type ReactNode } from "react";
import { useCharacters } from "./useCharacters";
import type { CharactersApi } from "./useCharacters";

const CharactersContext = createContext<CharactersApi | null>(null);

export function CharactersProvider({ children }: { children: ReactNode }) {
  const api = useCharacters();
  return <CharactersContext.Provider value={api}>{children}</CharactersContext.Provider>;
}

export function useCharactersApi(): CharactersApi {
  const api = useContext(CharactersContext);
  if (!api) {
    throw new Error("useCharactersApi deve ser usado dentro de CharactersProvider.");
  }
  return api;
}