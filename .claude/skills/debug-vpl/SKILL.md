---
name: debug-vpl
description: Use for diagnosing headless-vpl behavior bugs in drag, snap, nesting, edges, DOM sync, history, block helpers, or demo/sample regressions.
metadata:
  short-description: Diagnose current headless-vpl interaction and rendering bugs.
---

# Debug VPL

`headless-vpl` の不具合調査に使う。現行の `InteractionManager`、`useWorkspace`、`blocks/*`、sample 実装を起点にして原因を絞る。

## Debug Workflow

1. 症状を機能単位に落とす。
   - drag / pan / selection
   - edge / connector
   - snap
   - nesting / AutoLayout
   - block editor 固有の body / slot
   - DOM sync
   - history / copy-paste / delete
2. `references/troubleshooting.md` から最も近い症状を選び、確認する source file を特定する。
3. まず最新の実装を読む。古い skill の説明や存在しない docs-site 前提では判断しない。
4. 「再現条件」「原因」「最小修正」を分けて説明する。
5. 可能なら一番近い demo / sample を基準にして差分で説明する。

## Important Rules

- 通常の AutoLayout ネスト不具合は領域判定の崩れとして疑う。
- Snap や body 挿入の不具合は Connector ベース判定として疑う。
- C-block body は `NestingZone` + `createSlotZone` と block-editor 専用 layout 同期を確認する。
  - 内部的には `blocks/zones.ts` (`createConnectorInsertZone` / `findConnectorInsertHit`) も使われるが、これは index.ts から未 export。
- React demo のズレは `useWorkspace` と `DomSyncHelper` を先に確認する。
  - `useWorkspace` の config (`interactionOverrides`) と return (`workspaceRef`, `interactionRef`) を確認。
- `InteractionManager` の API は `handlePointerDown` / `handlePointerUp` / `tick` の 3 メソッド。
- 不具合説明では、実装の source file を必ず添える。

## Read As Needed

- 症状別チェックリスト: `references/troubleshooting.md`
