from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import paho.mqtt.client as mqtt

app = FastAPI()

# -------------------------------
# CORS
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# MQTT Settings
# -------------------------------
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC_PREFIX = "robot/control/"

mqtt_client = mqtt.Client()
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
mqtt_client.loop_start()

# -------------------------------
# Request Schema
# -------------------------------
class ServoCommand(BaseModel):
    joint: str  # เช่น "base", "shoulder", "elbow"
    angle: int  # 0-180

# -------------------------------
# Endpoint
# -------------------------------
@app.post("/update")
def update_servo(cmd: ServoCommand):
    topic = f"{MQTT_TOPIC_PREFIX}{cmd.joint}"  # robot/control/base
    mqtt_client.publish(topic, str(cmd.angle))  # payload เป็นตัวเลขเพียว ๆ

    print(f"ส่งไป MQTT -> Topic: {topic}, Angle: {cmd.angle}")

    return {"status": "sent", "topic": topic, "angle": cmd.angle}