import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SystemProvider } from "./state/useSystem";
import { CharactersProvider } from "./state/CharactersProvider";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { NewCharacterPage } from "./pages/NewCharacterPage";
import { SheetPage } from "./pages/SheetPage";

function NotFound() {
  return (
    <section className="panel empty-state">
      <h2>Página não encontrada</h2>
      <p>O endereço acessado não existe. Use a lista de fichas para navegar.</p>
    </section>
  );
}

export default function App() {
  return (
    <SystemProvider>
      <CharactersProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/novo" element={<NewCharacterPage />} />
              <Route path="/ficha/:id" element={<SheetPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </CharactersProvider>
    </SystemProvider>
  );
}