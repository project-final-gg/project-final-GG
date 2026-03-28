import { useState } from "react"
import LogAlert from "./LogAlert"

type LogType = "info" | "success" | "error"

interface LogItem {
  time: string
  messages: string[]
  type: LogType
}

const motors = [
  { name: "base", angle: 90 },
  { name: "shoulder", angle: 90 },
  { name: "elbow", angle: 90 },
  { name: "wrist_v", angle: 90 },
  { name: "wrist_r", angle: 90 },
  { name: "gripper", angle: 45 },
]

export default function Control() {
  const [angles, setAngles] = useState(
    motors.reduce((acc, m) => {
      acc[m.name] = m.angle
      return acc
    }, {} as Record<string, number>)
  )

  const [logs, setLogs] = useState<LogItem[]>([])

  // ✅ เก็บ previous angle จริง
  const [prevAngles, setPrevAngles] = useState(
    motors.reduce((acc, m) => {
      acc[m.name] = m.angle
      return acc
    }, {} as Record<string, number>)
  )

  const getTime = () => {
    const now = new Date()
    const date = now.toLocaleDateString("en-GB")
    const time = now.toLocaleTimeString("en-GB")
    return `${date} (${time})`
  }

  const handleChange = (name: string, value: number) => {
    setAngles(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const sendData = (name: string) => {
    const value = angles[name]
    const prev = prevAngles[name]

    const data = {
      joint: name,
      angle: name === "gripper" ? 90 - value : value,
    }

    const time = getTime()

    // 🟡 INFO log
    setLogs(prevLogs => [
      {
        time,
        type: "info",
        messages: [`[INFO] Moving: ${name} ${prev} -> ${value}`],
      },
      ...prevLogs,
    ])

    fetch("http://localhost:8000/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then(res => res.json())
      .then(res => {
        setLogs(prevLogs => [
          {
            time,
            type: "success",
            messages: [
              `[INFO] Moving: ${name} ${prev} -> ${value}`,
              `[SUCCESS] Move complete`,
            ],
          },
          ...prevLogs,
        ])

        setPrevAngles(prev => ({
          ...prev,
          [name]: value,
        }))
      })
      .catch(err => {
        console.error("❌ Error:", err)

        setLogs(prevLogs => [
          {
            time,
            type: "error",
            messages: [
              `[INFO] Moving: ${name} ${prev} -> ${value}`,
              `[ERROR] Connection Failed`,
            ],
          },
          ...prevLogs,
        ])
      })
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
              onMouseUp={() => sendData(motor.name)}
              onTouchEnd={() => sendData(motor.name)}
              className="motor-slider"
            />
          </div>
        ))}
      </div>
      <LogAlert logs={logs} />
    </div>
  )
}