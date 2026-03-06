import { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createHashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'

// ページの遅延読み込み
const Home = lazy(() => import('./pages/Home'))
const FlowEditor = lazy(() => import('./pages/samples/FlowEditor'))
const BlockEditor = lazy(() => import('./pages/samples/BlockEditor'))
const HybridEditor = lazy(() => import('./pages/samples/HybridEditor'))
const BlueprintEditor = lazy(() => import('./pages/samples/BlueprintEditor'))
const StateMachine = lazy(() => import('./pages/samples/StateMachine'))
const WorkflowEditor = lazy(() => import('./pages/samples/WorkflowEditor'))
const DragAndDrop = lazy(() => import('./pages/demos/DragAndDrop'))
const EdgeTypes = lazy(() => import('./pages/demos/EdgeTypes'))
const EdgeBuilderDemo = lazy(() => import('./pages/demos/EdgeBuilderDemo'))
const SnapConnectionDemo = lazy(() => import('./pages/demos/SnapConnectionDemo'))
const AutoLayoutDemo = lazy(() => import('./pages/demos/AutoLayoutDemo'))
const NestingDemo = lazy(() => import('./pages/demos/NestingDemo'))
const SelectionDemo = lazy(() => import('./pages/demos/SelectionDemo'))
const ZoomPanDemo = lazy(() => import('./pages/demos/ZoomPanDemo'))
const ResizeDemo = lazy(() => import('./pages/demos/ResizeDemo'))
const UndoRedoDemo = lazy(() => import('./pages/demos/UndoRedoDemo'))
const CopyPasteDemo = lazy(() => import('./pages/demos/CopyPasteDemo'))
const Factory = lazy(() => import('./pages/tools/Factory'))

function Loading() {
  return (
    <div className='flex h-[calc(100vh-3.5rem)] items-center justify-center'>
      <div className='text-zinc-500 text-sm'>Loading...</div>
    </div>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'samples/flow-editor',
        element: (
          <Suspense fallback={<Loading />}>
            <FlowEditor />
          </Suspense>
        ),
      },
      {
        path: 'samples/block-editor',
        element: (
          <Suspense fallback={<Loading />}>
            <BlockEditor />
          </Suspense>
        ),
      },
      {
        path: 'samples/hybrid-editor',
        element: (
          <Suspense fallback={<Loading />}>
            <HybridEditor />
          </Suspense>
        ),
      },
      {
        path: 'samples/blueprint',
        element: (
          <Suspense fallback={<Loading />}>
            <BlueprintEditor />
          </Suspense>
        ),
      },
      {
        path: 'samples/state-machine',
        element: (
          <Suspense fallback={<Loading />}>
            <StateMachine />
          </Suspense>
        ),
      },
      {
        path: 'samples/workflow',
        element: (
          <Suspense fallback={<Loading />}>
            <WorkflowEditor />
          </Suspense>
        ),
      },
      {
        path: 'demos/drag-and-drop',
        element: (
          <Suspense fallback={<Loading />}>
            <DragAndDrop />
          </Suspense>
        ),
      },
      {
        path: 'demos/edge-types',
        element: (
          <Suspense fallback={<Loading />}>
            <EdgeTypes />
          </Suspense>
        ),
      },
      {
        path: 'demos/edge-builder',
        element: (
          <Suspense fallback={<Loading />}>
            <EdgeBuilderDemo />
          </Suspense>
        ),
      },
      {
        path: 'demos/snap-connection',
        element: (
          <Suspense fallback={<Loading />}>
            <SnapConnectionDemo />
          </Suspense>
        ),
      },
      {
        path: 'demos/auto-layout',
        element: (
          <Suspense fallback={<Loading />}>
            <AutoLayoutDemo />
          </Suspense>
        ),
      },
      {
        path: 'demos/nesting',
        element: (
          <Suspense fallback={<Loading />}>
            <NestingDemo />
          </Suspense>
        ),
      },
      {
        path: 'demos/selection',
        element: (
          <Suspense fallback={<Loading />}>
            <SelectionDemo />
          </Suspense>
        ),
      },
      {
        path: 'demos/zoom-pan',
        element: (
          <Suspense fallback={<Loading />}>
            <ZoomPanDemo />
          </Suspense>
        ),
      },
      {
        path: 'demos/resize',
        element: (
          <Suspense fallback={<Loading />}>
            <ResizeDemo />
          </Suspense>
        ),
      },
      {
        path: 'demos/undo-redo',
        element: (
          <Suspense fallback={<Loading />}>
            <UndoRedoDemo />
          </Suspense>
        ),
      },
      {
        path: 'demos/copy-paste',
        element: (
          <Suspense fallback={<Loading />}>
            <CopyPasteDemo />
          </Suspense>
        ),
      },
      {
        path: 'tools/factory',
        element: (
          <Suspense fallback={<Loading />}>
            <Factory />
          </Suspense>
        ),
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <RouterProvider router={router} />
  </ThemeProvider>
)
