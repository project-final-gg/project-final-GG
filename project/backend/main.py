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
# MQTT CONFIG
# ===============================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883

MQTT_TOPIC_PREFIX = "robot/control/"
MQTT_TARGET_TOPIC = "robot/command/target"
MQTT_STATUS_TOPIC = "robot/status"

# ===============================
# GLOBAL STATE
# ===============================
esp32_status = {
    "status": "offline"
}

browser_ws: WebSocket | None = None
pi_ws: WebSocket | None = None
ai_ws: WebSocket | None = None

# ===============================
# MQTT
# ===============================
mqtt_client = mqtt.Client()


def on_connect(client, userdata, flags, rc):

    print("✅ MQTT connected")

    client.subscribe(MQTT_STATUS_TOPIC)

    print(f"📡 Subscribed -> {MQTT_STATUS_TOPIC}")


def on_message(client, userdata, msg):

    topic = msg.topic
    payload = msg.payload.decode()

    print(f"📩 MQTT {topic} -> {payload}")

    # ESP32 STATUS
    if topic == MQTT_STATUS_TOPIC:

        esp32_status["status"] = payload

        print(f"🤖 ESP32 STATUS : {payload}")


mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
mqtt_client.loop_start()

# ===============================
# API MODELS
# ===============================
class ServoCommand(BaseModel):
    joint: str
    angle: int


class TargetCommand(BaseModel):
    target: str


# ===============================
# API ROUTES
# ===============================
@app.post("/update")
def update_servo(cmd: ServoCommand):

    topic = f"{MQTT_TOPIC_PREFIX}{cmd.joint}"

    mqtt_client.publish(topic, str(cmd.angle))

    print(f"🚀 SEND {topic} -> {cmd.angle}")

    return {
        "status": "sent"
    }


@app.post("/set_target")
def set_target(cmd: TargetCommand):

    mqtt_client.publish(MQTT_TARGET_TOPIC, cmd.target)

    print(f"🎯 TARGET -> {cmd.target}")

    return {
        "status": "sent"
    }


@app.get("/status")
def get_status():

    return {
        "esp32_status": esp32_status["status"]
    }


# ===============================
# PI SOCKET
# ===============================
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


# ===============================
# BROWSER SOCKET
# ===============================
@app.websocket("/ws/browser")
async def ws_browser(ws: WebSocket):

    global browser_ws, pi_ws

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


# ===============================
# AI SOCKET
# ===============================
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

        print("❌ ai disconnected")

    finally:

        if ai_ws is ws:
            ai_ws = None