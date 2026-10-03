# SheetTracker

Gerenciador de fichas de personagens de RPG de mesa. Frontend puro (SPA), sem backend e sem banco de dados remoto — os dados ficam no `localStorage` do navegador e podem ser exportados/importados como JSON.

## Funcionalidades

- Criar, editar e excluir fichas (exclusão com confirmação)
- Visualização de ficha pensada para uso durante sessão: PV/PM com botões grandes de ajuste, contadores de uso de habilidades, botões de descanso curto/longo
- Atributos, perícias (com especialização), testes de resistência (atributo + proficiência), CD/ataque de magia derivados do sistema
- Progressão derivada: PV máximo = PV base + (nível − 1) × teto(PV base/2) + mod. de Constituição; PM a partir do nível de desbloqueio da classe; CA = 10 + Destreza + bônus de CA dos equipamentos equipados
- Magias com custo em Pontos de Magia, inventário, condições (padrão + personalizadas), anotações
- Auto-save: tudo é salvo automaticamente no `localStorage`
- Exportar/importar ficha individual em JSON (validado, com mensagens de erro claras)
- Atalho: teclas `+` e `−` ajustam PV (quando nenhum campo está focado)

## Stack

- React 19 + Vite + TypeScript
- `react-router-dom` (única dependência de runtime além do React)
- CSS puro com custom properties (tema escuro, cores semânticas: PV vermelho, PM roxo, usos verde, condições âmbar)

## Arquitetura

```text
src/
  domain/     tipos + validadores hand-written (sem dependências)
  systems/    definição do sistema em JSON (pseudo-dnd.json)
  rules/      derivados (CD, ataque mágico, proficiência), clamps, descansos
  services/   storage (único acesso a localStorage) + import/export
  state/      contexto do sistema + CRUD de personagens com auto-save
  pages/      HomePage, NewCharacterPage, SheetPage
  components/ seções da ficha e peças reutilizáveis
  dev/        smoke test de domínio (npm run test)
```

O personagem armazena apenas **fatos** (valores e referências por ID); o que é derivável (CD de magia, ataque mágico, proficiência, PV/PM sugeridos) é calculado em runtime a partir do JSON do sistema. Componentes nunca conhecem regras específicas do Pseudo-DnD.

## Scripts

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # typecheck + build de produção (dist/)
npm run preview  # serve o build localmente
npm run test     # smoke test de domínio (validadores + regras)
```

## Deploy no Netlify

O `netlify.toml` já está configurado (build `npm run build`, publish `dist/`, redirect SPA `/* → /index.html`).

Opções:

1. Conectar o repositório no Netlify (build automático); ou
2. CLI local:

```bash
npx netlify deploy --build --prod
```

Observação: `localStorage` é por origem/navegador. Cada jogador mantém suas fichas no próprio navegador; para transferir fichas entre navegadores/máquinas, use Exportar/Importar JSON.

## Decisões de modelagem (fonte: Obsidian/Pseudo-Dnd)

Documentadas em `src/systems/pseudo-dnd.json` → campo `notes`:

1. Progressão de PV e PM centralizada em cada classe do JSON (`hpBase`, `spellcasting.magicPoints.{base, unlockLevel}`); PV máximo = base + (nível − 1) × teto(base/2) + **mod. de Constituição × nível**; PM a partir do nível de desbloqueio da classe; máximos são exclusivamente calculados (não editáveis) e recalculados ao mudar nível/Constituição, preservando os valores atuais.
2. Importação aceita somente campos editáveis: máximos (PV/PM), CA antiga e demais valores calculados são ignorados e recalculados.
3. Seletor de nível oferece apenas os níveis definidos no JSON da classe (atualmente 1–2).
4. CA é derivada (10 + DES + bônus de CA dos itens equipados); testes de resistência = modificador do atributo + proficiência da classe.
5. Apenas as magias concedidas pela Maldição do Guardião (nível 2) custam PM; PM recuperados em descanso longo. Descanso longo restaura PV/PM por completo; descanso curto recupera metade do máximo.
6. Habilidades com recarga "por encontro" também são restauradas por descanso curto/longo.
7. Deslocamento em quadrados.
8. Perícias seguem a lista padrão D&D em português; condições são lista de apoio (não formalizadas nos arquivos).
9. Raça e classe são fixadas na criação; nível pode ser alterado depois dentro dos níveis definidos no JSON, recalculando recursos automaticamente. Em conflito com documentos antigos, valem as definições atuais.