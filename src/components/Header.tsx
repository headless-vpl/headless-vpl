import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Samples', to: '/#showcase' },
  { label: 'Demos', to: '/#building-blocks' },
  { label: 'Factory', to: '/tools/factory' },
]

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className='sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80'>
      <div className='mx-auto flex h-14 max-w-7xl items-center justify-between px-6'>
        <Link to='/' className='flex items-center gap-2 text-zinc-900 dark:text-white no-underline'>
          <span className='text-lg font-bold tracking-tight'>Headless VPL</span>
        </Link>
        <nav className='flex items-center gap-6'>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm transition-colors no-underline ${
                location.pathname === item.to
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href='/headless-vpl/docs/'
            className='rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900 no-underline'
          >
            Docs
          </a>
          <a
            href='https://github.com/headless-vpl/headless-vpl'
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white no-underline'
          >
            GitHub
          </a>
          <button
            onClick={toggleTheme}
            className='flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            aria-label='Toggle theme'
          >
            {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </nav>
      </div>
    </header>
  )
}
