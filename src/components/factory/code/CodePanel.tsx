import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '../../../contexts/ThemeContext'
import { useFactory } from '../../../contexts/FactoryContext'
import { generateCode } from '../../../lib/headless-vpl/util/codeGenerator'
import { serializeFactoryProject } from '../../../lib/headless-vpl/util/factorySerializer'

type TabId = 'code' | 'json'

export function CodePanel() {
  const [activeTab, setActiveTab] = useState<TabId>('code')
  const [code, setCode] = useState<string>('// Waiting for canvas changes...')
  const [jsonOutput, setJsonOutput] = useState<string>('{}')
  const { theme } = useTheme()
  const { workspace, containers, revision, actions, expandedNodeIds, hiddenIds, lockedIds } = useFactory()
  const [MonacoEditor, setMonacoEditor] = useState<React.ComponentType<{
    key: string
    height: string
    language: string
    theme: string
    value: string
    options?: Record<string, unknown>
  }> | null>(null)

  // Monaco Editorの遅延読み込み
  const loadMonaco = useCallback(() => {
    if (MonacoEditor) return
    import('@monaco-editor/react').then((mod) => {
      setMonacoEditor(() => mod.default)
    })
  }, [MonacoEditor])

  // 初回表示時にMonacoを読み込む
  useEffect(() => {
    loadMonaco()
  }, [loadMonaco])

  // revisionの変化を検知して即座にコード生成（React 18の自動バッチングが自然なdebounceとして機能）
  useEffect(() => {
    if (!workspace) return
    const generated = generateCode(containers, workspace.edges, workspace.elements)
    setCode(generated)
    const project = serializeFactoryProject(workspace, {
      expandedNodeIds,
      hiddenIds,
      lockedIds,
    })
    setJsonOutput(JSON.stringify(project, null, 2))
  }, [revision, workspace, containers, expandedNodeIds, hiddenIds, lockedIds])

  const handleCopy = useCallback(() => {
    const text = activeTab === 'code' ? code : jsonOutput
    navigator.clipboard.writeText(text)
  }, [activeTab, code, jsonOutput])

  const handleImport = useCallback(() => {
    const raw = window.prompt('Paste Factory project JSON')
    if (!raw) return
    const result = actions.importProject(raw)
    if (!result.ok && result.error) {
      window.alert(result.error)
    }
  }, [actions])

  return (
    <div className='factory-code-panel'>
      <div className='factory-code-header'>
        <div className='factory-code-tabs'>
          <button
            className={`factory-code-tab ${activeTab === 'code' ? 'factory-code-tab-active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            Code
          </button>
          <button
            className={`factory-code-tab ${activeTab === 'json' ? 'factory-code-tab-active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>
        <div className='factory-code-actions'>
          <button onClick={handleCopy} className='factory-code-btn'>
            Copy
          </button>
          {activeTab === 'json' && (
            <button onClick={handleImport} className='factory-code-btn'>
              Import
            </button>
          )}
        </div>
      </div>
      <div className='factory-code-editor'>
        {MonacoEditor ? (
          activeTab === 'code' ? (
            <MonacoEditor
              key='code'
              height='100%'
              language='typescript'
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              value={code}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                readOnly: true,
                automaticLayout: true,
              }}
            />
          ) : (
            <MonacoEditor
              key='json'
              height='100%'
              language='json'
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              value={jsonOutput}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                readOnly: true,
                automaticLayout: true,
              }}
            />
          )
        ) : (
          <div className='factory-code-loading'>Loading editor...</div>
        )}
      </div>
    </div>
  )
}
