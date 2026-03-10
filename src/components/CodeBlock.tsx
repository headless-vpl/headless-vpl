import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

type CodeBlockProps = {
  code: string
  lang?: string
}

export function CodeBlock({ code, lang = 'typescript' }: CodeBlockProps) {
  const { theme } = useTheme()
  const [html, setHtml] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    let cancelled = false
    import('shiki').then(({ codeToHtml }) => {
      codeToHtml(code.trim(), {
        lang,
        theme: theme === 'dark' ? 'github-dark' : 'github-light',
      }).then((result) => {
        if (!cancelled) setHtml(result)
      })
    })
    return () => {
      cancelled = true
    }
  }, [code, lang, theme])

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim())
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='relative group rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden'>
      <button
        onClick={handleCopy}
        className='absolute top-2 right-2 z-10 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      {html ? (
        <div
          className='overflow-x-auto text-sm [&_pre]:p-4 [&_pre]:m-0'
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className='p-4 m-0 text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900'>
          <code>{code.trim()}</code>
        </pre>
      )}
    </div>
  )
}
