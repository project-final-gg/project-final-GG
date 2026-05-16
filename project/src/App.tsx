import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./dashboard";
import HealthCheck from "./healthcheck";

function DashboardPage() {
    return (
        <div>
            <Dashboard />
        </div>
    );
}

function HealthPage() {
    return (
        <div>
            <HealthCheck />
        </div>
    );
}

function App() {

    return (

        <Routes>

            <Route
                path="/"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />

            <Route
                path="/dashboard"
                element={<DashboardPage />}
            />

            <Route
                path="/health"
                element={<HealthPage />}
            />

        </Routes>
    );
}

export default App;