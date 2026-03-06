---
name: create-vpl
description: Use for building or extending headless-vpl editors, demos, examples, or code snippets from the current API, samples, and block helpers.
metadata:
  short-description: Build new headless-vpl editors from the current source and demos.
---

# Create VPL

`headless-vpl` の新規コード生成、demo 追加、sample 拡張、README 用スニペット作成に使う。
古い skill のように API を丸暗記せず、必ず現行 source と一番近い実装例を起点にする。

## Quick Workflow

1. まず `src/lib/headless-vpl/index.ts` を開き、使える export を確認する。
2. 実装対象を次のどれかに分類する。
   - バニラ TS の最小例
   - React demo / sample
   - ブロック型 / C-block / slot を含む block editor
   - docs / README 用の短いコード例
3. 分類に対応する基準ファイルを `references/patterns.md` から選ぶ。
4. 近い実装をコピーするのではなく、必要機能だけを残して最小構成で組み直す。
5. コード生成後は、参照した sample と export 一覧に照らして API 名・引数・イベント名を確認する。

## Current Defaults

- バニラ TS の最小構成は `examples/vanilla-ts-minimal/main.ts`
- フロー型のバニラ例は `examples/flow-editor/main.ts`
- React demo の canonical setup は `src/hooks/useWorkspace.ts`
- block editor の canonical setup は `src/pages/samples/block-editor/`
- current docs は `docs/api-reference.md` と `docs/recipes.md`

## Generation Rules

- まず現在の repo にある sample / demo と同じ構成を優先する。
- React では `useWorkspace` パターンに寄せ、独自の初期化ロジックを増やしすぎない。
- バニラ TS では以下を基本骨格にする:
  - `Workspace` + `SvgRenderer` + `InteractionManager`
  - `getMouseState` (`src/lib/headless-vpl/util/mouse.ts` — 未 export、直接 import)
  - `animate` (`src/lib/headless-vpl/util/animate.ts` — 未 export、直接 import)
- `InteractionManager` のセットアップパターン:
  - `handlePointerDown(screenPos, { button, shiftKey, target })` — pointerdown で呼ぶ
  - `handlePointerUp(screenPos)` — pointerup で呼ぶ
  - `tick(screenPos, buttonState)` — animate ループ内で毎フレーム呼ぶ
- 通常の AutoLayout ネストは領域判定ベースで考える。
- 接続や特例ネストは Connector ベースで考える。
- C-block body や slot のような専用挿入点では `NestingZone` + `createSlotZone` を使う。
  - ブロックエディタ内部では `blocks/zones.ts` の未 export ヘルパーも使われる（`src/lib/headless-vpl/blocks/zones.ts` から直接 import）。
- ドキュメント用スニペットでは個人環境の絶対パスを書かない。

## Read As Needed

- 基準ファイルと feature 別の選び方: `references/patterns.md`
