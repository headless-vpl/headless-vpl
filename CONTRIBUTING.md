# Headless VPL へのコントリビューション

Headless VPL への貢献に興味を持っていただきありがとうございます！

## 開発環境セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/headless-vpl/headless-vpl.git
cd headless-vpl

# 依存パッケージのインストール
npm install

# Git hooks のインストール
npx lefthook install

# 開発サーバーの起動
npm run dev
```

## 主要コマンド

| コマンド                | 説明                     |
| ----------------------- | ------------------------ |
| `npm run dev`           | 開発サーバー起動         |
| `npm run build:lib`     | ライブラリビルド         |
| `npm run test`          | テスト実行               |
| `npm run test:watch`    | テスト（ウォッチモード） |
| `npm run test:coverage` | カバレッジ付きテスト     |
| `npm run lint`          | Biome によるリント       |
| `npm run lint:fix`      | リント + 自動修正        |
| `npm run format`        | コードフォーマット       |
| `npm run typecheck`     | 型チェック               |

## ブランチ戦略

| プレフィックス | 用途             |
| -------------- | ---------------- |
| `feat/*`       | 新機能           |
| `fix/*`        | バグ修正         |
| `docs/*`       | ドキュメント     |
| `refactor/*`   | リファクタリング |
| `test/*`       | テスト追加・修正 |

```bash
git checkout -b feat/add-auto-connect
```

## Pull Request のルール

### 必須チェック

PR を出す前に以下が通ることを確認してください:

```bash
npm run lint
npm run typecheck
npm run test
npm run build:lib
```

### 設計判断チェックリスト

コードを書く前に以下を確認してください:

- [ ] **Headless か？** — UI やフレームワーク固有のコードがライブラリ本体に混入していないか
- [ ] **疎結合か？** — 変更が他のモジュールに波及しないか
- [ ] **Simple か？** — Easy に逃げてブラックボックスを作っていないか
- [ ] **4 つの型に沿っているか？** — 描画・接続・移動・入力のどれに該当する変更か
- [ ] **単方向データフローを維持しているか？** — イベント → I/O → Controller → Renderer の流れを壊していないか
- [ ] **型安全か？** — TypeScript の型システムを活用しているか
- [ ] **フレームワーク非依存か？** — バニラ TS で完結しているか

### changesets

機能追加やバグ修正を含む PR には changeset を追加してください:

```bash
npx changeset
```

種類の選び方:

- **patch**: バグ修正、内部リファクタリング
- **minor**: 新機能、後方互換性のある API 追加
- **major**: 破壊的変更

## テスト

テストファイルは対象ファイルと同ディレクトリに `*.test.ts` として配置します:

```
src/lib/headless-vpl/core/
├── EventBus.ts
├── EventBus.test.ts      ← テストファイル
├── Position.ts
└── Position.test.ts
```

```bash
# 特定ファイルのテスト実行
npx vitest run src/lib/headless-vpl/core/EventBus.test.ts
```

## コーディング規約

- Biome による自動フォーマット・リントに従う
- `any` の使用禁止（ライブラリ本体）
- 変数名・関数名は英語、コメントは日本語
- 早期リターンを活用してネストを浅く保つ

## ライセンス

コントリビューションは MIT ライセンスの下で提供されます。
