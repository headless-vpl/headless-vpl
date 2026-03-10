import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Examples', to: '/examples' },
  { label: 'Factory', to: '/tools/factory' },
]

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname.startsWith(to)
}

function HamburgerIcon() {
  return (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <line x1='3' y1='5' x2='17' y2='5' />
      <line x1='3' y1='10' x2='17' y2='10' />
      <line x1='3' y1='15' x2='17' y2='15' />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <line x1='5' y1='5' x2='15' y2='15' />
      <line x1='15' y1='5' x2='5' y2='15' />
    </svg>
  )
}

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className='sticky top-0 z-50 border-b border-zinc-200 bg-white/60 backdrop-blur-xl dark:border-zinc-800 dark:bg-black/60'>
      <div className='mx-auto flex h-14 max-w-7xl items-center justify-between px-6'>
        <Link to='/' className='flex items-center gap-2 text-zinc-900 dark:text-white no-underline'>
          <span className='text-lg font-bold tracking-tight'>Headless VPL</span>
          <span className='hidden sm:inline rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'>
            v{__APP_VERSION__}
          </span>
        </Link>

        {/* デスクトップナビ */}
        <nav className='hidden md:flex items-center gap-6'>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm transition-colors no-underline ${
                isActive(location.pathname, item.to)
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
            {theme === 'dark' ? (
              <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
                <circle cx='8' cy='8' r='3.5' />
                <path d='M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
              </svg>
            ) : (
              <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
                <path d='M14 9.2A6 6 0 0 1 6.8 2 6 6 0 1 0 14 9.2Z' />
              </svg>
            )}
          </button>
        </nav>

        {/* モバイルボタン */}
        <div className='flex md:hidden items-center gap-2'>
          <button
            onClick={toggleTheme}
            className='flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            aria-label='Toggle theme'
          >
            {theme === 'dark' ? (
              <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
                <circle cx='8' cy='8' r='3.5' />
                <path d='M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
              </svg>
            ) : (
              <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
                <path d='M14 9.2A6 6 0 0 1 6.8 2 6 6 0 1 0 14 9.2Z' />
              </svg>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className='flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            aria-label='Toggle menu'
          >
            {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* モバイルメニュー */}
      {mobileOpen && (
        <nav className='md:hidden border-t border-zinc-200 bg-white/60 backdrop-blur-xl dark:border-zinc-800 dark:bg-black/60 px-6 py-4 flex flex-col gap-3'>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`text-sm transition-colors no-underline ${
                isActive(location.pathname, item.to)
                  ? 'text-zinc-900 dark:text-white font-medium'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href='/headless-vpl/docs/'
            className='text-sm text-blue-600 dark:text-blue-400 no-underline'
          >
            Docs
          </a>
          <a
            href='https://github.com/headless-vpl/headless-vpl'
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-zinc-600 dark:text-zinc-400 no-underline'
          >
            GitHub
          </a>
        </nav>
      )}
    </header>
  )
}