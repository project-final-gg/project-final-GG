import cv2
import time
import os
from project.Hardware.Raspberry_Pi_5.camera import CameraManager
from project.Hardware.Raspberry_Pi_5.ai_coral import AIEngine 
from project.Hardware.Raspberry_Pi_5.mqtt import RobotController 
from project.Hardware.Raspberry_Pi_5.motions import RobotMotions  
from project.Hardware.Raspberry_Pi_5.behavior import RobotBehavior
from project.Hardware.Raspberry_Pi_5.workspace import WorkspaceManager  

def main():
    ai = AIEngine(
        model_path='/home/shiina/object_detection/models/object_detection.tflite',
        label_path='/home/shiina/object_detection/models/object.txt'
    )
    cam = CameraManager() 
    mqtt_client = RobotController()
    mqtt_client.connect()
    
    workspace = WorkspaceManager() 
    motions = RobotMotions(mqtt_client)
    brain = RobotBehavior(motions, workspace) 

    def on_message(client, userdata, msg):
        command = msg.payload.decode()
        brain.target_name = command 
        print(f"รับคำสั่งล็อกเป้าใหม่: {command}")

    mqtt_client.client.subscribe("robot/command/target")
    mqtt_client.client.on_message = on_message

    motions.go_to_park()
    prev_time = 0

    try:
        while True:
            frame, depth_array = cam.get_frames()
            if frame is None: continue 

            #  พลิกภาพให้ตรงกับสายตาก่อนให้ AI หรือ ArUco มองเห็น!
            frame = cv2.flip(frame, -1)

            #  หาพิกัด ArUco และวาดกรอบโต๊ะสีน้ำเงิน
            is_calibrated, pts_src = workspace.update_matrix(frame)
            workspace.draw_workspace(frame, pts_src)

            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            detections = ai.detect(img_rgb)
            
            current_dist = 0

            for obj in detections:
                xmin, ymin, xmax, ymax = obj['box']
                cx, cy = obj['cx'], obj['cy']
                cid = obj['class_id']
                
                name = ai.labels.get(cid, "N/A")
                color = ai.colors.get(cid, (0, 255, 0)) 
                
                dist = cam.get_smart_depth(depth_array, xmin, ymin, xmax, ymax)
                is_target = (name == brain.target_name)
                
                thickness = 4 if is_target else 2
                if is_target: current_dist = dist 
                
                cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, thickness)
                cv2.circle(frame, (cx, cy), 4, color, -1)
                
                # แสดงระยะเซนติเมตรบนหัววัตถุ แทน pixel
                real_x, real_y = workspace.get_cm_coords(cx, cy)
                label = f"{name} (X:{real_x:.1f}, Y:{real_y:.1f})" if is_calibrated else name
                cv2.putText(frame, label, (xmin, ymin-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, thickness)

            brain.execute(detections, ai.labels, current_dist, frame)

            curr_time = time.time()
            fps = 1 / (curr_time - prev_time) if prev_time > 0 else 0
            prev_time = curr_time
            cv2.putText(frame, f"FPS: {int(fps)} | Target: {brain.target_name}", 
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            
            cv2.imshow("AI Command System", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): break
    finally:
        cam.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
