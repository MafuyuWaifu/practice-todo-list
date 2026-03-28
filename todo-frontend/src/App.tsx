import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 🌟 新增這行：抓取後端 API 網址
const API_URL = import.meta.env.VITE_API_URL

type Todo = {
  id: string
  title: string
  is_completed: boolean
}

type Toast = {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [loadingTodos, setLoadingTodos] = useState(false)
  const [submittingTodo, setSubmittingTodo] = useState(false)
  const [busyTodoIds, setBusyTodoIds] = useState<string[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)
  const toastTimersRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      for (const timer of toastTimersRef.current) {
        window.clearTimeout(timer)
      }
    }
  }, [])

  const showToast = (message: string, tone: Toast['tone']) => {
    const id = toastIdRef.current + 1
    toastIdRef.current = id

    setToasts((current) => [...current, { id, message, tone }])

    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
      toastTimersRef.current = toastTimersRef.current.filter((item) => item !== timer)
    }, 3000)

    toastTimersRef.current.push(timer)
  }

  const markTodoBusy = (todoId: string) => {
    setBusyTodoIds((current) => (current.includes(todoId) ? current : [...current, todoId]))
  }

  const unmarkTodoBusy = (todoId: string) => {
    setBusyTodoIds((current) => current.filter((id) => id !== todoId))
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      if (!data.session?.access_token) {
        throw new Error('登入成功，但沒有取得 access token。')
      }

      setToken(data.session.access_token)
      showToast('登入成功。', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : '登入失敗。'
      showToast(message, 'error')
    }
  }

  const fetchTodos = async () => {
    if (!token) return

    setLoadingTodos(true)
    try {
      const response = await fetch(`${API_URL}/todos`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.status === 'success') {
        setTodos(data.data)
      } else {
        throw new Error('讀取待辦事項失敗。')
      }
    } catch (error) {
      console.error('Fetch todos failed:', error)
      showToast('讀取待辦事項失敗，請確認後端服務是否已啟動。', 'error')
    } finally {
      setLoadingTodos(false)
    }
  }

  const addTodo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !newTodoTitle.trim() || submittingTodo) return

    const title = newTodoTitle.trim()
    const optimisticTodo: Todo = {
      id: `temp-${Date.now()}`,
      title,
      is_completed: false,
    }

    setSubmittingTodo(true)
    setNewTodoTitle('')
    setTodos((current) => [optimisticTodo, ...current])

    try {
      const response = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      })

      const data = await response.json()
      if (data.status !== 'success') {
        throw new Error('新增待辦事項失敗。')
      }

      const savedTodo = data.data as Todo | undefined
      if (savedTodo?.id) {
        setTodos((current) =>
          current.map((todo) => (todo.id === optimisticTodo.id ? savedTodo : todo)),
        )
      } else {
        await fetchTodos()
      }

      showToast('待辦事項已新增。', 'success')
    } catch (error) {
      setTodos((current) => current.filter((todo) => todo.id !== optimisticTodo.id))
      setNewTodoTitle(title)
      console.error('Add todo failed:', error)
      showToast('新增待辦事項失敗。', 'error')
    } finally {
      setSubmittingTodo(false)
    }
  }

  const toggleComplete = async (todoId: string, currentStatus: boolean) => {
    if (!token || busyTodoIds.includes(todoId)) return

    const previousTodos = todos
    markTodoBusy(todoId)
    setTodos((current) =>
      current.map((todo) =>
        todo.id === todoId ? { ...todo, is_completed: !currentStatus } : todo,
      ),
    )

    try {
      const response = await fetch(`${API_URL}/todos/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_completed: !currentStatus }),
      })

      const data = await response.json()
      if (data.status !== 'success') {
        throw new Error('更新待辦事項失敗。')
      }

      showToast(!currentStatus ? '已標記為完成。' : '已標記為未完成。', 'success')
    } catch (error) {
      setTodos(previousTodos)
      console.error('Toggle todo failed:', error)
      showToast('更新待辦事項失敗。', 'error')
    } finally {
      unmarkTodoBusy(todoId)
    }
  }

  const deleteTodo = async (todoId: string) => {
    if (!token || busyTodoIds.includes(todoId)) return
    if (!window.confirm('確定要刪除這筆待辦事項嗎？')) return

    const previousTodos = todos
    markTodoBusy(todoId)
    setTodos((current) => current.filter((todo) => todo.id !== todoId))

    try {
      const response = await fetch(`${API_URL}/todos/${todoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.status !== 'success') {
        throw new Error('刪除待辦事項失敗。')
      }

      showToast('待辦事項已刪除。', 'success')
    } catch (error) {
      setTodos(previousTodos)
      console.error('Delete todo failed:', error)
      showToast('刪除待辦事項失敗。', 'error')
    } finally {
      unmarkTodoBusy(todoId)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : toast.tone === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-sky-200 bg-sky-50 text-sky-800'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {!token ? (
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
          <div className="mb-8 space-y-3">
            <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
              Tailwind 已啟用
            </span>
            <h1 className="text-3xl font-bold tracking-tight">Todo List Login</h1>
            <p className="text-sm leading-6 text-slate-600">
              如果你看到圓角卡片、陰影和藍色標籤，就代表 Tailwind CSS 已經成功載入。
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="test@example.com"
                required
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="請輸入密碼"
                required
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              登入並取得 Token
            </button>
          </form>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                  已登入
                </span>
                <h1 className="text-3xl font-bold tracking-tight">Todo Dashboard</h1>
                <p className="text-sm text-slate-600">
                  新增、勾選、刪除都已改成樂觀 UI 更新，畫面會先即時反應。
                </p>
              </div>

              <button
                onClick={fetchTodos}
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                {loadingTodos ? '讀取中...' : '重新載入待辦事項'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <form onSubmit={addTodo} className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(event) => setNewTodoTitle(event.target.value)}
                placeholder="輸入新的待辦事項"
                className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
              <button
                type="submit"
                disabled={submittingTodo}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingTodo ? '新增中...' : '新增 Todo'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">待辦清單</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                共 {todos.length} 筆
              </span>
            </div>

            {todos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
                目前還沒有待辦事項，先新增一筆看看。
              </div>
            ) : (
              <ul className="space-y-3">
                {todos.map((todo) => {
                  const isBusy = busyTodoIds.includes(todo.id)
                  const isOptimistic = todo.id.startsWith('temp-')

                  return (
                    <li
                      key={todo.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-opacity md:flex-row md:items-center"
                    >
                      <label className="flex flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={todo.is_completed}
                          disabled={isBusy || isOptimistic}
                          onChange={() => toggleComplete(todo.id, todo.is_completed)}
                          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                        />
                        <span
                          className={
                            todo.is_completed
                              ? 'text-slate-400 line-through'
                              : 'text-slate-800'
                          }
                        >
                          {todo.title}
                        </span>
                        {isOptimistic ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                            同步中
                          </span>
                        ) : null}
                      </label>

                      <button
                        onClick={() => deleteTodo(todo.id)}
                        disabled={isBusy || isOptimistic}
                        className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        刪除
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default App
