---
name: update-docs
description: Use for syncing README, docs, and local skills with current headless-vpl API, demos, examples, routing, and architecture changes.
metadata:
  short-description: Sync docs and skills with current headless-vpl source changes.
---

# Update Docs

API 変更、demo 更新、route 変更、block helper 追加に合わせて docs と skills を同期する。
この repo では `docs-site/` 前提の古い手順は使わず、現在存在する docs / README / skills / examples を更新対象にする。

## Update Workflow

1. 変更の source of truth を読む。
   - `src/lib/headless-vpl/index.ts`
   - 変更が入った `src/lib/headless-vpl/**`
   - 影響する `examples/**` / `src/pages/**`
2. `references/doc-map.md` を見て、更新対象ファイルを洗い出す。
3. `rg` で旧 API 名、旧 route、削除済みファイル参照、古い skill 記述を探す。
4. 優先度順に更新する。
   - README / README.en
   - `docs/api-reference.md`, `docs/recipes.md`, `docs/architecture.md`
   - `.claude/skills/**`
   - `CLAUDE.md`, `CONTRIBUTING.md`, `AGENTS.md` が影響を受ける場合のみ
5. 変更後に grep で古い記述の残存を確認する。

## Rules

- 英語版がある場合は同期する。
- current route / demo 名は `src/main.tsx` と `src/pages/Home.tsx` に合わせる。
- code snippet は current sample / example に揃える。
- 個人環境の絶対パスを書かない。
- skill frontmatter は `name` と `description` を必須にし、`name` は hyphen-case に保つ。

## Read As Needed

- 現在の docs / examples / samples / skills の更新地図: `references/doc-map.md`

