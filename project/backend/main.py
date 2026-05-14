import json
import time

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

# heartbeat
last_status_time = 0
STATUS_TIMEOUT = 5

browser_ws: WebSocket | None = None
pi_ws: WebSocket | None = None
ai_ws: WebSocket | None = None

# ===============================
# LOG SYSTEM
# ===============================
logs = []
MAX_LOGS = 200


def add_log(log_type, source, message):

    timestamp = time.strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    log_item = {

        "time": timestamp,

        "type": log_type,

        "source": source,

        "message": message
    }

    print(
        f"[{timestamp}] "
        f"[{log_type}] "
        f"[{source}] "
        f"{message}"
    )

    logs.append(log_item)

    # keep latest logs only
    if len(logs) > MAX_LOGS:
        logs.pop(0)


# ===============================
# MQTT
# ===============================
mqtt_client = mqtt.Client()


def on_connect(client, userdata, flags, rc):

    add_log(
        "mqtt",
        "system",
        "connected"
    )

    client.subscribe(MQTT_STATUS_TOPIC)

    add_log(
        "mqtt",
        "system",
        f"subscribed -> {MQTT_STATUS_TOPIC}"
    )


def on_message(client, userdata, msg):

    global last_status_time

    topic = msg.topic
    payload = msg.payload.decode()

    add_log(
        "mqtt",
        topic,
        payload
    )

    # ===========================
    # ESP32 STATUS HEARTBEAT
    # ===========================
    if topic == MQTT_STATUS_TOPIC:

        # update heartbeat time
        last_status_time = time.time()

        # update internal state
        esp32_status["status"] = payload

        add_log(
            "status",
            "esp32",
            payload
        )


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

    add_log(
        "command",
        cmd.joint,
        f"angle -> {cmd.angle}"
    )

    return {
        "status": "sent"
    }


@app.post("/set_target")
def set_target(cmd: TargetCommand):

    mqtt_client.publish(MQTT_TARGET_TOPIC, cmd.target)

    add_log(
        "target",
        "ai",
        cmd.target
    )

    return {
        "status": "sent"
    }


@app.get("/status")
def get_status():

    current_status = esp32_status["status"]

    # ===========================
    # TIMEOUT CHECK
    # ===========================
    if time.time() - last_status_time > STATUS_TIMEOUT:
        current_status = "offline"

    return {
        "esp32_status": current_status
    }


# ===============================
# HEALTH CHECK
# ===============================
@app.get("/health")
def health():

    esp_online = (
        time.time() - last_status_time <= STATUS_TIMEOUT
    )

    return {

        "api": "online",

        "esp32": (
            "online"
            if esp_online
            else "offline"
        ),

        "mqtt": "connected",

        "browser_ws": browser_ws is not None,

        "pi_ws": pi_ws is not None,

        "ai_ws": ai_ws is not None,

        "last_heartbeat_sec": round(
            time.time() - last_status_time,
            2
        )
    }


# ===============================
# LOGS
# ===============================
@app.get("/logs")
def get_logs():

    return {

        "count": len(logs),

        "logs": logs
    }


# ===============================
# PI SOCKET
# ===============================
@app.websocket("/ws/pi")
async def ws_pi(ws: WebSocket):

    global pi_ws, browser_ws

    await ws.accept()

    add_log(
        "ws",
        "pi",
        "connected"
    )

    if pi_ws:
        await pi_ws.close()

    pi_ws = ws

    try:

        while True:

            raw = await ws.receive_text()

            add_log(
                "ws",
                "pi",
                f"message -> {raw[:50]}"
            )

            if browser_ws:
                await browser_ws.send_text(raw)

    except WebSocketDisconnect:

        add_log(
            "ws",
            "pi",
            "disconnected"
        )

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

    add_log(
        "ws",
        "browser",
        "connected"
    )

    if browser_ws:
        await browser_ws.close()

    browser_ws = ws

    try:

        while True:

            raw = await ws.receive_text()

            add_log(
                "ws",
                "browser",
                f"message -> {raw[:50]}"
            )

            if pi_ws:
                await pi_ws.send_text(raw)

    except WebSocketDisconnect:

        add_log(
            "ws",
            "browser",
            "disconnected"
        )

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

    add_log(
        "ws",
        "ai",
        "connected"
    )

    if ai_ws:
        await ai_ws.close()

    ai_ws = ws

    try:

        while True:

            raw = await ws.receive_text()

            add_log(
                "ws",
                "ai",
                f"message -> {raw[:50]}"
            )

            if pi_ws:
                await pi_ws.send_text(raw)

    except WebSocketDisconnect:

        add_log(
            "ws",
            "ai",
            "disconnected"
        )

    finally:

        if ai_ws is ws:
            ai_ws = None