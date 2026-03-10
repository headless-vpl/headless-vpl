import { Link } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { CodeBlock } from './CodeBlock'

type SampleLayoutProps = {
  title: string
  description?: string
  children: React.ReactNode
  rightPanel?: React.ReactNode
  hideSidebar?: boolean
  longDescription?: string
  codeSnippet?: string
}

export function SampleLayout({
  title,
  description,
  children,
  rightPanel,
  hideSidebar,
  longDescription,
  codeSnippet,
}: SampleLayoutProps) {
  const hasBottomPanel = longDescription || codeSnippet

  return (
    <div className='flex h-[calc(100vh-3.5rem)]'>
      {!hideSidebar && <Sidebar />}
      <div className='flex flex-1 flex-col min-w-0'>
        {/* パンくずリスト + タイトル */}
        <div className='flex items-center gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800'>
          <nav className='flex items-center gap-1.5 text-sm'>
            <Link
              to='/'
              className='text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 no-underline'
            >
              Home
            </Link>
            <span className='text-zinc-300 dark:text-zinc-600'>/</span>
            <Link
              to='/examples'
              className='text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 no-underline'
            >
              Examples
            </Link>
            <span className='text-zinc-300 dark:text-zinc-600'>/</span>
            <span className='text-zinc-700 dark:text-zinc-200 font-medium'>{title}</span>
          </nav>
          <div className='ml-auto'>
            {description && <p className='text-xs text-zinc-500 m-0'>{description}</p>}
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className={`flex-1 flex gap-4 p-4 ${hasBottomPanel ? '' : 'min-h-0'}`}>
          <div className='flex-1 min-w-0 min-h-0'>{children}</div>
          {rightPanel}
        </div>

        {/* 説明 + コードスニペット */}
        {hasBottomPanel && (
          <div className='border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 max-h-[280px] overflow-y-auto'>
            <div className='flex gap-6'>
              {longDescription && (
                <div className='flex-1 min-w-0'>
                  <h3 className='text-sm font-semibold text-zinc-900 dark:text-white m-0 mb-2'>About</h3>
                  <p className='text-sm text-zinc-600 dark:text-zinc-400 m-0 leading-relaxed'>
                    {longDescription}
                  </p>
                </div>
              )}
              {codeSnippet && (
                <div className='flex-1 min-w-0'>
                  <h3 className='text-sm font-semibold text-zinc-900 dark:text-white m-0 mb-2'>Code</h3>
                  <CodeBlock code={codeSnippet} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
