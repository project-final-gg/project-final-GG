import { Routes, Route, Navigate } from "react-router-dom"
import Dashboard from "./dashboard"

function DashboardPage() {
  return (
    <div>
      <Dashboard />
    </div>
  )
}

function App() {
  return (
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />   
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
  );
}

export default App