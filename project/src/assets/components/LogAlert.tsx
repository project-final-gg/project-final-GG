export default function LogAlert() {
  return (
    <div className="log-alert-card">
      <div className="log-alert-header">
        <span className="section-pill">Log Alert</span>
        <span className="bell-icon">🔔</span>
      </div>

      <div className="log-list">
        <div className="log-item success">
          <span className="log-dot green"></span>
          <div className="log-content">
            <div className="log-time">09:56:32</div>
            <div className="log-message">[INFO] Moving: Position 1 → Position 2</div>
            <div className="log-message">[SUCCESS] Move completed: Position 1 → Position 2</div>
          </div>
        </div>

        <div className="log-item error">
          <span className="log-dot red"></span>
          <div className="log-content">
            <div className="log-time">09:54:44</div>
            <div className="log-message">[INFO] Moved from Position 1 to Position 2</div>
            <div className="log-message">[ERROR] Object not detected.</div>
          </div>
        </div>
      </div>

      <button className="view-all-btn">View All +</button>
    </div>
  )
}