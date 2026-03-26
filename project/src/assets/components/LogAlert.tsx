type LogType = "info" | "success" | "error"

interface LogItem {
  time: string
  messages: string[]
  type: LogType
}

export default function LogAlert({ logs = [] }: { logs?: LogItem[] }) {
  return (
    <div className="log-alert-card">
      <div className="log-alert-header">
        <span className="section-pill">Log Alert</span>
        <span className="bell-icon">🔔</span>
      </div>

      <div className="log-list">
        {logs.length === 0 && (
          <div className="log-empty">No logs yet...</div>
        )}

        {logs.map((log, index) => (
          <div key={index} className={`log-item ${log.type}`}>
            <span
              className={`log-dot ${
                log.type === "success"
                  ? "green"
                  : log.type === "error"
                  ? "red"
                  : "yellow"
              }`}
            ></span>

            <div className="log-content">
              <div className="log-time">{log.time}</div>

              {log.messages.map((msg, i) => (
                <div key={i} className="log-message">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="view-all-btn">View All +</button>
    </div>
  )
}