import { Link, useLocation } from 'react-router-dom'
import { sidebarNavGroups } from '../data/navigationData'

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className='hidden md:flex w-[200px] flex-shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 overflow-y-auto'>
      <nav className='py-4'>
        {sidebarNavGroups.map((group) => (
          <div key={group.title} className='mb-4'>
            <h3 className='px-4 mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
              {group.title}
            </h3>
            <ul className='list-none m-0 p-0'>
              {group.items.map((item) => {
                const active = location.pathname === item.path
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`block px-4 py-1.5 text-sm no-underline transition-colors ${
                        active
                          ? 'border-l-2 border-blue-500 bg-blue-50 text-blue-600 font-medium dark:bg-blue-950/50 dark:text-blue-400'
                          : 'border-l-2 border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
