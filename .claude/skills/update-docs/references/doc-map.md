# Doc Map

## Current Public Docs

- `README.md`
- `README.en.md`
- `docs/api-reference.md`
- `docs/architecture.md`
- `docs/recipes.md`

## Current Source Of Truth

- export surface
  - `src/lib/headless-vpl/index.ts` (値 62 + 型 37)
- implementation
  - `src/lib/headless-vpl/core/` — Workspace, Container, Connector, Edge, AutoLayout, Position, EventBus, SelectionManager, History, commands
  - `src/lib/headless-vpl/util/` — interaction, edgeBuilder, snap, nesting, domSync, clipboard, marquee, resize, viewport, wheelZoom, shortcuts, keyboard, autoPan, snapToGrid, contentSize, edgePath, distance, animate, mouse
  - `src/lib/headless-vpl/blocks/` — stack, connect, dom, zones (zones は未 export)
  - `src/lib/headless-vpl/rendering/SvgRenderer.ts`
- hooks
  - `src/hooks/useWorkspace.ts`
- route and demo list
  - `src/main.tsx`
  - `src/pages/Home.tsx`
- demos (11 個)
  - `src/pages/demos/DragAndDrop.tsx`, `EdgeTypes.tsx`, `EdgeBuilderDemo.tsx`, `SnapConnectionDemo.tsx`, `AutoLayoutDemo.tsx`, `NestingDemo.tsx`, `SelectionDemo.tsx`, `ZoomPanDemo.tsx`, `ResizeDemo.tsx`, `UndoRedoDemo.tsx`, `CopyPasteDemo.tsx`
- samples (6 個)
  - `src/pages/samples/FlowEditor.tsx`, `HybridEditor.tsx`, `BlueprintEditor.tsx`, `StateMachine.tsx`, `WorkflowEditor.tsx`
  - `src/pages/samples/block-editor/` (BlockEditorPage.tsx, defs.ts, scene.ts, controller.ts, interactions.ts, layout.ts, view.tsx)
- tools (1 個)
  - `src/pages/tools/Factory.tsx`
- user-facing examples
  - `examples/vanilla-ts-minimal/main.ts`
  - `examples/flow-editor/main.ts`

## Local Knowledge Files

- `.claude/skills/*/SKILL.md`
- `.claude/skills/*/references/*.md`
- `CLAUDE.md`
- `AGENTS.md`
- `CONTRIBUTING.md`

## Update Checklist

1. export が変わったら `src/lib/headless-vpl/index.ts` を基準に docs と skills を更新する
2. demo / sample が変わったら `src/main.tsx` と `src/pages/Home.tsx` も確認する
3. README のコード例は `examples/` と current API に揃える
4. React 向け説明は `src/hooks/useWorkspace.ts` に揃える
5. block editor の説明は `src/pages/samples/block-editor/` の分割構成に揃える
6. path 例は相対パスかプレースホルダーを使い、個人環境の絶対パスを書かない

## Useful Greps

- 削除済みファイル参照:
  - `rg -n "docs-site|memory/MEMORY|disable-model-invocation|argument-hint" README.md README.en.md docs .claude/skills CLAUDE.md`
- 絶対パス混入:
  - `rg -n "/Users/|/home/" README.md README.en.md docs .claude/skills CLAUDE.md CONTRIBUTING.md AGENTS.md`
- block editor の古い単一ファイル前提:
  - `rg -n "BlockEditor.tsx|Scratch風" docs .claude/skills README.md README.en.md`
- 未 export API への public 参照:
  - `rg -n "createConnectorInsertZone|findConnectorInsertHit|isConnectorColliding" .claude/skills docs README.md README.en.md`
- `blocks/zones.ts` への直接参照 (skills/docs 内で public API として紹介していないか):
  - `rg -n "blocks/zones" .claude/skills docs README.md README.en.md`

## Stale Assumptions To Remove

- `docs-site/` が存在する前提
- `headless-vpl` に `blocks/*` helper がない前提
- block editor が単一ファイルで完結している前提
- docs や skill に古い frontmatter を置く前提
- `blocks/zones.ts` の `createConnectorInsertZone` / `findConnectorInsertHit` / `isConnectorColliding` が公開 API である前提
  - これらは `blocks/zones.ts` に存在するが `index.ts` からは未 export
  - skills / docs では「未 export の内部ヘルパー」として扱い、公開 API としてリストしない
