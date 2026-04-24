import { useEffect, useRef, useState } from "react";

export default function DeepCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [logs, setLogs] = useState<string[]>([]);

  const WS_URL = "wss://project-final-gg.onrender.com/ws/browser";
  const API_URL = "https://project-final-gg.onrender.com";

  const addLog = (msg: string) => {
    setLogs((prev) => {
      if (prev.length > 0 && prev[0].includes(msg)) return prev;
      return [`${new Date().toLocaleTimeString()} - ${msg}`, ...prev];
    });
  };

  const safeSend = (obj: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  };

  const cleanup = () => {
    if (pcRef.current) pcRef.current.close();
    if (wsRef.current) wsRef.current.close();
  };

  const connect = () => {
    cleanup();
    addLog("🔌 connecting...");

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;

    let remoteReady: boolean = false;
    let iceQueue: RTCIceCandidate[] = [];

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
      addLog("🎥 stream received");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        safeSend({ type: "candidate", data: event.candidate });
      }
    };

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      addLog("🟢 WS connected");

      pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      safeSend({ type: "offer", data: pc.localDescription });
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "answer") {
        await pc.setRemoteDescription(msg.data);
        remoteReady = true;
        addLog("✅ answer");

        for (const c of iceQueue) {
          try { await pc.addIceCandidate(c); } catch { }
        }
        iceQueue = [];
      }

      if (msg.type === "candidate") {
        const candidate = new RTCIceCandidate(msg.data);

        if (!remoteReady) {
          iceQueue.push(candidate);
        } else {
          try { await pc.addIceCandidate(candidate); } catch { }
        }
      }
    };

    ws.onclose = () => addLog("🔴 WS closed");
    ws.onerror = () => addLog("❌ WS error");
  };

  useEffect(() => {
    connect();
    return () => cleanup();
  }, []);

  // ===== AI =====
  const enableAI = () => {
    safeSend({ type: "toggle_ai", enable: true });
    addLog("🧠 AI ON");
  };

  const disableAI = () => {
    safeSend({ type: "toggle_ai", enable: false });
    addLog("💤 AI OFF");
  };

  // ===== TARGET =====
  const setTarget = async (name: string) => {
    setActive(name);
    await fetch(`${API_URL}/set_target`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: name }),
    });

    addLog("🎯 " + name);
  };

  const Object_List = [
    { label: "ไขขวง", value: "Screwdriver" },
    { label: "คีม", value: "Pliers" },
    { label: "คัตเตอร์", value: "Cutter" },
    { label: "ลูกบาศก์", value: "Cube" },
    { label: "ปากกาน้ำเงิน", value: "Blue_pen" },
    { label: "ปากกาแดง", value: "Red_pen" },
    { label: "ไขควงวัดไฟ", value: "Electrical_screwdriver" },
    { label: "ยางลบ", value: "Eraser" },
    { label: "ไขควงปากแบน", value: "Flat-head_screwdriver" },
    { label: "ปากกาตัดเส้น", value: "Line_cutting_pen" },
    { label: "คีมปากจิ้งจก", value: "Needle_nose_pliers" },
    { label: "ดินสอ", value: "Pencil" },
    { label: "คีมตัดสายไฟ", value: "Wire_cutting_pliers" }
  ];

  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="deepcam-page">

      {/* ===== CAMERA ===== */}
      <div className="deepcam-card">
        <div className="section-pill">Deep Camera</div>

        <div className="camera-box">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
          />
        </div>

        {/* CONTROL */}
        <div className="control-row">
          <button onClick={enableAI}>🧠 Enable</button>
          <button onClick={disableAI}>💤 Disable</button>
        </div>

        {/* LOG */}
        <div className="log-box">
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>

      {/* ===== OBJECT ===== */}
      <div className="object-card">
        <div className="section-pill">Object</div>

        <div className="object-tags">
          {Object_List.map((obj) => {
            const isActive = active === obj.value;
            return (
              <span
                key={obj.value}
                style={{
                  backgroundColor: isActive ? "#ffb74d" : "#e0e0e0",
                  color: isActive ? "#000" : "#757575",
                  cursor: "pointer",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: isActive ? "bold" : "normal",
                  transition: "all 0.3s ease"
                }}
                className="tag"
                onClick={() => setTarget(obj.value)}
              >
                {obj.label}
              </span>
            );
          })}

          {/* <span
            className="tag stop"
            onClick={() => setTarget("None")}
          >
            STOP
          </span> */}
        </div>

      </div>
    </div>
  );
}