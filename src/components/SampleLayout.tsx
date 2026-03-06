import { Link } from 'react-router-dom'

type SampleLayoutProps = {
  title: string
  description?: string
  children: React.ReactNode
  rightPanel?: React.ReactNode
}

export function SampleLayout({ title, description, children, rightPanel }: SampleLayoutProps) {
  return (
    <div className='flex h-[calc(100vh-3.5rem)] flex-col'>
      <div className='flex items-center gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800'>
        <Link
          to='/'
          className='text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white no-underline'
        >
          &larr; Back
        </Link>
        <div className='h-4 w-px bg-zinc-300 dark:bg-zinc-700' />
        <div>
          <h1 className='text-base font-semibold text-zinc-900 dark:text-white m-0'>{title}</h1>
          {description && <p className='text-xs text-zinc-500 m-0 mt-0.5'>{description}</p>}
        </div>
      </div>
      <div className='flex-1 p-4 flex gap-4'>
        <div className='flex-1 min-w-0'>{children}</div>
        {rightPanel}
      </div>
    </div>
  )
}
