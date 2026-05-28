'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Todo } from '@/types'
import { AvatarDropdown } from '@/app/components/AvatarDropdown'

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
      .insert({ title, user_id: user.id })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setTodos([data, ...todos])
      setNewTitle('')
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
  }

  const cancelEdit = () => {
    editCancelledRef.current = true
    setEditingId(null)
    setEditingText('')
  }

  const commitEdit = async (todo: Todo) => {
    if (editCancelledRef.current) return
    setEditingId(null)
    const title = editingText.trim()
    if (!title || title === todo.title) {
      setEditingText('')
      return
    }
    const { data, error } = await supabase
      .from('todos')
      .update({ title })
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
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 group"
              >
                <button
                  onClick={() => toggleTodo(todo)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
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

                {editingId === todo.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      else if (e.key === 'Escape') { cancelEdit(); e.currentTarget.blur() }
                    }}
                    onBlur={() => commitEdit(todo)}
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-800"
                  />
                ) : (
                  <span
                    onClick={() => startEditing(todo)}
                    className={`flex-1 text-sm cursor-text ${
                      todo.is_complete ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {todo.title}
                  </span>
                )}

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="flex-shrink-0 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1 -mr-1 rounded"
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
