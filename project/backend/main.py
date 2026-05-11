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
# API
# ===============================
class ServoCommand(BaseModel):
    joint: str
    angle: int

@app.post("/update")
def update_servo(cmd: ServoCommand):
    topic = f"{MQTT_TOPIC_PREFIX}{cmd.joint}"
    mqtt_client.publish(topic, str(cmd.angle))
    return {"status": "sent"}

class TargetCommand(BaseModel):
    target: str

@app.post("/set_target")
def set_target(cmd: TargetCommand):
    mqtt_client.publish(MQTT_TARGET_TOPIC, cmd.target)
    return {"status": "sent"}


# ===============================
# WebSocket (FIX PATH)
# ===============================
browser_ws: WebSocket | None = None
pi_ws: WebSocket | None = None
ai_ws: WebSocket | None = None


# 🔵 PI
@app.websocket("/ws/pi")
async def ws_pi(ws: WebSocket):
    global pi_ws, browser_ws

    await ws.accept()
    print("🟢 pi connected")

    if pi_ws:
        await pi_ws.close()
    pi_ws = ws

    try:
        while True:
            raw = await ws.receive_text()
            print("📩 pi ->", raw[:50])

            if browser_ws:
                await browser_ws.send_text(raw)

    except WebSocketDisconnect:
        print("❌ pi disconnected")
    finally:
        if pi_ws is ws:
            pi_ws = None


# 🟢 BROWSER
@app.websocket("/ws/browser")
async def ws_browser(ws: WebSocket):
    global pi_ws, browser_ws

    await ws.accept()
    print("🟢 browser connected")

    if browser_ws:
        await browser_ws.close()
    browser_ws = ws

    try:
        while True:
            raw = await ws.receive_text()
            print("📩 browser ->", raw[:50])

            if pi_ws:
                await pi_ws.send_text(raw)

    except WebSocketDisconnect:
        print("❌ browser disconnected")
    finally:
        if browser_ws is ws:
            browser_ws = None

@app.websocket("/ws/ai")
async def ws_ai(ws: WebSocket):
    global ai_ws, pi_ws

    await ws.accept() 
    print("🧠 ai connected") 
    
    if ai_ws:
        await ai_ws.close()
        ai_ws = ws

    try:
        while True:
            raw = await ws.receive_text()
            print("📩 ai ->", raw)

            if pi_ws:
                await pi_ws.send_text(raw)

    except WebSocketDisconnect:
        print("❌ browser disconnected")
    finally:
        if ai_ws is ws:
            ai_ws = None
