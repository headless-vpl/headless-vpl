import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { InstallCommand } from '../components/InstallCommand'
import { showcaseItems, demoItems, toolItems } from '../data/examplesData'

const heroStats = [
  { value: '70%', label: 'Less Code' },
  { value: '0', label: 'Dependencies' },
  { value: '~8KB', label: 'Gzipped' },
  { value: 'Any', label: 'Framework' },
]

const featureCards = [
  {
    title: 'Headless Architecture',
    description: 'UIとロジックが完全に分離。見た目を100%自由にカスタマイズできます。',
    icon: (
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='3' y='3' width='18' height='18' rx='2' />
        <path d='M3 9h18M9 3v18' />
      </svg>
    ),
  },
  {
    title: 'Framework Agnostic',
    description: 'React, Vue, Svelte, vanilla JS — 好きなフレームワークで使えます。',
    icon: (
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
        <circle cx='12' cy='12' r='9' />
        <path d='M12 3a9 9 0 0 1 0 18M12 3a9 9 0 0 0 0 18M3 12h18' />
      </svg>
    ),
  },
  {
    title: 'Build Any VPL Type',
    description: 'ブロック型、フロー型、両方の混合型 — どんなタイプのVPLでも作れます。',
    icon: (
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='2' y='4' width='8' height='6' rx='1' />
        <rect x='14' y='4' width='8' height='6' rx='1' />
        <rect x='8' y='14' width='8' height='6' rx='1' />
        <path d='M10 10v4M14 7h-4M10 14l-4-4M14 14l4-4' />
      </svg>
    ),
  },
  {
    title: '70% Less Code',
    description: '従来の実装と比べて最大70%のコード削減。少ない記述で高い表現力。',
    icon: (
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
        <polyline points='16 18 22 12 16 6' />
        <polyline points='8 6 2 12 8 18' />
      </svg>
    ),
  },
]

const codeComparison = {
  before: {
    label: 'Before (38 lines)',
    code: `// 従来のドラッグ&ドロップ実装
let isDragging = false;
let dragTarget = null;
let offsetX = 0, offsetY = 0;

canvas.addEventListener('mousedown', (e) => {
  const target = findElementAt(e.clientX, e.clientY);
  if (!target) return;
  isDragging = true;
  dragTarget = target;
  const rect = target.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});

function onMouseMove(e) {
  if (!isDragging || !dragTarget) return;
  const x = e.clientX - offsetX;
  const y = e.clientY - offsetY;
  // 境界チェック
  const bounded = clampToBounds(x, y, canvas);
  dragTarget.style.left = bounded.x + 'px';
  dragTarget.style.top = bounded.y + 'px';
  // 接続線の更新
  updateConnectedEdges(dragTarget);
  // 選択状態の更新
  updateSelectionVisuals(dragTarget);
  // スナップ判定
  checkSnapTargets(dragTarget, allElements);
}

function onMouseUp() {
  isDragging = false;
  dragTarget = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  finalizeSnapConnection();
}`,
  },
  after: {
    label: 'After (8 lines)',
    code: `// Headless VPLでのドラッグ&ドロップ
const ws = new Workspace()
const im = new InteractionManager(ws, svg, overlay)

new Container({
  workspace: ws,
  position: new Position(100, 100),
  name: 'Node',
  width: 120, height: 60,
})
// DnD、スナップ、Edge更新が全て自動で動作`,
  },
}

const comparisonTable = [
  { feature: 'Architecture', headlessVpl: 'Headless (UI分離)', blockly: 'Monolithic', reactflow: 'React依存' },
  { feature: 'Framework', headlessVpl: 'Any (バニラTS)', blockly: 'Closure Library', reactflow: 'React only' },
  { feature: 'VPL Type', headlessVpl: 'Block + Flow + Hybrid', blockly: 'Block only', reactflow: 'Flow only' },
  { feature: 'Type Safety', headlessVpl: 'Full TypeScript', blockly: 'JSON / String', reactflow: 'TypeScript' },
  { feature: 'Dependencies', headlessVpl: '0', blockly: 'Closure Library', reactflow: 'React + d3' },
  { feature: 'Bundle Size', headlessVpl: '~8KB gzipped', blockly: '~300KB', reactflow: '~40KB + React' },
  { feature: 'API Design', headlessVpl: 'Declarative', blockly: 'Imperative/JSON', reactflow: 'Event-driven' },
]

export default function Home() {
  return (
    <div className='min-h-screen'>
      {/* Hero */}
      <section className='relative overflow-hidden'>
        <div className='absolute inset-0 dot-grid-pattern fade-mask' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(59,130,246,0.08),transparent)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(59,130,246,0.12),transparent)]' />
        <div className='relative mx-auto max-w-7xl px-6 pt-28 pb-20 text-center'>
          <h1 className='text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-7xl animate-fade-in-up'>
            Build any Visual
            <br />
            <span className='hero-gradient-text'>
              Programming Language
            </span>
          </h1>
          <p className='mx-auto mt-6 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400 animate-fade-in-up' style={{ animationDelay: '0.1s' }}>
            Block-based, flow-based, or something entirely new — in pure TypeScript.
            <br />
            Headless architecture. Zero dependencies. Full control.
          </p>
          <div className='mt-8 flex items-center justify-center gap-4 animate-fade-in-up' style={{ animationDelay: '0.2s' }}>
            <Link
              to='/demos/drag-and-drop'
              className='rounded-full bg-zinc-900 px-7 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 no-underline'
            >
              Try it now
            </Link>
            <Link
              to='/examples'
              className='rounded-full border border-zinc-300 px-7 py-2.5 text-sm font-semibold text-zinc-600 transition-all hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white no-underline'
            >
              View Examples
            </Link>
          </div>
          <div className='mt-10 animate-fade-in-up' style={{ animationDelay: '0.3s' }}>
            <InstallCommand />
          </div>
          <div className='mt-10 flex items-center justify-center gap-8 sm:gap-12 animate-fade-in-up' style={{ animationDelay: '0.4s' }}>
            {heroStats.map((stat, i) => (
              <div key={stat.label} className='flex items-center gap-8 sm:gap-12'>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl'>
                    {stat.value}
                  </div>
                  <div className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>{stat.label}</div>
                </div>
                {i < heroStats.length - 1 && (
                  <div className='h-8 w-px bg-zinc-200 dark:bg-zinc-800' />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className='mx-auto max-w-7xl px-6 pb-24'>
        <h2 className='mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-white'>Why Headless VPL?</h2>
        <p className='mb-10 text-center text-sm text-zinc-500'>VPL開発に必要な全てを、最小限のAPIで提供します</p>
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {featureCards.map((card) => (
            <div
              key={card.title}
              className='glass-card gradient-border rounded-xl p-6 transition-all duration-200 hover:translate-y-[-2px]'
            >
              <div className='mb-3 text-zinc-400 dark:text-zinc-500'>{card.icon}</div>
              <h3 className='text-sm font-semibold text-zinc-900 dark:text-white'>{card.title}</h3>
              <p className='mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400'>
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Code Comparison */}
      <section className='relative bg-zinc-950 py-24 overflow-hidden'>
        <div className='absolute inset-0 dot-grid-pattern opacity-[0.03]' />
        <div className='relative mx-auto max-w-5xl px-6'>
          {/* 見出し + 削減率 */}
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold text-white sm:text-4xl'>Less Code, More Power</h2>
            <p className='mt-3 text-zinc-400'>
              38行のドラッグ&ドロップ実装が、<span className='text-white font-semibold'>たった8行</span>に
            </p>
          </div>

          {/* コード比較: 2カラム */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {/* Before */}
            <div>
              <div className='flex items-center justify-between mb-2 px-1'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-red-500/60' />
                  <span className='text-sm font-medium text-zinc-400'>従来の実装</span>
                </div>
                <span className='text-xs font-mono text-zinc-600'>38 lines</span>
              </div>
              <div className='relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60'>
                <pre className='p-4 m-0 text-[13px] leading-relaxed text-zinc-500 font-mono whitespace-pre overflow-x-auto max-h-[280px]'>
                  <code>{codeComparison.before.code}</code>
                </pre>
                <div className='absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none' />
              </div>
            </div>

            {/* After */}
            <div>
              <div className='flex items-center justify-between mb-2 px-1'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-emerald-500' />
                  <span className='text-sm font-medium text-white'>Headless VPL</span>
                </div>
                <span className='text-xs font-mono text-emerald-400'>8 lines</span>
              </div>
              <div className='rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden'>
                <CodeBlock code={codeComparison.after.code} />
              </div>
            </div>
          </div>

          {/* 削減率バー */}
          <div className='mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6'>
            {[
              { feature: 'レイアウト構築', before: 71, after: 22 },
              { feature: 'ドラッグ&ドロップ', before: 38, after: 8 },
              { feature: 'スタイリング', before: 7, after: 1 },
            ].map((row) => {
              const pct = Math.round((1 - row.after / row.before) * 100)
              return (
                <div key={row.feature}>
                  <div className='flex items-baseline justify-between mb-2'>
                    <span className='text-sm text-zinc-400'>{row.feature}</span>
                    <span className='text-lg font-bold text-white'>-{pct}%</span>
                  </div>
                  <div className='relative h-2 rounded-full bg-zinc-800'>
                    <div
                      className='absolute inset-y-0 left-0 rounded-full bg-zinc-600'
                      style={{ width: '100%' }}
                    />
                    <div
                      className='absolute inset-y-0 left-0 rounded-full bg-emerald-500'
                      style={{ width: `${(row.after / row.before) * 100}%` }}
                    />
                  </div>
                  <div className='flex justify-between mt-1.5'>
                    <span className='text-[11px] font-mono text-zinc-600'>{row.before} lines</span>
                    <span className='text-[11px] font-mono text-emerald-400/80'>{row.after} lines</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section id='showcase' className='mx-auto max-w-7xl px-6 pb-24'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h2 className='mb-1 text-2xl font-bold text-zinc-900 dark:text-white'>Showcase</h2>
            <p className='text-sm text-zinc-500'>さまざまなタイプのVPLを構築できます</p>
          </div>
          <Link
            to='/examples'
            className='text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 no-underline'
          >
            View all &rarr;
          </Link>
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {showcaseItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className='group glass-card gradient-border relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:translate-y-[-2px] no-underline'
            >
              {item.previewImage ? (
                <div className='mb-4 h-36 overflow-hidden rounded-lg'>
                  <img src={item.previewImage} alt={item.title} className='h-full w-full object-cover' />
                </div>
              ) : (
                <div
                  className='mb-4 flex h-36 items-center justify-center rounded-lg dot-grid-pattern'
                  style={{
                    backgroundColor: `${item.color}08`,
                    border: `1px solid ${item.color}20`,
                  }}
                >
                  <span className='text-3xl font-bold' style={{ color: `${item.color}60` }}>
                    {item.title.split(' ')[0]}
                  </span>
                </div>
              )}
              <h3 className='text-base font-semibold text-zinc-900 dark:text-white'>
                {item.title}
              </h3>
              <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>{item.description}</p>
              <div className='mt-3 flex gap-2'>
                {item.tags?.map((tag) => (
                  <span
                    key={tag}
                    className='rounded-full px-2 py-0.5 text-xs'
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className='mx-auto max-w-7xl px-6 pb-24'>
        <h2 className='mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-white'>
          How It Compares
        </h2>
        <p className='mb-8 text-center text-sm text-zinc-500'>
          既存ライブラリとの比較
        </p>
        <div className='mx-auto max-w-4xl glass-card rounded-xl overflow-x-auto'>
          <table className='w-full border-collapse text-sm'>
            <thead>
              <tr className='border-b border-zinc-200 dark:border-zinc-800'>
                <th className='py-3 px-4 text-left font-medium text-zinc-500 dark:text-zinc-400' />
                <th className='py-3 px-4 text-left font-semibold text-blue-600 dark:text-blue-400'>
                  Headless VPL
                </th>
                <th className='py-3 px-4 text-left font-medium text-zinc-500 dark:text-zinc-400'>
                  Blockly
                </th>
                <th className='py-3 px-4 text-left font-medium text-zinc-500 dark:text-zinc-400'>
                  ReactFlow
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonTable.map((row) => (
                <tr key={row.feature} className='border-b border-zinc-200 dark:border-zinc-800'>
                  <td className='py-2.5 px-4 font-medium text-zinc-700 dark:text-zinc-300'>
                    {row.feature}
                  </td>
                  <td className='py-2.5 px-4 text-zinc-900 dark:text-white font-medium'>
                    {row.headlessVpl}
                  </td>
                  <td className='py-2.5 px-4 text-zinc-500 dark:text-zinc-400'>{row.blockly}</td>
                  <td className='py-2.5 px-4 text-zinc-500 dark:text-zinc-400'>{row.reactflow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Building Blocks */}
      <section id='building-blocks' className='mx-auto max-w-7xl px-6 pb-24'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h2 className='mb-1 text-2xl font-bold text-zinc-900 dark:text-white'>Building Blocks</h2>
            <p className='text-sm text-zinc-500'>個別の機能をコンパクトなデモで確認できます</p>
          </div>
          <Link
            to='/examples#demos'
            className='text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 no-underline'
          >
            View all &rarr;
          </Link>
        </div>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {demoItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className='glass-card gradient-border rounded-lg px-4 py-3.5 transition-all duration-200 hover:translate-y-[-2px] no-underline'
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
              className='group glass-card gradient-border relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:translate-y-[-2px] no-underline'
            >
              <div
                className='mb-4 flex h-24 items-center justify-center rounded-lg dot-grid-pattern'
                style={{
                  backgroundColor: `${item.color}08`,
                  border: `1px solid ${item.color}20`,
                }}
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
      <footer className='dark:bg-black'>
        <div className='h-px bg-zinc-200 dark:bg-zinc-800' />
        <div className='mx-auto max-w-7xl px-6 py-12'>
          <div className='grid gap-8 sm:grid-cols-2 lg:grid-cols-4'>
            {/* ブランド */}
            <div>
              <h3 className='text-sm font-bold text-zinc-900 dark:text-white'>Headless VPL</h3>
              <p className='mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400'>
                A headless library for building visual programming languages in pure TypeScript.
              </p>
              <p className='mt-3 text-xs text-zinc-400'>MIT License</p>
            </div>

            {/* Resources */}
            <div>
              <h3 className='mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                Resources
              </h3>
              <ul className='list-none m-0 p-0 flex flex-col gap-2'>
                <li>
                  <a href='/headless-vpl/docs/' className='text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white no-underline'>
                    Documentation
                  </a>
                </li>
                <li>
                  <a href='https://github.com/headless-vpl/headless-vpl' target='_blank' rel='noopener noreferrer' className='text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white no-underline'>
                    GitHub
                  </a>
                </li>
                <li>
                  <a href='https://www.npmjs.com/package/headless-vpl' target='_blank' rel='noopener noreferrer' className='text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white no-underline'>
                    npm
                  </a>
                </li>
              </ul>
            </div>

            {/* Examples */}
            <div>
              <h3 className='mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                Examples
              </h3>
              <ul className='list-none m-0 p-0 flex flex-col gap-2'>
                {showcaseItems.slice(0, 4).map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className='text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white no-underline'>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Demos */}
            <div>
              <h3 className='mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                Demos
              </h3>
              <ul className='list-none m-0 p-0 flex flex-col gap-2'>
                {demoItems.slice(0, 4).map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className='text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white no-underline'>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
