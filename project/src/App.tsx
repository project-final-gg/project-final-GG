import { Routes, Route, Navigate } from "react-router-dom"
import Sidebar from "./sidebar"
import LogAlert from "./assets/components/LogAlert"
import Control from "./assets/components/Control"
import DeepCamera from "./assets/components/DeepCamera"

function Home() {
  return (
    <div className="page-shell home-page">
      <div className="home-layout">
        <Control />
        <LogAlert />
      </div>
    </div>
  )
}

function DeepCamPage() {
  return (
    <div className="page-shell">
      <DeepCamera />
    </div>
  )
}

function App() {
  return (
    <div className="layout">
      <Sidebar />

      <main className="main-area">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/deepcam" element={<DeepCamPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App