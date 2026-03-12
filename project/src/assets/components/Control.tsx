const motors = [
  { name: "Motor 1", angle: 180 },
  { name: "Motor 2", angle: 180 },
  { name: "Motor 3", angle: 180 },
  { name: "Motor 4", angle: 180 },
  { name: "Motor 5", angle: 180 },
]

export default function Control() {
  return (
    <div className="control-card">
      <div className="section-pill">Robotic Arm Status</div>

      <div className="robot-preview">
        <div className="robot-status">
          <span className="status-dot"></span>
          <span>ON</span>
        </div>

        <div className="robot-image-box">
          <img
            src="https://i0.wp.com/www.smeweb.com/wp-content/uploads/2021/10/robot-arm-g7cfe675f7_640.png?fit=640%2C427&ssl=1"
            alt="Robotic Arm"
          />
        </div>
      </div>

      <div className="motor-header">
        <span>Position</span>
        <span>Angle</span>
      </div>

      <div className="motor-list">
        {motors.map((motor, index) => (
          <div key={index} className="motor-row">
            <div className="motor-info">
              <span>{motor.name}</span>
              <span>{motor.angle}</span>
            </div>

            <input
              type="range"
              min="0"
              max="180"
              defaultValue="0"
              className="motor-slider"
            />
          </div>
        ))}
      </div>
    </div>
  )
}