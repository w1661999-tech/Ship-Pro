import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('root')

if (!root) {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Arial,sans-serif;background:#f8fafc;padding:24px;text-align:center;direction:rtl;">
      <h1 style="color:#dc2626;margin-bottom:16px;">❌ خطأ حرج: عنصر التطبيق غير موجود</h1>
      <p style="color:#475569;max-width:480px;line-height:1.8;">تعذر تهيئة النظام لأن عنصر <code>#root</code> غير موجود داخل الصفحة الحالية.</p>
    </div>
  `
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  window.dispatchEvent(new CustomEvent('ship-pro:app-mounted'))
}
