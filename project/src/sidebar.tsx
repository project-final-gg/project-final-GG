import { NavLink } from "react-router-dom"

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>Robotic Arm</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/Control"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Control
        </NavLink>

        <NavLink
          to="/deepcam"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Deep Camera
        </NavLink>

        <NavLink
          to="/Dashboard"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Dashboard
        </NavLink>
      </nav>
    </aside>
  )
}