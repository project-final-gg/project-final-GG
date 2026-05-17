import time
 
class RobotMotions:
    def __init__(self, mqtt_client):
        self.mqtt = mqtt_client
    def move_all(self, base, shoulder, elbow, wrist_v=90, wrist_r=90, gripper=None):
        self.mqtt.send_angle("base", base)
        self.mqtt.send_angle("shoulder", shoulder)
        self.mqtt.send_angle("elbow", elbow)
        self.mqtt.send_angle("wrist_v", wrist_v)
        self.mqtt.send_angle("wrist_r", wrist_r)
        if gripper is not None:
            self.mqtt.send_angle("gripper", gripper)
 
    def go_to_scan(self):
        print("[Motion] Scan")
        self.move_all(base=90, shoulder=71, elbow=47, wrist_v=142, wrist_r=90, gripper=90)
 
    def go_to_park(self):
        print("[Motion] Park")
        self.move_all(base=90, shoulder=0, elbow=0, wrist_v=180, gripper=0)
 
    def grab_action(self):
        print("[Motion] Gripper")
        self.mqtt.send_angle("gripper", 0)