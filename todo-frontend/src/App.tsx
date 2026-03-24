import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// 1. 初始化 Supabase 前端連線
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  // 用來記錄使用者輸入的帳號密碼
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // 用來記錄登入狀態與 Token
  const [token, setToken] = useState<string | null>(null)

  // 新增一個狀態來裝待辦事項清單
  const [todos, setTodos] = useState<any[]>([])

  // 處理登入按鈕點擊的函數
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // 防止表單送出時重新整理頁面
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error

      // 登入成功！把拿到的 Token 存起來
      console.log("登入成功！Token:", data.session.access_token)
      setToken(data.session.access_token)
      alert("登入成功！")

    } catch (error: any) {
      alert("登入失敗：" + error.message)
    }
  }

// 呼叫 FastAPI 的函數
  const fetchTodos = async () => {
    try {
      console.log("準備帶著 Token 去敲 FastAPI 的門...")
      
      // 注意：這裡的網址要填你 FastAPI 運行的地方
      const response = await fetch('http://127.0.0.1:8000/todos', {
        method: 'GET',
        headers: {
          // 最重要的一步：把 Token 放在 Header 裡面遞給守衛
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      console.log("API 回傳結果:", data)
      
      if (data.status === 'success') {
        setTodos(data.data)
        alert("成功抓到資料啦！")
      }

    } catch (error: any) {
      console.error("呼叫 API 慘遭失敗:", error)
      alert("請按下 F12 打開開發者工具，看看 Console 裡面的紅色錯誤訊息！")
    }
  }
  
  // 如果已經有 Token，代表登入成功，顯示主畫面
  if (token) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>✅ 登入成功！</h1>
        <p>你的 Token 已經準備好了。</p>
        <button onClick={fetchTodos} style={{ padding: '10px', fontSize: '16px', background: '#646cff', color: 'white' }}>
          呼叫 FastAPI 抓取待辦事項
        </button>
        
        {/* 把抓到的資料印出來看看 */}
        <pre style={{ textAlign: 'left', background: '#222', padding: '10px', marginTop: '20px' }}>
          {JSON.stringify(todos, null, 2)}
        </pre>
      </div>
    )
  }
  // 如果沒有 Token，顯示登入表單
  return (
    <div style={{ padding: '20px', maxWidth: '300px', margin: '0 auto' }}>
      <h2>登入你的 Todo List</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="email" 
          placeholder="測試信箱 (例如 test@example.com)" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="密碼" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">登入取得通行證</button>
      </form>
    </div>
  )
}

export default App