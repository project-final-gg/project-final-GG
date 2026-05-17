import cv2
import cv2.aruco as aruco
import numpy as np
 
class WorkspaceManager:
    def __init__(self):
        # ตั้งค่าระยะจริงบนโต๊ะ (เซนติเมตร)
        self.REAL_WIDTH_CM = 40.0
        self.REAL_DEPTH_CM = 23.5
        self.HALF_W = self.REAL_WIDTH_CM / 2.0
        self.X_OFFSET_CM = 0.5  # ค่า Offset ที่พี่จูนไว้ทับไขควงเป๊ะๆ
        # เตรียมตัวจับ ArUco Marker
        self.aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_4X4_1000)
        self.parameters = aruco.DetectorParameters()
        self.detector = aruco.ArucoDetector(self.aruco_dict, self.parameters)
        self.transform_matrix = None
        self.is_calibrated = False
 
    def update_matrix(self, frame):
        """ค้นหา Marker เพื่อสร้างสมการแปลงพิกัด (แบบล็อค ID แม่นยำ 100%)"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        corners, ids, rejected = self.detector.detectMarkers(gray)
 
        if ids is not None and len(ids) == 4:
            centers = {}
            for i in range(len(ids)):
                marker_id = ids[i][0]
                c = corners[i][0]
                cx = int((c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4)
                cy = int((c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4)
                centers[marker_id] = [cx, cy]
 
            # ถ้าพบครบ 4 ID ตามที่พี่เรียงไว้ (0, 1, 2, 3)
            if all(k in centers for k in (0, 1, 2, 3)):
                pts_src = np.array([centers[0], centers[1], centers[2], centers[3]], dtype=np.float32)
                # ID 0 กับ 1 จะอยู่ขอบล่างจอ (ติดกับหน้าหุ่นยนต์) เสมอ!
                pts_dst = np.array([
                    [self.HALF_W - self.X_OFFSET_CM, 0],                   # ID 0 (อยู่ล่างขวา) 
                    [-self.HALF_W - self.X_OFFSET_CM, 0],                  # ID 1 (อยู่ล่างซ้าย) 
                    [-self.HALF_W - self.X_OFFSET_CM, self.REAL_DEPTH_CM], # ID 2 (อยู่บนซ้าย)
                    [self.HALF_W - self.X_OFFSET_CM, self.REAL_DEPTH_CM]   # ID 3 (อยู่บนขวา)
                ], dtype=np.float32)
 
                self.transform_matrix = cv2.getPerspectiveTransform(pts_src, pts_dst)
                self.is_calibrated = True
                return True, pts_src
        return False, None
 
    def get_cm_coords(self, px, py):
        """แปลงพิกัดหน้าจอ (Pixel) เป็นระยะทางจริง (Centimeter)"""
        if not self.is_calibrated or self.transform_matrix is None:
            return 0.0, 0.0 # ถ้ายังไม่ Calibrate ให้คืนค่า 0
        point_pixel = np.array([[[px, py]]], dtype=np.float32)
        point_real = cv2.perspectiveTransform(point_pixel, self.transform_matrix)
        real_x = -point_real[0][0][0] # กลับเครื่องหมาย: ขวา(+) ซ้าย(-)
        real_y = point_real[0][0][1] # แกนหน้า-หลัง
        return real_x, real_y
    def draw_workspace(self, frame, pts_src):
        """วาดกรอบสีน้ำเงิน และจุดศูนย์กลางสีเขียวลงบนจอ"""
        if self.is_calibrated and pts_src is not None:
            # วาดกรอบพื้นที่ทำงาน
            cv2.polylines(frame, [np.int32(pts_src)], True, (255, 0, 0), 2)
            # วาดจุด (0,0) ฐานหุ่นยนต์
            robot_base_px = cv2.perspectiveTransform(np.array([[[0, 0]]], dtype=np.float32), np.linalg.inv(self.transform_matrix))
            bx, by = int(robot_base_px[0][0][0]), int(robot_base_px[0][0][1])
            cv2.circle(frame, (bx, by), 8, (0, 255, 0), -1)
            cv2.putText(frame, "BASE (0,0)", (bx + 10, by), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)