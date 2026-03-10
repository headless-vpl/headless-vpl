import { useRef, useState } from 'react'

export function InstallCommand() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const command = 'npm install headless-vpl'

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className='inline-flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800'
    >
      <span className='text-zinc-400'>$</span>
      <span>{command}</span>
      <span className='ml-2 text-xs text-zinc-400'>{copied ? 'Copied!' : 'Copy'}</span>
    </button>
  )
}
