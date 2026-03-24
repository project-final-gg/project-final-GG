import { useState, useRef } from "react"

const motors = [
  { name: "Position 1", angle: 90 },
  { name: "Position 2", angle: 90 },
  { name: "Position 3", angle: 90 },
  { name: "Position 4", angle: 90 },
  { name: "Position 5", angle: 90 },
  { name: "Position 6", angle: 45 },
]

export default function Control() {
  const [angles, setAngles] = useState(
    motors.reduce((acc, m) => {
      acc[m.name] = m.angle
      return acc
    }, {} as Record<string, number>)
  )

  const timers = useRef<Record<string, any>>({})

  const handleChange = (name: string, value: number) => {
    setAngles(prev => ({
      ...prev,
      [name]: value,
    }))

    clearTimeout(timers.current[name])

    timers.current[name] = setTimeout(() => {
      const data = {
        joint: name,
        angle: name === "Position 6" ? 90 - value : value,
      }

      console.log("📤 Sending:", data)

      fetch("http://localhost:8000/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then(res => res.json())
        .then(res => console.log("📥 Response:", res))
        .catch(err => console.error("❌ Error:", err))
    }, 100)
  }

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
            src="https://i0.wp.com/www.smeweb.com/wp-content/uploads/2021/10/robot-arm-g7cfe675f7_640.png"
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
              <span>{angles[motor.name]}</span>
            </div>

            <input
              type="range"
              min={0}
              max={motor.name === "Position 6" ? 90 : 180}
              value={angles[motor.name]}
              onChange={(e) =>
                handleChange(motor.name, Number(e.target.value))
              }
              className="motor-slider"
            />
          </div>
        ))}
      </div>
    </div>
  )
}