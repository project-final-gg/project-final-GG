import warnings
warnings.filterwarnings("ignore")

import time
import math
import numpy as np
import cv2

try:
    from scipy.interpolate import RBFInterpolator
    HAS_RBF = True
    print("✅ RBF interpolation loaded (scipy)")
except ImportError:
    HAS_RBF = False
    print("⚠️ scipy ไม่พบ — ใช้ IDW แทน (pip install scipy)")

class RobotBehavior:
    def __init__(self, motions, workspace):
        self.motions = motions
        self.workspace = workspace
        self.state = "PARK"
        self.target_name = "None"
        self.lost_frame_count = 0
        self.max_lost_frames = 30

        self.HOVER_LIFT = 15
        self.GRAB_EXTRA = 5

        # CALIBRATION DATA 
        self.cal_points = [
            (  0.0,   2.2,   90,  83,   0, 180,  90),
            (  0.0,   5.0,   92,  82,   0, 165,  90),
            (  0.0,  10.3,   93, 107,  27, 165,  90),
            (  0.0,  12.4,   97, 121,  48, 178,  90),
            (  0.0,  20.8,   94, 154,  87, 152,  90),
            (  0.0,  21.1,   97, 132,  45, 121,  90),
            (  0.0,  17.2,   93, 154, 102,  90,  90),
            (  0.0,  17.9,   95, 156, 105, 180,  90),
            ( -5.0,   2.0,   76,  80,   0, 180,  90),
            ( -5.0,   5.0,   91, 103,  25, 180,  90),
            ( -4.9,  10.0,   84,  83,   8, 153,  90),
            ( -5.1,  15.0,   84, 117,  37, 153,  90),
            ( -4.8,  21.4,   85, 154,  87, 145,  90),
            (-10.0,   1.6,   62,  78,   0, 168,  71),
            (-10.0,   5.1,   66,  95,  15, 163,  71),
            ( -9.8,  10.0,   71, 106,  28, 160,  71),
            (-10.3,  15.0,   73, 125,  59, 160,  71),
            (-10.1,  20.1,   74, 145,  81, 151,  71),
            (-15.3,   1.4,   52,  98,  22, 172,  71),
            (-15.6,   4.9,   54,  99,  22, 162,  71),
            (-14.8,  10.5,   62, 124,  57, 167,  71),
            (-15.3,  15.4,   65, 124,  44, 143,  71),
            (-15.2,  20.1,   69, 150,  81, 135,  71),
            (-19.1,   8.0,   54, 104,  25, 144,  67),
            (-20.2,  13.3,   56, 143,  79, 155,  70),
            (-18.2,  17.9,   62, 142,  79, 150,  70),
            ( -9.5,  11.4,   75, 130,  68, 180,  83),
            (-12.1,  13.0,   74, 126,  54, 164,  90),
            (-13.3,  19.3,   73, 156, 102, 163,  90),
            (-19.1,  17.2,   65, 146,  84, 149,  83),
            (-12.2,  12.2,   68, 142,  86, 180,  73),
            ( -4.4,  13.0,   85, 132,  71, 180,  90),
            ( -6.6,   6.5,   76, 102,  28, 180,  90),
            (-11.3,  11.3,   69, 128,  65, 180,  74),
            ( -9.6,  11.3,   73, 124,  61, 180,  71),
            ( -1.7,  13.2,   89, 127,  62, 180,  73),
            ( -4.7,  18.7,   88, 160, 108, 176,  90),
            ( -7.5,  10.4,   78, 122,  54, 180,  90),
            ( -8.2,  14.5,   78, 141,  80, 180,  90),
            ( -1.3,  14.2,   90, 146,  86, 180,  90),
            ( -1.4,  11.6,   88, 124,  54, 180,  90),
            ( -0.5,   8.3,   92, 104,  29, 180,  90),
            ( -0.2,   4.9,   92,  92,  14, 180,  90),
            (-12.2,  12.7,   68, 135,  78, 180,  75),
            (-10.2,   4.9,   65, 102,  24, 180,  70),
            (-12.6,  11.7,   70, 128,  67, 180,  70),
            ( -4.4,   7.9,   82, 107,  32, 180, 103),
            ( -3.4,  17.3,   88, 152, 100, 176,  90),
            ( -3.0,  20.1,   86, 173, 133, 175,  90),
            (-12.9,   6.2,   63, 115,  41, 180,  64),
            (-17.0,   9.8,   61, 139,  78, 180,  63),
            (-16.9,  11.8,   62, 148,  92, 180,  66),
            (-12.8,   8.5,   66, 126,  56, 180,  61),
            (-17.3,  14.6,   65, 177, 134, 180,  75),
            (-13.1,  16.3,   71, 160, 108, 180,  78),
            ( -9.8,  18.3,   79, 168, 121, 180,  78),
            (  4.9,   2.6,  108,  77,   0, 180, 112),
            (  4.9,   5.1,  108,  81,   0, 173, 112),
            (  4.9,  10.0,  106, 108,  31, 172, 112),
            (  4.9,  15.0,  105, 127,  54, 166, 112),
            (  4.9,  19.9,  104, 146,  80, 160, 107),
            ( 10.0,   1.3,  117,  79,   0, 173, 112),
            ( 10.0,   5.1,  118,  81,   0, 160, 112),
            ( 10.3,  10.1,  114,  96,  12, 149, 112),
            ( 10.1,  15.2,  111, 123,  49, 155, 112),
            ( 10.1,  20.1,  109, 148,  86, 155, 112),
            ( 15.0,   5.1,  127, 105,  30, 174, 120),
            ( 15.0,  10.0,  122, 118,  47, 169, 120),
            ( 14.9,  15.0,  119, 134,  66, 161, 112),
            ( 15.0,  19.9,  115, 150,  86, 150, 112),
            ( 16.8,   8.5,  129,  97,  21, 156, 119),
            ( 18.6,  13.9,  127, 111,  25, 139, 116),
            ( 17.9,  17.5,  124, 131,  47, 132, 116),
            (  3.9,  14.4,  102, 138,  77, 180,  83),
            ( 10.7,  11.6,  117, 131,  65, 180, 115),
            (  6.9,  17.5,  106, 158, 109, 176, 160),
            ( 11.6,  21.4,  111, 180, 135, 160,  90),
            ( 10.7,  16.4,  113, 144,  86, 173,  90),
            ( 13.4,   9.1,  124, 120,  49, 180,  99),
            ( 16.5,   9.1,  129, 127,  60, 180, 120),
            ( 13.3,  14.1,  120, 142,  83, 180, 114),
            ( 11.5,  18.6,  113, 178, 135, 176,  99),
            (  9.9,  13.1,  118, 137,  70, 180, 103),
            ( 10.7,  19.3,  115, 173, 122, 177, 110),
            ( 13.9,  13.4,  123, 144,  81, 180, 123),
            (  3.1,   8.9,  105, 109,  33, 180, 108),
            (  9.1,  12.1,  118, 129,  58, 180, 122),
            ( 11.7,   7.5,  125, 114,  37, 180, 130),
            ( 11.1,   2.3,  129,  95,  10, 180, 119),
            ( 13.9,   9.2,  129, 125,  51, 180, 121),
            ( 12.5,  17.9,  120, 122, 123, 180, 111),
            ( 18.3,  12.3,  130, 147,  86, 180, 113),
            (  7.7,   7.5,  114, 106,  29, 180, 108),
            (  8.9,  16.5,  110, 155, 105, 180, 108),
            ( 17.4,  15.4,  121, 166, 120, 174, 103),
            ( 18.1,   6.5,  130, 121,  53, 180, 125),
            ( 13.7,   8.3,  122, 122,  54, 180, 125),
            (  0.3,  16.4,   91, 140,  84, 100,  90),
            (  2.0,  17.2,   96, 148,  96, 180,  90),
            (  2.2,  19.4,   99, 165, 116, 180,  97),
            (  6.8,  19.9,  106, 180, 139, 180, 108),
            (  7.0,   2.6,  116,  87,   7, 180, 122),
        ]

        self.cal_xy = np.array([(p[0], p[1]) for p in self.cal_points])
        self.cal_servos = np.array([(p[2], p[3], p[4], p[5], p[6]) for p in self.cal_points], dtype=np.float64)

        self.rbf_models = None
        if HAS_RBF:
            try:
                self.rbf_models = RBFInterpolator(
                    self.cal_xy, self.cal_servos,
                    kernel='thin_plate_spline',
                    smoothing=2.0
                )
                print(f"🔧 RBF model built: {len(self.cal_points)} points, smoothing=2.0")
            except Exception as e:
                print(f"⚠️ RBF build failed: {e} — fallback to IDW")
                self.rbf_models = None
        
        print(f"🔧 Calibration loaded: {len(self.cal_points)} points")

    def detect_object_angle(self, frame, xmin, ymin, xmax, ymax):

        box_w = xmax - xmin
        box_h = ymax - ymin

        if box_w < 5 or box_h < 5:
            return 0.0, False

        bbox_aspect = max(box_w, box_h) / max(min(box_w, box_h), 1)
        is_elongated = bbox_aspect > 1.8

        if not is_elongated:
            print(f"   📏 bbox: {box_w}x{box_h}px, aspect={bbox_aspect:.1f} → ทรงเหลี่ยม")
            return 0.0, False

        if box_w > box_h:
            bbox_angle = 0.0   
        else:
            bbox_angle = 90.0  

        h_img, w_img = frame.shape[:2]
        y1, y2 = max(0, ymin), min(h_img, ymax)
        x1, x2 = max(0, xmin), min(w_img, xmax)

        roi = frame[y1:y2, x1:x2]
        if roi.size == 0:
            print(f"   📏 bbox: {box_w}x{box_h}px, aspect={bbox_aspect:.1f} → ยาว, มุม={bbox_angle:.0f}° (จาก bbox)")
            return bbox_angle, True

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

        angle = bbox_angle
        best_contour = None

        _, mask1 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        mask2 = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY_INV, 21, 5)
        mask = cv2.bitwise_or(mask1, mask2)

        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

        points = cv2.findNonZero(mask)
        if points is not None and len(points) > 50:
            rect = cv2.minAreaRect(points)
            w_rect, h_rect = rect[1]

            if w_rect > 1 and h_rect > 1:
                rect_aspect = max(w_rect, h_rect) / min(w_rect, h_rect)

                if rect_aspect > 1.5:
                    angle = rect[2]
                    if w_rect < h_rect:
                        angle = angle + 90
                    while angle > 90:
                        angle -= 180
                    while angle < -90:
                        angle += 180
                    
                    print(f"   📏 bbox: {box_w}x{box_h}px | contour: {w_rect:.0f}x{h_rect:.0f}px → มุม={angle:.1f}° (จาก contour)")
                    return angle, True

        print(f"   📏 bbox: {box_w}x{box_h}px, aspect={bbox_aspect:.1f} → ยาว, มุม={bbox_angle:.0f}° (จาก bbox)")
        return bbox_angle, True

    def interpolate_servos(self, real_x, real_y):
        target = np.array([[real_x, real_y]])

        if self.rbf_models is not None:
            result = self.rbf_models(target)[0]
            base     = max(0, min(180, int(round(result[0]))))
            shoulder = max(0, min(180, int(round(result[1]))))
            elbow    = max(0, min(180, int(round(result[2]))))
            wrist_v  = max(0, min(180, int(round(result[3]))))
            wrist_r  = max(0, min(180, int(round(result[4]))))
            print(f"    RBF → B={base} S={shoulder} E={elbow} Wv={wrist_v} Wr={wrist_r}")
            return base, shoulder, elbow, wrist_v, wrist_r

        dists = np.linalg.norm(self.cal_xy - target[0], axis=1)
        min_dist = np.min(dists)
        if min_dist < 0.5:
            idx = np.argmin(dists)
            s = self.cal_servos[idx]
            return int(s[0]), int(s[1]), int(s[2]), int(s[3]), int(s[4])

        k = min(4, len(dists))
        nearest_idx = np.argsort(dists)[:k]
        near_dists = dists[nearest_idx]
        near_servos = self.cal_servos[nearest_idx]

        weights = 1.0 / (near_dists ** 3)
        weights /= weights.sum()
        result = np.dot(weights, near_servos)

        base     = max(0, min(180, int(round(result[0]))))
        shoulder = max(0, min(180, int(round(result[1]))))
        elbow    = max(0, min(180, int(round(result[2]))))
        wrist_v  = max(0, min(180, int(round(result[3]))))
        wrist_r  = max(0, min(180, int(round(result[4]))))

        print(f"    IDW → B={base} S={shoulder} E={elbow} Wv={wrist_v} Wr={wrist_r}")
        return base, shoulder, elbow, wrist_v, wrist_r

    def calculate_wrist_r(self, wrist_r_base, obj_angle, is_elongated):
        if not is_elongated:
            print(f"    ทรงเหลี่ยม → wrist_r = {wrist_r_base} (ไม่หมุน)")
            return wrist_r_base

        wrist_r = wrist_r_base + 90 - int(obj_angle)
        if wrist_r > 180:
            wrist_r -= 180
        if wrist_r < 0:
            wrist_r += 180
        wrist_r = max(0, min(180, wrist_r))
        return wrist_r

    def execute(self, detections, ai_labels, distance_mm, frame=None):
        if self.target_name == "None":
            if self.state != "PARK":
                self.motions.go_to_park()
                self.state = "PARK"
            return

        target_obj = None
        real_x, real_y = 0.0, 0.0

        for obj in detections:
            label = ai_labels.get(obj['class_id'], "")
            cx, cy = obj['cx'], obj['cy']
            rx, ry = self.workspace.get_cm_coords(cx, cy)
            
            if label == self.target_name:
                if 0.0 <= ry <= 24.0 and -21.0 <= rx <= 21.0:
                    target_obj = obj
                    real_x, real_y = rx, ry
                    break
                else:
                    print(f" พบ {label} แต่ตกนอกขอบเขต: rx={rx:.1f}, ry={ry:.1f}")
        
        if target_obj is None and self.lost_frame_count == 0:
            detected_names = [ai_labels.get(o['class_id'], "???") for o in detections]
            if detected_names:
                print(f" หา '{self.target_name}' ไม่เจอ | AI เห็น: {detected_names}")

        if target_obj is None:
            self.lost_frame_count += 1
            if self.lost_frame_count > self.max_lost_frames and self.state != "PARK":
                self.motions.go_to_park()
                self.state = "PARK"
                self.target_name = "None"
            return

        self.lost_frame_count = 0

        if real_x == 0.0 and real_y == 0.0:
            print(" รอ ArUco...")
            return

        print(f"\n เป้า: real_x={real_x:.1f}cm, real_y={real_y:.1f}cm")
        base, shoulder, elbow, wrist_v, wrist_r_base = self.interpolate_servos(real_x, real_y)

        obj_angle, is_elongated = 0.0, False
        if frame is not None:
            xmin, ymin, xmax, ymax = target_obj['box']
            obj_angle, is_elongated = self.detect_object_angle(frame, xmin, ymin, xmax, ymax)

        wrist_r = self.calculate_wrist_r(wrist_r_base, obj_angle, is_elongated)
        print(f" มุม={obj_angle:.1f}° ยาว={is_elongated} | Wr: {wrist_r_base}(base) → {wrist_r}(final)")

        hover_shoulder = max(0, shoulder - self.HOVER_LIFT)

        if self.state == "PARK":
            print(f" Grab: B={base} S={shoulder} E={elbow} Wv={wrist_v} Wr={wrist_r}")
            self.state = "GRAB"

            # Step 1: เตรียม
            self.motions.mqtt.send_angle("brake_enable", 1)
            self.motions.mqtt.send_angle("gripper", 0)
            time.sleep(0.5)

            # Step 2: Hover
            print(" Hover")
            self.motions.mqtt.send_angle("base", base)
            self.motions.mqtt.send_angle("shoulder", hover_shoulder)
            self.motions.mqtt.send_angle("elbow", elbow)
            self.motions.mqtt.send_angle("wrist_v", wrist_v)
            self.motions.mqtt.send_angle("wrist_r", wrist_r)
            time.sleep(2.0)

            # Step 3: Lower
            print(" Lower")
            grab_shoulder = min(180, shoulder + self.GRAB_EXTRA)
            self.motions.mqtt.send_angle("shoulder", grab_shoulder)
            time.sleep(1.5)

            # Step 4: Grip
            print(" Grip")
            self.motions.mqtt.send_angle("gripper", 150)
            time.sleep(2.5)

            # Step 5: ยกขึ้น + เชิด wrist ขึ้น
            print(" Lift + tilt up")
            self.motions.mqtt.send_angle("shoulder", hover_shoulder)
            self.motions.mqtt.send_angle("wrist_v", 90)
            time.sleep(1.0)

            # Step 6: ยกสูง
            self.motions.mqtt.send_angle("brake_enable", 0)
            time.sleep(0.3)
            self.motions.mqtt.send_angle("elbow", 20)
            self.motions.mqtt.send_angle("shoulder", 70)
            time.sleep(1.0)

            # Step 7: Handover — หันไปหน้า + เชิดของขึ้น
            print(" Handover")
            self.motions.mqtt.send_angle("base", 90)
            self.motions.mqtt.send_angle("wrist_v", 90)
            self.motions.mqtt.send_angle("wrist_r", 90)
            time.sleep(1.0)
            self.motions.mqtt.send_angle("elbow", 30)
            self.motions.mqtt.send_angle("shoulder", 100)
            time.sleep(2.0)

            # ปล่อย
            self.motions.mqtt.send_angle("gripper", 0)
            time.sleep(1.5)

            # Safe retract
            print(" Safe retract")
            self.motions.mqtt.send_angle("shoulder", 50)
            self.motions.mqtt.send_angle("elbow", 10)
            self.motions.mqtt.send_angle("wrist_v", 180)
            time.sleep(1.0)
            self.motions.mqtt.send_angle("shoulder", 20)
            self.motions.mqtt.send_angle("elbow", 0)
            time.sleep(1.0)

            self.motions.go_to_park()

            self.target_name = "None"
            self.state = "PARK"
