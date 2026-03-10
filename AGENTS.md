# Headless VPL Agent Notes

## Hit Testing Policy

- AutoLayout の通常ネストは領域判定（`isInsideLayout`, `computeInsertIndex`）を優先する。
- 接続（Snap）や特例ネストは `Connector` ベースで実装する。
- 特例ネストの例:
  - 入口が1点に固定されたケース
  - C-block body のような専用挿入ポイント
- Connector ベースで優先する API:
  - `isConnectorHit(mousePos, connector, hitRadius?)`
  - `SnapConnection`（距離 + validator）
  - `NestingZone.connectorHit`
- `isCollision` や矩形内判定（AABB）は、選択判定や通常ネストの領域判定として使う。
