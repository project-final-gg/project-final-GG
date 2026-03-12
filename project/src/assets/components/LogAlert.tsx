export default function LogAlert() {
  return (
    <div className="log-alert-card">

      <div className="log-alert-header">
        <span>Log Alert</span>
        <span className="bell-icon">🔔</span>
      </div>

      <div className="log-list">

        <div className="log-item success">
          <span className="log-dot green"></span>
          <div className="log-content">
            <div className="log-time">09:56:32</div>
            <div className="log-message">Move Successful.</div>
          </div>
        </div>

        <div className="log-item error">
          <span className="log-dot red"></span>
          <div className="log-content">
            <div className="log-time">09:54:44</div>
            <div className="log-message">No items found.</div>
          </div>
        </div>

      </div>

      <button className="view-all-btn">View All +</button>

    </div>
  );
}
