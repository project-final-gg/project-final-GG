import { Routes, Route } from "react-router-dom"
import Sidebar from "./sidebar"
import LogAlert from "./assets/components/LogAlert"
import DeepCamera from "./assets/components/DeepCamera"

function Home() {
  return (
    <>
      <div className="content"></div>
      <LogAlert />
    </>
  )
}

function DeepCamPage() {
  return (
    <div className="content">
      <DeepCamera />
    </div>
  )
}

function App() {
  return (
    <div className="layout">

      <Sidebar />

      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/deepcam" element={<DeepCamPage />} />
      </Routes>

    </div>
  )
}

export default App