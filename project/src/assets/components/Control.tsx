import { useState, useEffect } from "react";

const motorConfig = [
  { name: "base", max: 180 },
  { name: "shoulder", max: 180 },
  { name: "elbow", max: 180 },
  { name: "wrist_v", max: 180 },
  { name: "wrist_r", max: 180 },
  { name: "gripper", max: 90 },
];

const defaultAngles: Record<string, number> = {
  base: 90,
  shoulder: 0,
  elbow: 0,
  wrist_v: 180,
  wrist_r: 90,
  gripper: 45,
};

export default function Control({ sendData, initialAngles }: any) {
  const [angles, setAngles] = useState(initialAngles);
  const [prevAngles, setPrevAngles] = useState(initialAngles);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setAngles(initialAngles);
    setPrevAngles(initialAngles);
  }, [initialAngles]);

  const handleChange = (name: string, value: number) => {
    setAngles((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleAction = (name: string) => {
    sendData(name, angles[name], prevAngles[name]);
    setPrevAngles((prev: any) => ({ ...prev, [name]: angles[name] }));
  };

  const handleReset = async () => {
    setIsResetting(true);

    for (const [name, value] of Object.entries(defaultAngles)) {
      await sendData(name, value, angles[name] || 90);
    }
    setAngles(defaultAngles);
    setPrevAngles(defaultAngles);

    setTimeout(() => {
      setIsResetting(false);
    }, 1000);

  };

  const isActive = Object.entries(angles).some(([key, value]) => value !== defaultAngles[key]);

  return (
    <div className="control-card">
      <div className="section-pill">Robotic Arm Status</div>
      <div className="robot-preview">
        <div className="robot-image-box">
          <img
            src="https://i0.wp.com/www.smeweb.com/wp-content/uploads/2021/10/robot-arm-g7cfe675f7_640.png"
            alt="Robotic Arm"
          />
        </div>
      </div>
      <div className="motor-list">
        {motorConfig.map((motor, index) => (
          <div key={index} className="motor-row">
            <div className="motor-info">
              <span>{motor.name}</span>
              <span>{angles[motor.name] ?? 0}</span>
            </div>
            <input
              type="range"
              min={0}
              max={motor.max}
              value={angles[motor.name] ?? 0}
              onChange={(e) => handleChange(motor.name, Number(e.target.value))}
              onMouseUp={() => handleAction(motor.name)}
              onTouchEnd={() => handleAction(motor.name)}
              className="motor-slider"
            />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={handleReset}
            disabled={isResetting}
            style={{
              backgroundColor: isResetting ? "#ff5252" : "#e0e0e0",
              color: isResetting ? "#fff" : "#757575",
              cursor: isResetting ? "not-allowed" : "pointer",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: isResetting ? "bold" : "normal",
              border: "none",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseOver={(e) => {
              if (!isResetting) {
                e.currentTarget.style.backgroundColor = "#ff5252"; 
                e.currentTarget.style.color = "#fff";
              }
            }}
            onMouseOut={(e) => {
              if (!isResetting) {
                e.currentTarget.style.backgroundColor = isActive ? "#ffb74d" : "#e0e0e0";
                e.currentTarget.style.color = isActive ? "#000" : "#757575";
              }
            }}
          >
            {isResetting ? "⏳ RESETTING..." : "🔄 RESET ALL"}
          </button>
        </div>
      </div>
    </div>
  );
}