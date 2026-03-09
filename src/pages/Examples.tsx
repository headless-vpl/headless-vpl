import { useState } from 'react'
import { Link } from 'react-router-dom'
import { showcaseItems, demoItems, toolItems } from '../data/examplesData'
import type { ExampleItem, Difficulty } from '../data/examplesData'

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'samples', label: 'Samples' },
  { id: 'basic', label: 'Basic' },
  { id: 'connection', label: 'Connection' },
  { id: 'layout', label: 'Layout' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'history', label: 'History' },
  { id: 'tools', label: 'Tools' },
] as const

type FilterId = (typeof filterTabs)[number]['id']

const difficultyConfig: Record<Difficulty, { label: string; className: string }> = {
  beginner: { label: 'Beginner', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  intermediate: { label: 'Intermediate', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  advanced: { label: 'Advanced', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const allItems: ExampleItem[] = [...showcaseItems, ...demoItems, ...toolItems]

function getFilteredItems(filter: FilterId): ExampleItem[] {
  if (filter === 'all') return allItems
  if (filter === 'samples') return showcaseItems
  if (filter === 'tools') return toolItems
  return demoItems.filter((item) => item.subCategory === filter)
}

function ExampleCard({ item }: { item: ExampleItem }) {
  const color = item.color ?? '#6b7280'

  return (
    <Link
      to={item.path}
      className='group glass-card gradient-border overflow-hidden rounded-xl transition-all duration-200 hover:translate-y-[-2px] no-underline'
    >
      {/* プレビュー */}
      {item.previewImage ? (
        <div className='h-40 overflow-hidden'>
          <img src={item.previewImage} alt={item.title} className='h-full w-full object-cover' />
        </div>
      ) : item.color ? (
        <div
          className='flex h-40 items-center justify-center dot-grid-pattern'
          style={{ backgroundColor: `${color}08`, borderBottom: `1px solid ${color}20` }}
        >
          <span className='text-2xl font-bold' style={{ color: `${color}50` }}>
            {item.title.split(' ')[0]}
          </span>
        </div>
      ) : null}

      {/* コンテンツ */}
      <div className='p-4'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-semibold text-zinc-900 dark:text-white'>{item.title}</h3>
          {item.difficulty && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyConfig[item.difficulty].className}`}>
              {difficultyConfig[item.difficulty].label}
            </span>
          )}
          {item.badge && (
            <span className='rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'>
              {item.badge}
            </span>
          )}
        </div>
        <p className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>{item.description}</p>
        {item.tags && (
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {item.tags.map((tag) => (
              <span
                key={tag}
                className='rounded-full px-1.5 py-0.5 text-[10px]'
                style={{ backgroundColor: `${color}15`, color }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function Examples() {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')
  const filteredItems = getFilteredItems(activeFilter)

  return (
    <div className='min-h-[calc(100vh-3.5rem)]'>
      <main className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-zinc-900 dark:text-white'>Examples</h1>
          <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
            Headless VPLで構築できるビジュアルプログラミング環境の例
          </p>
        </div>

        {/* タブフィルター */}
        <div className='mb-8 flex gap-2 overflow-x-auto pb-2'>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                activeFilter === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* カードグリッド */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {filteredItems.map((item) => (
            <ExampleCard key={item.path} item={item} />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className='py-20 text-center text-zinc-400'>
            No examples found for this category.
          </div>
        )}
      </main>
    </div>
  )
}
