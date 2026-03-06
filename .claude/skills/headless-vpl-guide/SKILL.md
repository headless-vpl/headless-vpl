---
name: headless-vpl-guide
description: Use for questions about the current headless-vpl API, architecture, exports, demos, samples, block helpers, or where a feature lives in source.
metadata:
  short-description: Explain the current headless-vpl API and map features to source.
---

# Headless VPL Guide

現在の `headless-vpl` の API / architecture / examples に関する質問へ答える skill。
旧 skill にある長い API 早見表より、現行 source と demos を優先する。

## Source Of Truth Order

1. `src/lib/headless-vpl/index.ts` — 値 export (62 個) + 型 export (37 個)
2. `docs/api-reference.md`
3. `docs/recipes.md`
4. feature の実装ファイル (`core/`, `util/`, `blocks/`)
5. 対応する demo / sample

## Answering Rules

- export の有無は必ず `src/lib/headless-vpl/index.ts` で確認する。
- 実際の振る舞いは docs より source を優先する。
- 「どう作るか」を聞かれたら sample / example を案内する。
- 「どこにあるか」を聞かれたら file path ベースで案内する。
- 通常の AutoLayout ネストは領域判定ベースで説明する。
- Snap や特例ネストは Connector ベースで説明する。
- block editor については `src/pages/samples/block-editor/` と `src/lib/headless-vpl/blocks/` を見る。
- 回答では、export に基づく事実と source からの推論を区別する。

## Read As Needed

- 現在の export / core / util / block helper の地図: `references/api-map.md`
- demo / sample / example の使い分け: `references/demo-map.md`

