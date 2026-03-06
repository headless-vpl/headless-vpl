export type PaletteItemDef = {
  id: string
  label: string
  description: string
  type: 'container' | 'connector' | 'autolayout' | 'edge' | 'template'
  color?: string
  variant?: string
  width?: number
  height?: number
  connectorType?: 'input' | 'output'
  edgeType?: 'straight' | 'bezier' | 'step' | 'smoothstep'
}

type PaletteCategory = {
  name: string
  items: PaletteItemDef[]
}

export const paletteItems: PaletteCategory[] = [
  {
    name: 'Containers',
    items: [
      {
        id: 'container-basic',
        label: 'Basic Node',
        description: '基本コンテナ (140x55)',
        type: 'container',
        color: '#3b82f6',
        variant: 'default',
        width: 140,
        height: 55,
      },
      {
        id: 'container-large',
        label: 'Large Node',
        description: '大きめコンテナ (200x80)',
        type: 'container',
        color: '#10b981',
        variant: 'large',
        width: 200,
        height: 80,
      },
      {
        id: 'container-small',
        label: 'Small Node',
        description: '小さめコンテナ (100x40)',
        type: 'container',
        color: '#f59e0b',
        variant: 'small',
        width: 100,
        height: 40,
      },
      {
        id: 'container-purple',
        label: 'Purple Node',
        description: '紫コンテナ',
        type: 'container',
        color: '#7c3aed',
        variant: 'default',
        width: 140,
        height: 55,
      },
    ],
  },
  {
    name: 'Connectors',
    items: [
      {
        id: 'connector-input',
        label: 'Input',
        description: '入力コネクター',
        type: 'connector',
        color: '#06b6d4',
        connectorType: 'input',
      },
      {
        id: 'connector-output',
        label: 'Output',
        description: '出力コネクター',
        type: 'connector',
        color: '#f43f5e',
        connectorType: 'output',
      },
    ],
  },
  {
    name: 'Edges',
    items: [
      {
        id: 'edge-straight',
        label: 'Straight',
        description: '直線の接続線',
        type: 'edge',
        color: '#94a3b8',
        edgeType: 'straight',
      },
      {
        id: 'edge-bezier',
        label: 'Bezier',
        description: 'ベジェ曲線の接続線',
        type: 'edge',
        color: '#94a3b8',
        edgeType: 'bezier',
      },
      {
        id: 'edge-step',
        label: 'Step',
        description: 'ステップの接続線',
        type: 'edge',
        color: '#94a3b8',
        edgeType: 'step',
      },
      {
        id: 'edge-smoothstep',
        label: 'SmoothStep',
        description: '滑らかなステップの接続線',
        type: 'edge',
        color: '#94a3b8',
        edgeType: 'smoothstep',
      },
    ],
  },
  {
    name: 'Layouts',
    items: [
      {
        id: 'layout-horizontal',
        label: 'Horizontal',
        description: '水平レイアウトコンテナ',
        type: 'autolayout',
        color: '#6366f1',
        variant: 'horizontal',
      },
      {
        id: 'layout-vertical',
        label: 'Vertical',
        description: '垂直レイアウトコンテナ',
        type: 'autolayout',
        color: '#6366f1',
        variant: 'vertical',
      },
    ],
  },
  {
    name: 'Templates',
    items: [
      {
        id: 'template-flow-node',
        label: 'Flow Node',
        description: 'In/Out付きフローノード',
        type: 'template',
        color: '#3b82f6',
        variant: 'flow-node',
      },
      {
        id: 'template-scratch-block',
        label: 'Scratch Block',
        description: 'Scratch風ブロック',
        type: 'template',
        color: '#7c3aed',
        variant: 'scratch-block',
      },
      {
        id: 'template-blueprint',
        label: 'Blueprint Node',
        description: 'Blueprint風ノード',
        type: 'template',
        color: '#06b6d4',
        variant: 'blueprint-node',
      },
    ],
  },
]
