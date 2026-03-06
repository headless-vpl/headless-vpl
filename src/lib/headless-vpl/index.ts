import AutoLayout from './core/AutoLayout'
// Core
import Connector from './core/Connector'
import Container from './core/Container'
import Edge from './core/Edge'
import { EventBus } from './core/EventBus'
import { History } from './core/History'
import Position from './core/Position'
import { SelectionManager } from './core/SelectionManager'
import Workspace from './core/Workspace'
import {
  AddCommand,
  BatchCommand,
  ConnectCommand,
  DetachCommand,
  MoveCommand,
  NestCommand,
  RemoveCommand,
  ReparentChildCommand,
} from './core/commands'

// Rendering
import { SvgRenderer } from './rendering/SvgRenderer'

import { connectStackPairs } from './blocks/connect'
import { observeContainerContentSizes } from './blocks/dom'
import { BlockStackController, collectConnectedChain } from './blocks/stack'
import { computeAutoPan } from './util/autoPan'
import { calculatePastePositions, copyElements, pasteElements } from './util/clipboard'
import { observeContentSize } from './util/contentSize'
// Utilities
import { getAngle, getDistance } from './util/distance'
import { DomSyncHelper } from './util/domSync'
import {
  EdgeBuilder,
  findEdgeAtPoint,
  findNearestConnector,
  isConnectorHit,
} from './util/edgeBuilder'
import { getBezierPath, getSmoothStepPath, getStepPath, getStraightPath } from './util/edgePath'
import { InteractionManager } from './util/interaction'
import { KeyboardManager } from './util/keyboard'
import { createMarqueeRect, getElementsInMarquee, getElementsInScreenMarquee } from './util/marquee'
import {
  NestingZone,
  createSlotZone,
  isInsideContainer,
  nestContainer,
  unnestContainer,
} from './util/nesting'
import { applyResize, beginResize, detectResizeHandle } from './util/resize'
import { bindDefaultShortcuts } from './util/shortcuts'
import { snapDeltaToGrid, snapToGrid } from './util/snapToGrid'
import { screenToWorld, worldToScreen } from './util/viewport'
import { bindWheelZoom } from './util/wheelZoom'

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
  DetachCommand,
  NestCommand,
  BatchCommand,
  ReparentChildCommand,
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
  createSlotZone,
  nestContainer,
  unnestContainer,
  isInsideContainer,
  BlockStackController,
  collectConnectedChain,
  connectStackPairs,
  observeContainerContentSizes,
  observeContentSize,
  bindWheelZoom,
  bindDefaultShortcuts,
  DomSyncHelper,
  InteractionManager,
}

// Type exports
export type {
  IWorkspaceElement,
  IEdge,
  VplEvent,
  VplEventType,
  Viewport,
  SizingMode,
  Padding,
} from './core/types'
export type { EdgeType, MarkerType, EdgeMarker, ResizeHandleDirection } from './core/types'
export type { IPosition } from './core/Position'
export type {
  ConnectorAnchor,
  ConnectorAnchorOrigin,
  ConnectorAnchorTarget,
} from './core/Connector'
export type { Command } from './core/History'
export type { EdgePathResult } from './util/edgePath'
export type { MarqueeRect, MarqueeMode, MarqueeElement } from './util/marquee'
export type { ClipboardData } from './util/clipboard'
export type { KeyBinding } from './util/keyboard'
export type { CanvasBounds, AutoPanResult } from './util/autoPan'
export type { ResizableElement, ResizeState } from './util/resize'
export type { EdgeBuilderConfig } from './util/edgeBuilder'
export type {
  ConnectorHitDetector,
  NestingValidator,
  NestingZoneConfig,
  SlotZoneConfig,
} from './util/nesting'
export type { WheelZoomConfig } from './util/wheelZoom'
export type { DefaultShortcutsConfig } from './util/shortcuts'
export type { DomSyncConfig } from './util/domSync'
export type { InteractionMode, InteractionConfig } from './util/interaction'
export type { ConnectStackPairsConfig, StackConnectable } from './blocks/connect'
export type { ObserveContainerContentSizesConfig } from './blocks/dom'
export { SnapConnection, childOnly, createSnapConnections, either, parentOnly } from './util/snap'
export type {
  ConnectionValidator,
  CreateSnapConnectionsConfig,
  SnapConnectionConfig,
  SnapStrategy,
} from './util/snap'
