export type ExampleCategory = 'samples' | 'demos' | 'tools'
export type DemoSubCategory = 'basic' | 'connection' | 'layout' | 'navigation' | 'history'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type ExampleItem = {
  title: string
  description: string
  path: string
  category: ExampleCategory
  tags?: string[]
  color?: string
  previewImage?: string
  longDescription?: string
  codeSnippet?: string
  badge?: string
  difficulty?: Difficulty
  subCategory?: DemoSubCategory
}

export const showcaseItems: ExampleItem[] = [
  {
    title: 'Flow Editor',
    description: 'typed graph editor。palette、inspector、JSON保存、drag edge 作成に対応。',
    path: '/samples/flow-editor',
    category: 'samples',
    tags: ['Flow', 'Inspector', 'Persistence'],
    color: '#3b82f6',
    difficulty: 'intermediate',
    badge: 'Expanded',
    longDescription:
      'Flow Editor showcase は、フローノードを palette から追加し、typed connector で接続し、inspector と JSON export/import で編集状態を保てるサンプルです。固定 scene ではなく scene state を source of truth にしているため、sample をそのまま実装ベースとして使えます。',
    codeSnippet: `const ws = new Workspace()
const nodeA = new Container({
  workspace: ws,
  position: new Position(100, 100),
  name: 'Process',
  width: 160, height: 60,
})
const out = new Connector({ container: nodeA, type: 'output' })
const inp = new Connector({ container: nodeB, type: 'input' })
new Edge({ workspace: ws, source: out, target: inp })`,
  },
  {
    title: 'Block Editor',
    description:
      'Scratch-like block editor。typed slot、C-block、support matrix、snapshot export 付き。',
    path: '/samples/block-editor',
    category: 'samples',
    tags: ['Block', 'Scratch', 'Spec'],
    color: '#7c3aed',
    difficulty: 'intermediate',
    badge: 'Advanced',
    longDescription:
      'Block Editor showcase は、Scratch 風の block layout / typed slot / C-block body nesting を扱う最も高度な sample です。runtime 実行ではなく editor completeness に焦点を当て、support matrix と spec document を持っています。',
    codeSnippet: `const controller = new BlockEditorController()
const { workspaceRef, containersRef } = useRecipeWorkspace(svgRef, overlayRef, canvasRef, {
  interactionOverrides: controller.interactionOverrides,
})

useEffect(() => {
  if (!workspaceRef.current) return
  return controller.mount(workspaceRef.current, containersRef.current)
}, [controller, workspaceRef, containersRef])`,
  },
  {
    title: 'Hybrid Editor',
    description:
      'stack と data edge を同居させた hybrid sample。palette、inspector、scene 保存に対応。',
    path: '/samples/hybrid-editor',
    category: 'samples',
    tags: ['Hybrid', 'Stack', 'Dataflow'],
    color: '#ec4899',
    difficulty: 'advanced',
    badge: 'Expanded',
    longDescription:
      'Hybrid Editor showcase は、上下 snap の block chain と data edge を同じ workspace に共存させる sample です。Headless VPL の混成 interaction を確認しつつ、node metadata の編集や scene export を試せます。',
    codeSnippet: `const snapConnections: SnapConnection[] = []
const interaction = new InteractionManager({
  workspace,
  canvasElement,
  containers: () => containers,
  connectors: () => connectors,
  snapConnections,
  edgeBuilder,
})`,
  },
  {
    title: 'Blueprint Editor',
    description:
      'Blueprint-style multi-pin editor。typed pin validation と inline value state を搭載。',
    path: '/samples/blueprint',
    category: 'samples',
    tags: ['Blueprint', 'Pins', 'Validation'],
    color: '#06b6d4',
    difficulty: 'intermediate',
    badge: 'Expanded',
    longDescription:
      'Blueprint Editor showcase は、exec と data pin を typed validation 付きで扱う multi-pin graph sample です。inline widget 風の値は scene state と連動し、inspector や export/import でも保持されます。',
    codeSnippet: `const pins = [
  blueprintPin('exec-in', 'Exec', 'input', 0, 'exec'),
  blueprintPin('condition', 'Condition', 'input', 1, 'boolean'),
  blueprintPin('true', 'True', 'output', 0, 'exec'),
]

new Edge({ start, end, edgeType: 'smoothstep' })`,
  },
  {
    title: 'State Machine',
    description:
      'state graph sample。transition 編集、active state simulation、validation stats を表示。',
    path: '/samples/state-machine',
    category: 'samples',
    tags: ['State', 'Simulation', 'Validation'],
    color: '#22d3ee',
    difficulty: 'intermediate',
    badge: 'Expanded',
    longDescription:
      'State Machine showcase は、state / transition 編集に加えて initial / final の簡易検証と active state simulation を備えた sample です。遷移ラベル編集や scene persistence にも対応しています。',
    codeSnippet: `const interaction = new InteractionManager({
  workspace,
  canvasElement,
  containers: () => containers,
  connectors: () => connectors,
  edgeBuilder,
})

const activeState = scene.nodes.find((node) => node.data?.active)`,
  },
  {
    title: 'Workflow Editor',
    description: 'AI workflow builder。step palette、status metadata、JSON export/import に対応。',
    path: '/samples/workflow',
    category: 'samples',
    tags: ['Workflow', 'Status', 'AI'],
    color: '#a78bfa',
    difficulty: 'intermediate',
    badge: 'Expanded',
    longDescription:
      'Workflow Editor showcase は、AI workflow 的な step graph を編集できる sample です。step status や retry metadata を inspector から変更でき、routes を JSON として保存復元できます。',
    codeSnippet: `const node = createWorkflowNode('llm', 'LLM Step', '🧠', '#8b5cf6', 320, 60)
const edge = {
  fromNodeId: input.id,
  fromPinId: 'out',
  toNodeId: node.id,
  toPinId: 'in',
  edgeType: 'step',
}`,
  },
]

export const demoItems: ExampleItem[] = [
  {
    title: 'Drag & Drop',
    description: 'コンテナのドラッグ移動',
    path: '/demos/drag-and-drop',
    category: 'demos',
    color: '#f97316',
    subCategory: 'basic',
    difficulty: 'beginner',
    longDescription:
      '最も基本的なインタラクション例です。site では recipe 層の `useRecipeWorkspace` / `InteractionManager` を使っていますが、コアは primitives だけでも構築できます。',
    codeSnippet: `const workspace = new Workspace()
const node = new Container({
  workspace,
  position: new Position(100, 100),
  name: 'Drag me',
  width: 120, height: 60,
})
const interaction = new InteractionManager({
  workspace,
  canvasElement,
  containers: () => [node],
})`,
  },
  {
    title: 'Edge Types',
    description: '4種エッジの比較',
    path: '/demos/edge-types',
    category: 'demos',
    color: '#3b82f6',
    subCategory: 'connection',
    difficulty: 'beginner',
  },
  {
    title: 'Edge Builder',
    description: 'ドラッグでエッジ作成',
    path: '/demos/edge-builder',
    category: 'demos',
    color: '#6366f1',
    subCategory: 'connection',
    difficulty: 'intermediate',
  },
  {
    title: 'Snap Connection',
    description: 'スナップ接続パターン',
    path: '/demos/snap-connection',
    category: 'demos',
    color: '#8b5cf6',
    subCategory: 'connection',
    difficulty: 'intermediate',
  },
  {
    title: 'Auto Layout',
    description: '水平/垂直レイアウト',
    path: '/demos/auto-layout',
    category: 'demos',
    color: '#14b8a6',
    subCategory: 'layout',
    difficulty: 'intermediate',
  },
  {
    title: 'Nesting',
    description: 'ネスティング/スロット',
    path: '/demos/nesting',
    category: 'demos',
    color: '#f59e0b',
    subCategory: 'layout',
    difficulty: 'intermediate',
  },
  {
    title: 'Selection',
    description: '選択・マーキー矩形選択',
    path: '/demos/selection',
    category: 'demos',
    color: '#ec4899',
    subCategory: 'basic',
    difficulty: 'beginner',
  },
  {
    title: 'Zoom & Pan',
    description: 'ズーム・パン操作',
    path: '/demos/zoom-pan',
    category: 'demos',
    color: '#06b6d4',
    subCategory: 'navigation',
    difficulty: 'beginner',
  },
  {
    title: 'Resize',
    description: 'ノードリサイズ',
    path: '/demos/resize',
    category: 'demos',
    color: '#22c55e',
    subCategory: 'layout',
    difficulty: 'beginner',
  },
  {
    title: 'Undo / Redo',
    description: 'コマンド履歴',
    path: '/demos/undo-redo',
    category: 'demos',
    color: '#ef4444',
    subCategory: 'history',
    difficulty: 'intermediate',
  },
  {
    title: 'Copy / Paste',
    description: 'クリップボード操作',
    path: '/demos/copy-paste',
    category: 'demos',
    color: '#a855f7',
    subCategory: 'history',
    difficulty: 'intermediate',
  },
]

export const toolItems: ExampleItem[] = [
  {
    title: 'Factory',
    description: 'VPLを対話的に構築できるBlockly Block Factory風エディタ',
    path: '/tools/factory',
    category: 'tools',
    color: '#f59e0b',
    difficulty: 'intermediate',
  },
]

export const allExamples: ExampleItem[] = [...showcaseItems, ...demoItems, ...toolItems]

export function getExampleByPath(path: string): ExampleItem | undefined {
  return allExamples.find((item) => item.path === path)
}
