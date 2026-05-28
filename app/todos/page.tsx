'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Todo } from '@/types'
import { AvatarDropdown } from '@/app/components/AvatarDropdown'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDueDate(dateStr: string): string {
  const today = todayStr()
  if (dateStr === today) return 'Due today'
  const t = new Date()
  t.setDate(t.getDate() + 1)
  const tomorrow = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  if (dateStr === tomorrow) return 'Due tomorrow'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `Due ${date.getDate()} ${date.toLocaleString('en', { month: 'short' })}`
}

function getDueDateColor(dateStr: string, isComplete: boolean): string {
  if (isComplete) return 'text-gray-400'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = dateStr.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'text-red-500'
  if (diffDays <= 2) return 'text-amber-500'
  return 'text-gray-400'
}

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    // Group: 0 = incomplete+date, 1 = incomplete+no date, 2 = complete
    const ga = a.is_complete ? 2 : a.due_date ? 0 : 1
    const gb = b.is_complete ? 2 : b.due_date ? 0 : 1
    if (ga !== gb) return ga - gb
    // Within group 0: soonest date first
    if (ga === 0) {
      if (a.due_date! < b.due_date!) return -1
      if (a.due_date! > b.due_date!) return 1
    }
    // Same date (or both undated/complete): priority first
    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1
    return 0
  })
}

export default function TodosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [todos, setTodos] = useState<Todo[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [fetching, setFetching] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [editingDueDate, setEditingDueDate] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const editCancelledRef = useRef(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchTodos()
    }
  }, [user])

  const fetchTodos = async () => {
    setFetching(true)
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setTodos(data ?? [])
    }
    setFetching(false)
  }

  const addTodo = async (e: FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || !user) return

    setAdding(true)
    const { data, error } = await supabase
      .from('todos')
      .insert({ title, user_id: user.id, due_date: newDueDate || null, is_priority: false })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setTodos([data, ...todos])
      setNewTitle('')
      setNewDueDate('')
    }
    setAdding(false)
  }

  const toggleTodo = async (todo: Todo) => {
    const { data, error } = await supabase
      .from('todos')
      .update({ is_complete: !todo.is_complete })
      .eq('id', todo.id)
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setTodos(todos.map((t) => (t.id === todo.id ? data : t)))
    }
  }

  const deleteTodo = async (id: number) => {
    const { error } = await supabase.from('todos').delete().eq('id', id)

    if (error) {
      setError(error.message)
    } else {
      setTodos(todos.filter((t) => t.id !== id))
    }
  }

  const startEditing = (todo: Todo) => {
    editCancelledRef.current = false
    setEditingId(todo.id)
    setEditingText(todo.title)
    setEditingDueDate(todo.due_date ?? '')
  }

  const cancelEdit = () => {
    editCancelledRef.current = true
    setEditingId(null)
    setEditingText('')
    setEditingDueDate('')
  }

  const commitEdit = async (todo: Todo) => {
    if (editCancelledRef.current) return
    editCancelledRef.current = true  // prevent double-commit if blur fires after Enter
    setEditingId(null)
    const title = editingText.trim()
    const dueDate = editingDueDate || null
    if (!title) {
      setEditingText('')
      setEditingDueDate('')
      return
    }
    const titleChanged = title !== todo.title
    const dueDateChanged = dueDate !== (todo.due_date ?? null)
    if (!titleChanged && !dueDateChanged) {
      setEditingText('')
      setEditingDueDate('')
      return
    }
    const { data, error } = await supabase
      .from('todos')
      .update({ title, due_date: dueDate })
      .eq('id', todo.id)
      .eq('user_id', user!.id)
      .select()
      .single()
    if (error) {
      setError(error.message)
    } else {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? data : t)))
    }
    setEditingText('')
    setEditingDueDate('')
  }

  const clearDueDate = async (todo: Todo) => {
    const { data, error } = await supabase
      .from('todos')
      .update({ due_date: null })
      .eq('id', todo.id)
      .eq('user_id', user!.id)
      .select()
      .single()
    if (error) {
      setError(error.message)
    } else {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? data : t)))
    }
  }

  const togglePriority = async (todo: Todo) => {
    const optimistic = { ...todo, is_priority: !todo.is_priority }
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? optimistic : t)))

    const { data, error } = await supabase
      .from('todos')
      .update({ is_priority: !todo.is_priority })
      .eq('id', todo.id)
      .eq('user_id', user!.id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)))
    } else {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? data : t)))
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const sortedTodos = sortTodos(todos)
  const remaining = todos.filter((t) => !t.is_complete).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">My Todos</h1>
          <AvatarDropdown />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              &times;
            </button>
          </div>
        )}

        {/* Add todo form */}
        <form onSubmit={addTodo} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="shrink-0 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {adding ? '...' : 'Add'}
          </button>
        </form>

        {/* Stats */}
        {todos.length > 0 && (
          <p className="text-xs text-gray-400 mb-3">
            {remaining === 0
              ? 'All done!'
              : `${remaining} of ${todos.length} remaining`}
          </p>
        )}

        {/* Todo list */}
        {fetching ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No todos yet. Add one above.
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedTodos.map((todo) => (
              <li
                key={todo.id}
                className={`flex items-start gap-3 rounded-lg px-4 py-3 group border border-gray-200 transition ${
                  todo.is_priority && !todo.is_complete
                    ? 'bg-rose-50 border-l-4 border-l-rose-400'
                    : 'bg-white'
                }`}
              >
                <button
                  onClick={() => toggleTodo(todo)}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    todo.is_complete
                      ? 'bg-gray-900 border-gray-900'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  aria-label={todo.is_complete ? 'Mark incomplete' : 'Mark complete'}
                >
                  {todo.is_complete && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <div
                      className="flex items-center gap-2"
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) commitEdit(todo)
                      }}
                    >
                      <input
                        autoFocus
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(todo)
                          else if (e.key === 'Escape') cancelEdit()
                        }}
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-800"
                      />
                      <input
                        type="date"
                        value={editingDueDate}
                        onChange={(e) => setEditingDueDate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelEdit()
                          else if (e.key === 'Enter') commitEdit(todo)
                        }}
                        className="shrink-0 text-sm border border-gray-300 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-500"
                      />
                    </div>
                  ) : (
                    <>
                      <span
                        onClick={() => startEditing(todo)}
                        className={`text-sm cursor-text ${
                          todo.is_complete ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {todo.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {todo.due_date && (
                          <>
                            <span className={`text-xs ${getDueDateColor(todo.due_date, todo.is_complete)}`}>
                              {formatDueDate(todo.due_date)}
                            </span>
                            <button
                              onClick={() => clearDueDate(todo)}
                              className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition text-xs leading-none"
                              aria-label="Remove due date"
                            >
                              ×
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => togglePriority(todo)}
                          className={`transition ${
                            todo.is_priority
                              ? 'text-rose-400 hover:text-rose-500'
                              : 'text-gray-300 hover:text-rose-400'
                          }`}
                          aria-label={todo.is_priority ? 'Remove priority' : 'Mark as priority'}
                        >
                          {todo.is_priority ? (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                              <line x1="4" x2="4" y1="22" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                              <line x1="4" x2="4" y1="22" y2="15" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1 -mr-1 rounded"
                  aria-label="Delete todo"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
