import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import paho.mqtt.client as mqtt

app = FastAPI()

# ===============================
# CORS
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# MQTT
# ===============================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC_PREFIX = "robot/control/"
MQTT_TARGET_TOPIC = "robot/command/target"

mqtt_client = mqtt.Client()
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
mqtt_client.loop_start()

print("✅ MQTT connected")


# ===============================
# Servo API
# ===============================
class ServoCommand(BaseModel):
    joint: str
    angle: int


@app.post("/update")
def update_servo(cmd: ServoCommand):
    topic = f"{MQTT_TOPIC_PREFIX}{cmd.joint}"
    mqtt_client.publish(topic, str(cmd.angle))
    print(f"➡️ MQTT -> {topic} = {cmd.angle}")
    return {"status": "sent", "topic": topic, "angle": cmd.angle}


# ===============================
# AI TARGET API
# ===============================
class TargetCommand(BaseModel):
    target: str


@app.post("/set_target")
def set_target(cmd: TargetCommand):
    mqtt_client.publish(MQTT_TARGET_TOPIC, cmd.target)
    print(f"➡️ MQTT -> {MQTT_TARGET_TOPIC} = {cmd.target}")
    return {"status": "sent", "target": cmd.target}


# ===============================
# WebSocket Signaling (pure pass-through)
# ===============================
# แยก dict ตาม role — รองรับกรณีมี tab หลายตัวได้ในอนาคต
# ตอนนี้ใช้ single slot ต่อ role ก็พอ
browser_ws: WebSocket | None = None
pi_ws: WebSocket | None = None


@app.websocket("/ws/{client}")
async def ws_endpoint(ws: WebSocket, client: str):
    global browser_ws, pi_ws

    if client not in ("browser", "pi"):
        await ws.close(code=1008)
        return

    await ws.accept()
    print(f"🟢 {client} connected")

    # ปิด connection เก่าของ role นี้ถ้ามี (กันตัวเก่าค้าง)
    if client == "browser":
        if browser_ws is not None:
            try:
                await browser_ws.close()
            except Exception:
                pass
        browser_ws = ws
    else:  # pi
        if pi_ws is not None:
            try:
                await pi_ws.close()
            except Exception:
                pass
        pi_ws = ws

    try:
        while True:
            raw = await ws.receive_text()

            # แค่ log ดูว่ามีอะไรผ่าน ไม่แก้ payload
            try:
                msg_type = json.loads(raw).get("type", "?")
            except Exception:
                msg_type = "?"
            print(f"📩 {client} -> {msg_type}")

            # =========================
            # FORWARD ดิบๆ ไม่แก้ format
            # =========================
            target = pi_ws if client == "browser" else browser_ws

            if target is None:
                print(f"⚠️ no peer for {client}, dropping {msg_type}")
                continue

            try:
                await target.send_text(raw)
            except Exception as e:
                print(f"❌ forward error: {e}")

    except WebSocketDisconnect:
        print(f"❌ {client} disconnected")
    except Exception as e:
        print(f"❌ {client} error: {e}")
    finally:
        if client == "browser" and browser_ws is ws:
            browser_ws = None
        elif client == "pi" and pi_ws is ws:
            pi_ws = None
        print(f"🧹 {client} slot cleared")