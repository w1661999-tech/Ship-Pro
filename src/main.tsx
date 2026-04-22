import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Log environment variables for debugging
console.log('🔍 Environment Variables:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ موجود' : '✗ مفقود',
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  MODE: import.meta.env.MODE,
})

const root = document.getElementById('root')

if (!root) {
  document.body.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; background: #f0f0f0;">
      <h1 style="color: red; margin-bottom: 20px;">❌ خطأ حرج: عنصر #root غير موجود</h1>
      <p>يرجى التحقق من ملف index.html</p>
    </div>
  `
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
