export type ShowcaseStatus = 'seed' | 'editor' | 'advanced'

export type ShowcaseTemplate = {
  id: string
  label: string
  description: string
}

export type ShowcaseMatrixEntry = {
  path: string
  title: string
  status: ShowcaseStatus
  summary: string
  implemented: string[]
  next: string[]
  templates?: ShowcaseTemplate[]
}

export const showcaseMatrix: ShowcaseMatrixEntry[] = [
  {
    path: '/samples/flow-editor',
    title: 'Flow Editor',
    status: 'editor',
    summary:
      'typed connector graph, node palette, scene persistence, and inspector-backed editing.',
    implemented: [
      'Node palette and template insertion',
      'Scene persistence and JSON export/import',
      'Inspector-based node and edge editing',
      'Typed edge validation with live connection preview',
    ],
    next: [
      'Port groups and typed schemas',
      'Minimap and subflow grouping',
      'Edge reroute handles and reconnection UI',
    ],
    templates: [
      { id: 'action', label: 'Action Node', description: 'Single input and output flow node.' },
      { id: 'branch', label: 'Branch Node', description: 'Two outgoing paths for flow branching.' },
      { id: 'terminal', label: 'Terminal', description: 'Sink node for completed flows.' },
    ],
  },
  {
    path: '/samples/block-editor',
    title: 'Block Editor',
    status: 'advanced',
    summary:
      'Scratch-like block editing with typed slots, C-block nesting, and documented support status.',
    implemented: [
      'Typed reporter and boolean slots',
      'C-block body layout and nested drag recovery',
      'Connector-based boolean slot acceptance',
      'Support matrix and editor-specific spec',
    ],
    next: [
      'Palette-driven block creation',
      'Variable, list, and custom block authoring UI',
      'Scene import/export and script comments',
    ],
    templates: [
      { id: 'motion', label: 'Motion', description: 'Movement and direction blocks.' },
      { id: 'control', label: 'Control', description: 'Loops, conditions, and waits.' },
      { id: 'operators', label: 'Operators', description: 'Reporter and boolean expressions.' },
    ],
  },
  {
    path: '/samples/hybrid-editor',
    title: 'Hybrid Editor',
    status: 'editor',
    summary: 'stack-based control flow combined with data edges in a single surface.',
    implemented: [
      'Mixed stack and edge interactions in one workspace',
      'Inspector-backed block and data node editing',
      'Scene reset and readiness notes',
      'Capability matrix for future stack/data modeling',
    ],
    next: [
      'Persistent stack serialization',
      'Typed data ports and validation warnings',
      'Palette-based mixed node creation',
    ],
    templates: [
      { id: 'block', label: 'Block Step', description: 'Stackable control block with data input.' },
      {
        id: 'data',
        label: 'Data Source',
        description: 'Reporter-style source feeding block inputs.',
      },
    ],
  },
  {
    path: '/samples/blueprint',
    title: 'Blueprint Editor',
    status: 'editor',
    summary: 'multi-pin graph with inline values, typed pin validation, and inspector editing.',
    implemented: [
      'Node palette and JSON persistence',
      'Pin-type connection validation',
      'Inline node values backed by scene state',
      'Inspector editing for node and edge labels',
    ],
    next: [
      'Reroute nodes and pin promotion',
      'Exec/data lane visualization',
      'Macro and function graph templates',
    ],
    templates: [
      { id: 'branch', label: 'Branch', description: 'Control flow split with boolean input.' },
      { id: 'print', label: 'Print String', description: 'Exec node with string input.' },
      { id: 'value', label: 'Value Source', description: 'Data-only output node.' },
    ],
  },
  {
    path: '/samples/state-machine',
    title: 'State Machine',
    status: 'editor',
    summary:
      'state graph with validation, editable transitions, and simple active-state simulation.',
    implemented: [
      'State palette and transition editing',
      'Validation for initial/final state constraints',
      'Active state simulation toggle',
      'Persisted scenes and labeled transitions',
    ],
    next: [
      'Transition guards and actions',
      'Reachability analysis and warnings',
      'Composite state groups',
    ],
    templates: [
      { id: 'state', label: 'State', description: 'Standard state node.' },
      { id: 'initial', label: 'Initial', description: 'Entry state marker.' },
      { id: 'final', label: 'Final', description: 'Terminal state marker.' },
    ],
  },
  {
    path: '/samples/workflow',
    title: 'Workflow Editor',
    status: 'editor',
    summary: 'AI-style workflow builder with step templates, status metadata, and validation.',
    implemented: [
      'Workflow step palette and persisted scene',
      'Inspector editing for status and retry metadata',
      'Branch-friendly step edges and labels',
      'Export/import and reset actions',
    ],
    next: [
      'Runtime execution traces',
      'Conditional branches and error lanes',
      'Sub-workflow and template library support',
    ],
    templates: [
      { id: 'io', label: 'HTTP Step', description: 'Input or output workflow boundary.' },
      { id: 'llm', label: 'LLM Step', description: 'Reasoning or generation step.' },
      { id: 'merge', label: 'Merge Step', description: 'Combine multiple branches.' },
    ],
  },
]

export function getShowcaseMatrixEntry(path: string): ShowcaseMatrixEntry | undefined {
  return showcaseMatrix.find((entry) => entry.path === path)
}
