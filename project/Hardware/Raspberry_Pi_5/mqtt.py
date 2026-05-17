import paho.mqtt.client as mqtt
import time
import random

class RobotController:
    # ใช้ HiveMQ เพื่อให้ตรงกับ ESP32 และหน้าเว็บ
    def __init__(self, broker="broker.hivemq.com", port=1883):
        self.broker = broker
        self.port = port
        self.topic_prefix = "robot/control/"
        
        # สุ่ม Client ID
        client_id = f'robot-pi-{random.randint(0, 1000)}'
        
        try:
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
        except:
            self.client = mqtt.Client(client_id=client_id)
            
        self.connected = False
        
    def connect(self):
        print(f"[MQTT] กำลังเชื่อมต่อที่ {self.broker}...")
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            self.connected = True
            print("[MQTT] เชื่อมต่อสำเร็จ! (Success)")
        except Exception as e:
            print(f"[MQTT] เชื่อมต่อไม่สำเร็จ: {e}")
            
    def send_angle(self, joint, angle):
        if not self.connected:
            self.connect()
            
        topic = self.topic_prefix + joint
        self.client.publish(topic, int(angle))
