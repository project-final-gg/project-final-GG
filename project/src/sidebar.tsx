import { NavLink } from "react-router-dom"

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>Robotic Arm</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/home"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Home
        </NavLink>

        <NavLink
          to="/deepcam"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Deep Camera
        </NavLink>
      </nav>
    </aside>
  )
}