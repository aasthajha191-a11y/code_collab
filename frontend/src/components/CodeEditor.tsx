import { useEffect, useRef, useState, useMemo } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import * as awarenessProtocol from 'y-protocols/awareness'
import { io, Socket } from 'socket.io-client'
import { Code2, Wifi, WifiOff } from 'lucide-react'
import type * as monacoType from 'monaco-editor'

const USER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
]

function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % USER_COLORS.length
  return USER_COLORS[index]
}

export interface OnlineCollaborator {
  socketId: string
  user: {
    id: string
    name: string
    avatarUrl: string | null
  }
}

interface CodeEditorProps {
  roomId: string
  language: string
  initialCode: string
  currentUser: {
    id: string
    name: string
    avatarUrl: string | null
  }
  onCodeChange: (code: string) => void
  onOnlineUsersChange?: (users: OnlineCollaborator[]) => void
}

export function CodeEditor({
  roomId,
  language,
  initialCode,
  currentUser,
  onCodeChange,
  onOnlineUsersChange,
}: CodeEditorProps) {
  const [connected, setConnected] = useState(false)
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null)
  const yDocRef = useRef<Y.Doc | null>(null)

  const userColor = useMemo(() => getUserColor(currentUser.id), [currentUser.id])

  // Normalize language for Monaco
  const monacoLanguage = useMemo(() => {
    switch (language) {
      case 'python':
        return 'python'
      case 'java':
        return 'java'
      case 'javascript':
      default:
        return 'javascript'
    }
  }, [language])

  const fileName = useMemo(() => {
    switch (language) {
      case 'python':
        return 'main.py'
      case 'java':
        return 'Main.java'
      case 'javascript':
      default:
        return 'main.js'
    }
  }, [language])

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor

    // Create Yjs Document & awareness instance
    const yDoc = new Y.Doc()
    yDocRef.current = yDoc

    const yText = yDoc.getText('monaco')
    const awareness = new awarenessProtocol.Awareness(yDoc)

    // Set local awareness information
    awareness.setLocalStateField('user', {
      name: currentUser.name,
      color: userColor,
      colorLight: `${userColor}33`,
    })

    // Bind Y.Text with Monaco Model
    const model = editor.getModel()
    if (model) {
      // If doc is initially empty, seed with initialCode
      if (yText.length === 0 && initialCode) {
        yText.insert(0, initialCode)
      }

      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editor]),
        awareness
      )
    }

    // Keep parent code state updated on any local or remote change
    yText.observe(() => {
      onCodeChange(yText.toString())
    })

    // Connect to Socket.IO backend
    const socket = io('/', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      console.log(`[CodeEditor] Connected to real-time server for room ${roomId}`)
      socket.emit('join-room', roomId)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('sync-full-state', (stateBytes: number[]) => {
      try {
        const update = new Uint8Array(stateBytes)
        // Apply full state from server
        Y.applyUpdate(yDoc, update, 'server')
        onCodeChange(yText.toString())
      } catch (err) {
        console.error('[CodeEditor] Error applying sync-full-state:', err)
      }
    })

    socket.on('sync-update', (updateBytes: number[]) => {
      try {
        const update = new Uint8Array(updateBytes)
        // Apply remote incremental change
        Y.applyUpdate(yDoc, update, 'server')
      } catch (err) {
        console.error('[CodeEditor] Error applying remote sync-update:', err)
      }
    })

    // Transmit local document edits as incremental Yjs CRDT binary updates
    yDoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'server' && socket.connected) {
        socket.emit('sync-update', {
          roomId,
          update: Array.from(update),
        })
      }
    })

    // Listen to remote awareness/cursor broadcasts
    socket.on(
      'awareness-update',
      (data: { socketId: string; update?: number[] }) => {
        try {
          if (data.update) {
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              new Uint8Array(data.update),
              'server'
            )
          }
        } catch (err) {
          console.error('[CodeEditor] Error applying awareness update:', err)
        }
      }
    )

    // Broadcast local cursor and awareness updates
    awareness.on(
      'update',
      (
        {
          added,
          updated,
          removed,
        }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown
      ) => {
        if (origin !== 'server' && socket.connected) {
          const changed = added.concat(updated, removed)
          const encoded = awarenessProtocol.encodeAwarenessUpdate(
            awareness,
            changed
          )
          socket.emit('awareness-update', {
            roomId,
            update: Array.from(encoded),
          })
        }
      }
    )

    // Online users list update from server
    socket.on('room-users', (users: OnlineCollaborator[]) => {
      onOnlineUsersChange?.(users)
    })
  }

  // Cleanup on unmount or roomId change
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy()
        bindingRef.current = null
      }
      if (yDocRef.current) {
        yDocRef.current.destroy()
        yDocRef.current = null
      }
      if (socketRef.current) {
        socketRef.current.emit('leave-room', roomId)
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [roomId])

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      {/* Tab bar */}
      <div className="flex items-center border-b border-editor-border bg-editor-sidebar px-2 gap-1 h-9">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b-2 border-brand bg-editor-bg text-xs text-white">
          <Code2 className="h-3.5 w-3.5 text-brand" />
          <span>{fileName}</span>
        </div>

        {/* Live sync indicator */}
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400">
          {connected ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live CRDT Sync</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-yellow-400">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connecting...</span>
            </span>
          )}
        </div>
      </div>

      {/* Monaco Editor Component */}
      <div className="flex-1 w-full overflow-hidden">
        <Editor
          height="100%"
          theme="vs-dark"
          language={monacoLanguage}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
            lineNumbers: 'on',
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'all',
            minimap: { enabled: false },
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            tabSize: 2,
            insertSpaces: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'off',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  )
}
