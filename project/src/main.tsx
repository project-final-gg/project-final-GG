import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Header from './header.tsx'
import Sidebar from './sidebar.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Header />
    <Sidebar />
  </StrictMode>,
)
