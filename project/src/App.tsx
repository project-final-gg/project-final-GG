import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import Sidebar from "./sidebar"
import DeepCamera from "./assets/components/DeepCamera"
import LogAlert from "./assets/components/LogAlert"
import Dashboard from "./dashboard"

function Control() {
  return (
    <div className="page-shell home-page">
      <div className="home-layout">
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

function DashboardPage() {
  return (
    <div>
      <Dashboard />
    </div>
  )
}

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.toLowerCase() === "/dashboard";

  return (
    <div className={isDashboard ? "" : "layout"}>
      {!isDashboard && <Sidebar />}

      <main className={isDashboard ? "" : "main-area"}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />   
          <Route path="/dashboard" element={<DashboardPage />} />         
          <Route path="/control" element={<Control />} />
          <Route path="/deepcam" element={<DeepCamPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App