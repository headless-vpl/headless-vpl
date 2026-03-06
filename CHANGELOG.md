# Changelog

## 0.3.0

### Minor Changes

- ブロックエディタ向けの基盤を追加し、Connector ベースの snap / nesting 改善、コード生成、テスト、ドキュメントを拡充しました。

このファイルでは、Headless VPL の主な変更点を初心者にもわかりやすい言葉でまとめています。
「何が増えたか」だけでなく、「それで何ができるようになったか」も意識して記載しています。

## 0.3.0 (Upcoming)

### 🌟 このリリースの要点

今回のリリースは、**フロー型エディタだけでなく、ブロック型エディタも作りやすくするための大規模アップデート**です。
あわせて、接続判定・ネスト判定・サンプル・ドキュメント・テストも広く強化されました。

特に次のような人に恩恵があります。

- 「Scratch のようなブロック型 UI を作りたい」
- 「フロー型とブロック型を混ぜた独自エディタを作りたい」
- 「ライブラリ本体の挙動を理解しながら、安全に拡張したい」

### ✨ 新機能

- **ブロックエディタ向けの基盤を追加**
  - `src/lib/headless-vpl/blocks/` 以下に、ブロック接続・スタック・専用ゾーン管理の仕組みを追加しました。
  - これにより、通常のノードエディタだけでなく、**積み重なるブロック UI** を構築しやすくなりました。
- **Connector ベースの snap / nesting を強化**
  - 通常の矩形ベース判定だけでなく、**Connector を入口にした接続やネスト** を扱いやすくしました。
  - 固定された挿入ポイントや、ブロック body のような専用挿入ポイントを表現しやすくなります。
- **コード生成ユーティリティを追加**
  - `codeGenerator` を追加し、エディタ上の構造からコードや構造化データへつなげる基盤を整えました。
  - 「見た目を作るだけ」で終わらず、**VPL から実行可能な表現へ変換する流れ** を組みやすくなります。
- **Factory / Playground UI を大幅拡充**
  - パレット、階層ビュー、プロパティインスペクタ、コードパネル、ツールバー、ステータスバーなどを追加しました。
  - ライブラリを試すためのデモではなく、**実際に構成を触りながら理解できる開発用 UI** に近づいています。
- **サンプルとデモを多数追加**
  - Flow Editor
  - Block Editor
  - Hybrid Editor
  - Blueprint Editor
  - Workflow Editor
  - State Machine
  - Undo/Redo、Zoom/Pan、Resize、Selection、SnapConnection などの個別デモ
  - これにより、初めて触る人でも「どこから始めればよいか」がかなりわかりやすくなりました。

### 🧠 コア機能の改善

- `**Connector` を中心に接続モデルを見直し\*\*
  - 接続先・接続元の表現がより明確になり、ブロック型 / フロー型の両方で扱いやすくなりました。
- `**AutoLayout` とネスト処理を改善\*\*
  - 通常のレイアウト内判定に加え、特例的な挿入ポイントを扱う余地を広げました。
  - 複雑なネスト UI でも、判定ロジックを分けて設計しやすくなります。
- `**Workspace` / `Container` / `commands` / `SvgRenderer` を拡張\*\*
  - 操作、描画、状態変更の流れを整理し、複数の編集体験を支える基盤を強化しました。
- **Interaction 周辺を継続強化**
  - DnD、Snap、Resize、Keyboard、Clipboard、Viewport、Edge Path などの周辺ユーティリティを改善しました。
  - 「触っていて気持ちよい」エディタに必要な基礎機能が全体的に厚くなっています。

### 🧪 品質向上

- **テストを大幅追加**
  - `Connector`
  - `Workspace`
  - `EventBus`
  - `History`
  - `Position`
  - `snap`
  - `nesting`
  - `edgePath`
  - `distance`
  - `viewport`
  - `blockStack`
  - `snapToGrid`
  - `blocks/connect`
  - `blocks/zones`
  - これにより、コアロジックの変更に対して安心して改修しやすくなりました。
- **開発ツールを整理**
  - `Biome` を導入し、Lint / Format の運用を一本化しました。
  - `Vitest` 設定も追加され、ローカル検証の流れが明確になりました。
- **リリース運用ファイルを追加**
  - Changesets
  - GitHub Actions
  - Issue / PR templates
  - `lefthook`
  - OSS として継続的に育てやすい基盤が整ってきています。

### 📚 ドキュメント

- **VitePress ベースのドキュメントサイトを追加**
  - Getting Started
  - Core Concepts
  - Headless Architecture
  - API リファレンス
  - Recipes
- **初心者向けの導線を改善**
  - 「まず何を理解すればよいか」
  - 「どの API が中心か」
  - 「どんな種類のエディタが作れるか」
  - こうした入口が以前よりかなり明確になりました。

### 📝 補足

- このリリースは機能追加が中心のため、**minor リリース**として扱っています。
- 大規模変更ではありますが、意図としては「壊すこと」よりも **表現力を広げること** に重点を置いています。

## 0.2.0

### ✨ 新機能

- **統合インタラクション管理を追加**
  - `InteractionManager` により、DnD、パン、マーキー選択、リサイズ、Edge 作成をまとめて扱えるようになりました。
  - ユーザーから見ると、「エディタらしい操作感」が一気に整ったリリースです。
- **Edge 作成機能を追加**
  - `EdgeBuilder` により、ドラッグしながら接続線を作れるようになりました。
- **AutoLayout へのネスト管理を追加**
  - `NestingZone` により、要素を別の要素の中へ入れる体験を実装しやすくなりました。
- **DOM 同期まわりを追加**
  - `DomSyncHelper` により、Container の仮想座標と DOM の見た目を合わせやすくなりました。
  - `observeContentSize` により、DOM サイズから Container サイズを自動同期できるようになりました。
- **エディタ操作ユーティリティを追加**
  - `bindWheelZoom`
  - `bindDefaultShortcuts`
  - `KeyboardManager`
  - `computeAutoPan`
  - `detectResizeHandle` / `beginResize` / `applyResize`
  - `createMarqueeRect` / `getElementsInMarquee`
  - `snapToGrid` / `snapDeltaToGrid`
  - `copyElements` / `pasteElements`
  - `screenToWorld` / `worldToScreen`
- **スナップ接続モデルを追加**
  - `SnapConnection`
  - `ConnectionValidator`
  - `SnapStrategy`
  - 「近づけると吸い付く」挙動を、より柔軟に設計できるようになりました。

### 🏗️ アーキテクチャ改善

- **コアクラスの DOM 依存を排除**
  - ライブラリ本体をより Headless に近づけました。
- **疎結合なイベントシステムを追加**
  - `EventBus` により、モジュール間を直接結びつけずに通知できるようになりました。
- **レンダリング層を分離**
  - `SvgRenderer` を外部レンダリング層として整理し、責務を分けました。
- **Undo / Redo 基盤を追加**
  - `History` + `Command` パターンにより、編集履歴を扱えるようになりました。
- **選択状態の管理を追加**
  - `SelectionManager` により、複数選択や選択状態の追跡を整理しました。
- **複数の Edge パス形状に対応**
  - straight
  - bezier
  - step
  - smoothstep

## 0.1.0

### 🚀 初期リリース

Headless VPL の最初の公開版です。
フロー型エディタや独自 UI を作るための、最小限かつ拡張しやすい土台が入りました。

- `Workspace`
  - ルートコンテナ。キャンバス全体の起点になります。
- `Container`
  - 主要な構成要素。ノード、ブロック、グループなどのベースとして使えます。
- `Connector`
  - 入出力の接続ポイントです。
- `Edge`
  - Connector 同士を結ぶ接続線です。
- `AutoLayout`
  - CSS Flexbox ライクな自動レイアウトです。
- `Position`
  - 2D 座標を扱うための基本クラスです。
- `DragAndDrop`
  - 要素をドラッグして移動するための基礎機能です。
- `SvgRenderer`
  - デバッグ用の SVG ワイヤーフレームレンダラーです。
