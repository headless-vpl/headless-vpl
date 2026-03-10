import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './components/Header'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <div className='min-h-screen bg-white dark:bg-zinc-950'>
      <Header />
      <ScrollToTop />
      <Outlet />
    </div>
  )
}

export default App
