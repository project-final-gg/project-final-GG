import json
import time

from fastapi import FastAPI
from fastapi import WebSocket
from fastapi import WebSocketDisconnect

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

import paho.mqtt.client as mqtt


app = FastAPI()

# =====================================
# CORS
# =====================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================
# MQTT
# =====================================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883

MQTT_TOPIC_PREFIX = "robot/control/"
MQTT_TARGET_TOPIC = "robot/command/target"
MQTT_STATUS_TOPIC = "robot/status"

# =====================================
# GLOBAL STATE
# =====================================
browser_ws = None
pi_ws = None
ai_ws = None

esp32_status = {
    "status": "offline"
}

last_status_time = 0
STATUS_TIMEOUT = 5

# =====================================
# LOG
# =====================================
logs = []
MAX_LOGS = 200


def add_log(log_type, source, message):

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    msg = (
        f"[{timestamp}] "
        f"[{log_type}] "
        f"[{source}] "
        f"{message}"
    )

    print(msg)

    logs.append({
        "time": timestamp,
        "type": log_type,
        "source": source,
        "message": message
    })

    if len(logs) > MAX_LOGS:
        logs.pop(0)


# =====================================
# SAFE WS HELPERS
# =====================================
async def safe_close(ws, name="ws"):

    if not ws:
        return

    try:

        await ws.close()

        add_log(
            "ws",
            name,
            "closed"
        )

    except Exception as e:

        add_log(
            "error",
            name,
            f"close failed -> {e}"
        )


async def safe_send(ws, data, name="ws"):

    if not ws:
        return False

    try:

        await ws.send_text(data)

        return True

    except Exception as e:

        add_log(
            "error",
            name,
            f"send failed -> {e}"
        )

        return False


# =====================================
# MQTT
# =====================================
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

    if topic == MQTT_STATUS_TOPIC:

        last_status_time = time.time()

        esp32_status["status"] = payload

        add_log(
            "status",
            "esp32",
            payload
        )


mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

mqtt_client.connect(
    MQTT_BROKER,
    MQTT_PORT,
    60
)

mqtt_client.loop_start()

# =====================================
# API MODELS
# =====================================
class ServoCommand(BaseModel):

    joint: str
    angle: int


class TargetCommand(BaseModel):

    target: str


# =====================================
# API ROUTES
# =====================================
@app.post("/update")
def update_servo(cmd: ServoCommand):

    topic = f"{MQTT_TOPIC_PREFIX}{cmd.joint}"

    mqtt_client.publish(
        topic,
        str(cmd.angle)
    )

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

    mqtt_client.publish(
        MQTT_TARGET_TOPIC,
        cmd.target
    )

    add_log(
        "target",
        "ai",
        cmd.target
    )

    return {
        "status": "sent"
    }


@app.get("/health")
def health():

    esp_online = (
        time.time() - last_status_time
        <= STATUS_TIMEOUT
    )

    return {

        "api": "online",

        "esp32": (
            "online"
            if esp_online
            else "offline"
        ),

        "browser_ws": browser_ws is not None,
        "pi_ws": pi_ws is not None,
        "ai_ws": ai_ws is not None,
    }


# =====================================
# PI SOCKET
# =====================================
@app.websocket("/ws/pi")
async def ws_pi(ws: WebSocket):

    global pi_ws

    await ws.accept()

    add_log(
        "ws",
        "pi",
        "connected"
    )

    old_ws = pi_ws

    pi_ws = ws

    if old_ws and old_ws != ws:
        await safe_close(old_ws, "old-pi")

    try:

        while True:

            raw = await ws.receive_text()

            add_log(
                "ws",
                "pi",
                raw[:50]
            )

            await safe_send(
                browser_ws,
                raw,
                "browser"
            )

    except WebSocketDisconnect:

        add_log(
            "ws",
            "pi",
            "disconnect"
        )

    except Exception as e:

        add_log(
            "error",
            "pi",
            str(e)
        )

    finally:

        if pi_ws == ws:
            pi_ws = None


# =====================================
# BROWSER SOCKET
# =====================================
@app.websocket("/ws/browser")
async def ws_browser(ws: WebSocket):

    global browser_ws

    await ws.accept()

    add_log(
        "ws",
        "browser",
        "connected"
    )

    old_ws = browser_ws

    browser_ws = ws

    if old_ws and old_ws != ws:
        await safe_close(
            old_ws,
            "old-browser"
        )

    try:

        while True:

            raw = await ws.receive_text()

            add_log(
                "ws",
                "browser",
                raw[:50]
            )

            await safe_send(
                pi_ws,
                raw,
                "pi"
            )

    except WebSocketDisconnect:

        add_log(
            "ws",
            "browser",
            "disconnect"
        )

    except Exception as e:

        add_log(
            "error",
            "browser",
            str(e)
        )

    finally:

        if browser_ws == ws:
            browser_ws = None


# =====================================
# AI SOCKET
# =====================================
@app.websocket("/ws/ai")
async def ws_ai(ws: WebSocket):

    global ai_ws

    await ws.accept()

    add_log(
        "ws",
        "ai",
        "connected"
    )

    old_ws = ai_ws

    ai_ws = ws

    if old_ws and old_ws != ws:
        await safe_close(
            old_ws,
            "old-ai"
        )

    try:

        while True:

            raw = await ws.receive_text()

            add_log(
                "ws",
                "ai",
                raw[:50]
            )

            await safe_send(
                pi_ws,
                raw,
                "pi"
            )

    except WebSocketDisconnect:

        add_log(
            "ws",
            "ai",
            "disconnect"
        )

    except Exception as e:

        add_log(
            "error",
            "ai",
            str(e)
        )

    finally:

        if ai_ws == ws:
            ai_ws = None