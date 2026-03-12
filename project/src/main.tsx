import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Sidebar from './sidebar.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="flex"><Sidebar />
      <div className="flex flex-1 justify-end"><App /></div>
    </div>
  </StrictMode>,
)

