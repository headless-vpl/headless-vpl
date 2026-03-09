export type NavItem = {
  label: string
  path: string
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

export const sidebarNavGroups: NavGroup[] = [
  {
    title: 'Samples',
    items: [
      { label: 'Flow Editor', path: '/samples/flow-editor' },
      { label: 'Block Editor', path: '/samples/block-editor' },
      { label: 'Hybrid Editor', path: '/samples/hybrid-editor' },
      { label: 'Blueprint', path: '/samples/blueprint' },
      { label: 'State Machine', path: '/samples/state-machine' },
      { label: 'Workflow', path: '/samples/workflow' },
    ],
  },
  {
    title: 'Demos',
    items: [
      { label: 'Drag & Drop', path: '/demos/drag-and-drop' },
      { label: 'Edge Types', path: '/demos/edge-types' },
      { label: 'Edge Builder', path: '/demos/edge-builder' },
      { label: 'Snap Connection', path: '/demos/snap-connection' },
      { label: 'Auto Layout', path: '/demos/auto-layout' },
      { label: 'Nesting', path: '/demos/nesting' },
      { label: 'Selection', path: '/demos/selection' },
      { label: 'Zoom & Pan', path: '/demos/zoom-pan' },
      { label: 'Resize', path: '/demos/resize' },
      { label: 'Undo / Redo', path: '/demos/undo-redo' },
      { label: 'Copy / Paste', path: '/demos/copy-paste' },
    ],
  },
  {
    title: 'Tools',
    items: [{ label: 'Factory', path: '/tools/factory' }],
  },
]
