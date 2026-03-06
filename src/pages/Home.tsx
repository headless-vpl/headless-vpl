import { Link } from 'react-router-dom'

const showcaseItems = [
  {
    title: 'Flow Editor',
    description: 'ReactFlow風のノードエディター。ベジェエッジ、ドラッグ接続、ズーム/パン対応。',
    path: '/samples/flow-editor',
    tags: ['Flow', 'Edges', 'Zoom'],
    color: '#3b82f6',
  },
  {
    title: 'Block Editor',
    description: 'Scratch風のブロックエディター。縦積みスナップ、スロット埋め込み対応。',
    path: '/samples/block-editor',
    tags: ['Block', 'Snap', 'Nesting'],
    color: '#7c3aed',
  },
  {
    title: 'Hybrid Editor',
    description: 'ブロック+フロー混合型。制御フローはスナップ、データフローはエッジで接続。',
    path: '/samples/hybrid-editor',
    tags: ['Hybrid', 'Block', 'Flow'],
    color: '#ec4899',
  },
  {
    title: 'Blueprint Editor',
    description: 'Unreal Blueprint風。複数ピン、smoothstepエッジ、色分けコネクター。',
    path: '/samples/blueprint',
    tags: ['Blueprint', 'Multi-pin', 'Dark'],
    color: '#06b6d4',
  },
  {
    title: 'State Machine',
    description: '円形ステートノード、矢印付きトランジション、色分け状態管理。',
    path: '/samples/state-machine',
    tags: ['State', 'Arrows', 'Circular'],
    color: '#22d3ee',
  },
  {
    title: 'Workflow Editor',
    description: 'Dify/Make風のAIワークフロー。横方向フロー、アイコン付きノード。',
    path: '/samples/workflow',
    tags: ['Workflow', 'AI', 'Pipeline'],
    color: '#a78bfa',
  },
]

const demoItems = [
  { title: 'Drag & Drop', description: 'コンテナのドラッグ移動', path: '/demos/drag-and-drop' },
  { title: 'Edge Types', description: '4種エッジの比較', path: '/demos/edge-types' },
  { title: 'Edge Builder', description: 'ドラッグでエッジ作成', path: '/demos/edge-builder' },
  { title: 'Snap Connection', description: 'スナップ接続パターン', path: '/demos/snap-connection' },
  { title: 'Auto Layout', description: '水平/垂直レイアウト', path: '/demos/auto-layout' },
  { title: 'Nesting', description: 'ネスティング/スロット', path: '/demos/nesting' },
  { title: 'Selection', description: '選択・マーキー矩形選択', path: '/demos/selection' },
  { title: 'Zoom & Pan', description: 'ズーム・パン操作', path: '/demos/zoom-pan' },
  { title: 'Resize', description: 'ノードリサイズ', path: '/demos/resize' },
  { title: 'Undo / Redo', description: 'コマンド履歴', path: '/demos/undo-redo' },
  { title: 'Copy / Paste', description: 'クリップボード操作', path: '/demos/copy-paste' },
]

const toolItems = [
  { title: 'Factory', description: 'VPLを対話的に構築できるBlockly Block Factory風エディタ', path: '/tools/factory', color: '#f59e0b' },
]

const features = ['0 Dependencies', 'Pure TypeScript', 'Framework Agnostic', '~8KB gzipped']

export default function Home() {
  return (
    <div className='min-h-screen'>
      {/* Hero */}
      <section className='mx-auto max-w-7xl px-6 pt-24 pb-20 text-center'>
        <h1 className='text-5xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl'>
          Build any Visual
          <br />
          <span className='bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent'>
            Programming Language
          </span>
        </h1>
        <p className='mx-auto mt-6 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400'>
          Block-based, flow-based, or something entirely new — in pure TypeScript.
          <br />
          Headless architecture. Zero dependencies. Full control.
        </p>
        <div className='mt-8 flex items-center justify-center gap-4'>
          <Link
            to='/demos/drag-and-drop'
            className='rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 no-underline'
          >
            Try it now
          </Link>
          <a
            href='/headless-vpl/docs/'
            className='rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white no-underline'
          >
            Read the Docs
          </a>
          <a
            href='https://github.com/headless-vpl/headless-vpl'
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white no-underline'
          >
            GitHub &rarr;
          </a>
        </div>
        <p className='mt-6 text-sm text-zinc-400'>
          {features.join(' · ')}
        </p>
      </section>

      {/* Showcase */}
      <section id='showcase' className='mx-auto max-w-7xl px-6 pb-24'>
        <h2 className='mb-2 text-2xl font-bold text-zinc-900 dark:text-white'>Showcase</h2>
        <p className='mb-8 text-sm text-zinc-500'>さまざまなタイプのVPLを構築できます</p>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {showcaseItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className='group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 no-underline'
            >
              <div
                className='mb-4 flex h-36 items-center justify-center rounded-lg'
                style={{ backgroundColor: `${item.color}10`, border: `1px solid ${item.color}30` }}
              >
                <span className='text-3xl font-bold' style={{ color: `${item.color}60` }}>
                  {item.title.split(' ')[0]}
                </span>
              </div>
              <h3 className='text-base font-semibold text-zinc-900 dark:text-white'>
                {item.title}
              </h3>
              <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>{item.description}</p>
              <div className='mt-3 flex gap-2'>
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className='rounded px-2 py-0.5 text-xs'
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Building Blocks */}
      <section id='building-blocks' className='mx-auto max-w-7xl px-6 pb-24'>
        <h2 className='mb-2 text-2xl font-bold text-zinc-900 dark:text-white'>Building Blocks</h2>
        <p className='mb-8 text-sm text-zinc-500'>個別の機能をコンパクトなデモで確認できます</p>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {demoItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className='rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3.5 transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 no-underline'
            >
              <h3 className='text-sm font-semibold text-zinc-900 dark:text-white'>{item.title}</h3>
              <p className='mt-0.5 text-xs text-zinc-500'>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section id='tools' className='mx-auto max-w-7xl px-6 pb-24'>
        <h2 className='mb-2 text-2xl font-bold text-zinc-900 dark:text-white'>Tools</h2>
        <p className='mb-8 text-sm text-zinc-500'>開発を支援するツール</p>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {toolItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className='group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 no-underline'
            >
              <div
                className='mb-4 flex h-24 items-center justify-center rounded-lg'
                style={{ backgroundColor: `${item.color}10`, border: `1px solid ${item.color}30` }}
              >
                <span className='text-2xl font-bold' style={{ color: `${item.color}60` }}>
                  {item.title}
                </span>
              </div>
              <h3 className='text-base font-semibold text-zinc-900 dark:text-white'>
                {item.title}
              </h3>
              <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t border-zinc-200 py-8 dark:border-zinc-800'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-6'>
          <span className='text-sm text-zinc-500'>MIT License</span>
          <div className='flex gap-6'>
            <a
              href='https://github.com/headless-vpl/headless-vpl'
              target='_blank'
              rel='noopener noreferrer'
              className='text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white no-underline'
            >
              GitHub
            </a>
            <a
              href='https://www.npmjs.com/package/headless-vpl'
              target='_blank'
              rel='noopener noreferrer'
              className='text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white no-underline'
            >
              npm
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
