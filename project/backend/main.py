from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import paho.mqtt.client as mqtt
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC_PREFIX = "robot/control/"

mqtt_client = mqtt.Client()
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
mqtt_client.loop_start()

class ServoCommand(BaseModel):
    joint: str
    angle: int


@app.post("/update")
def update_servo(cmd: ServoCommand):

    topic = MQTT_TOPIC_PREFIX + cmd.joint

    payload = {
        "joint": cmd.joint,
        "angle": cmd.angle
    }

    mqtt_client.publish(topic, json.dumps(payload))

    print("ส่งไป MQTT:", topic, payload)

    return {"status": "sent", "topic": topic, "data": payload}