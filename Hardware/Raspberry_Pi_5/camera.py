from primesense import openni2
import numpy as np
import cv2

class CameraManager:
    # DEPTH
    def __init__(self, depth_lib_path="/home/shiina/object_detection/AstraSDK/lib/Plugins/openni2"):
        openni2.initialize(depth_lib_path)
        self.dev = openni2.Device.open_any()
        
        self.depth_stream = self.dev.create_stream(openni2.SENSOR_DEPTH) 
        self.depth_stream.start()
        
        # RGB
        self.cap = None
        for i in range(5):
            temp_cap = cv2.VideoCapture(i)
            if temp_cap.isOpened():
                ret, frame = temp_cap.read()
                if ret and frame is not None and len(frame.shape) == 3:
                    self.cap = temp_cap
                    self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    break
            temp_cap.release()
            
        if not self.cap:
            raise Exception("ไม่พบกล้อง")
        
    def get_frames(self):
        ret, frame = self.cap.read()
        if not ret:
            return None, None
            
        depth_array = np.zeros((480, 640), dtype=np.uint16)
        
        try:
            d_frame = self.depth_stream.read_frame()
            d_data = d_frame.get_buffer_as_uint16()
            depth_array = np.frombuffer(d_data, dtype=np.uint16).reshape((480, 640)) # แก้ dtype.np เป็น dtype=np
        except:
            pass
            
        return frame, depth_array
        
    def get_smart_depth(self, depth_array, xmin, ymin, xmax, ymax): 
        h_img, w_img = depth_array.shape
        w_box, h_box = xmax - xmin, ymax - ymin 
        
        cx_min = max(0, xmin + int(w_box * 0.25))
        cx_max = min(w_img, xmin + int(w_box * 0.75))
        cy_min = max(0, ymin + int(h_box * 0.25))
        cy_max = min(h_img, ymin + int(h_box * 0.75))
        
        region = depth_array[cy_min:cy_max, cx_min:cx_max]
        valid_depths = region[(region > 0) & (region < 2000)]
        
        if len(valid_depths) > 0:
            return int(np.percentile(valid_depths, 20))
        return 0
        
    def release(self):
        if self.cap:
            self.cap.release()
        try:
            self.depth_stream.stop()
        except: pass
        openni2.unload()
