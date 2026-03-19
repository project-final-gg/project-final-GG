import paho.mqtt.client as mqtt
import time

MQTT_BROKER = "100.73.73.42"
MQTT_PORT = 1883
TOPIC = "robot/control/#"   # รับทุก joint

def on_connect(client, userdata, flags, rc):
    print("Connected with result code", rc)
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    joint = msg.topic.split("/")[-1]
    angle = msg.payload.decode()

    print(f"\n ได้รับคำสั่ง -> Joint: {joint}")
    print(f" Servo กำลังหมุนไปที่ {angle} องศา...")
    time.sleep(1)
    print(" Servo ถึงตำแหน่งแล้ว\n")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()