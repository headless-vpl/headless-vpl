// Core
import Connector from './core/Connector'
import Workspace from './core/Workspace'
import Position from './core/Position'
import Edge from './core/Edge'
import Container from './core/Container'
import AutoLayout from './core/AutoLayout'
import { EventBus } from './core/EventBus'
import { SelectionManager } from './core/SelectionManager'
import { History } from './core/History'
import { MoveCommand, AddCommand, RemoveCommand, ConnectCommand, NestCommand, BatchCommand } from './core/commands'

// Rendering
import { SvgRenderer } from './rendering/SvgRenderer'

// Utilities
import { getDistance, getAngle } from './util/distance'
import { screenToWorld, worldToScreen } from './util/viewport'
import { getStraightPath, getBezierPath, getStepPath, getSmoothStepPath } from './util/edgePath'
import { createMarqueeRect, getElementsInMarquee, getElementsInScreenMarquee } from './util/marquee'
import { snapToGrid, snapDeltaToGrid } from './util/snapToGrid'
import { copyElements, calculatePastePositions, pasteElements } from './util/clipboard'
import { KeyboardManager } from './util/keyboard'
import { computeAutoPan } from './util/autoPan'
import { detectResizeHandle, beginResize, applyResize } from './util/resize'
import { EdgeBuilder, isConnectorHit, findNearestConnector, findEdgeAtPoint } from './util/edgeBuilder'
import { NestingZone, nestContainer, unnestContainer, isInsideContainer } from './util/nesting'
import { observeContentSize } from './util/contentSize'
import { bindWheelZoom } from './util/wheelZoom'
import { bindDefaultShortcuts } from './util/shortcuts'
import { DomSyncHelper } from './util/domSync'
import { InteractionManager } from './util/interaction'

export {
  // Core
  Connector,
  Workspace,
  Position,
  Edge,
  Container,
  AutoLayout,
  EventBus,
  SelectionManager,
  History,
  MoveCommand,
  AddCommand,
  RemoveCommand,
  ConnectCommand,
  NestCommand,
  BatchCommand,

  // Rendering
  SvgRenderer,

  // Utilities
  getDistance,
  getAngle,
  screenToWorld,
  worldToScreen,
  getStraightPath,
  getBezierPath,
  getStepPath,
  getSmoothStepPath,
  createMarqueeRect,
  getElementsInMarquee,
  getElementsInScreenMarquee,
  snapToGrid,
  snapDeltaToGrid,
  copyElements,
  calculatePastePositions,
  pasteElements,
  KeyboardManager,
  computeAutoPan,
  detectResizeHandle,
  beginResize,
  applyResize,
  EdgeBuilder,
  isConnectorHit,
  findNearestConnector,
  findEdgeAtPoint,
  NestingZone,
  nestContainer,
  unnestContainer,
  isInsideContainer,
  observeContentSize,
  bindWheelZoom,
  bindDefaultShortcuts,
  DomSyncHelper,
  InteractionManager,
}

// Type exports
export type { IWorkspaceElement, IEdge, VplEvent, VplEventType, Viewport, SizingMode, Padding } from './core/types'
export type { EdgeType, MarkerType, EdgeMarker, ResizeHandleDirection } from './core/types'
export type { IPosition } from './core/Position'
export type { Command } from './core/History'
export type { EdgePathResult } from './util/edgePath'
export type { MarqueeRect, MarqueeMode, MarqueeElement } from './util/marquee'
export type { ClipboardData } from './util/clipboard'
export type { KeyBinding } from './util/keyboard'
export type { CanvasBounds, AutoPanResult } from './util/autoPan'
export type { ResizableElement, ResizeState } from './util/resize'
export type { EdgeBuilderConfig } from './util/edgeBuilder'
export type { NestingValidator, NestingZoneConfig } from './util/nesting'
export type { WheelZoomConfig } from './util/wheelZoom'
export type { DefaultShortcutsConfig } from './util/shortcuts'
export type { DomSyncConfig } from './util/domSync'
export type { InteractionMode, InteractionConfig } from './util/interaction'
export { SnapConnection, childOnly, parentOnly, either } from './util/snap'
export type { ConnectionValidator, SnapStrategy, SnapConnectionConfig } from './util/snap'
