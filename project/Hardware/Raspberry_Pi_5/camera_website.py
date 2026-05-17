import asyncio
import json
import websockets
import cv2
import numpy as np
import time

from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    VideoStreamTrack,
    RTCConfiguration,
    RTCIceServer,
    RTCIceCandidate,
)
from aiortc.contrib.media import MediaRelay
from av import VideoFrame

from project.Hardware.Raspberry_Pi_5.ai_coral import AIEngine
from project.Hardware.Raspberry_Pi_5.camera import CameraManager
from project.Hardware.Raspberry_Pi_5.mqtt import RobotController
from project.Hardware.Raspberry_Pi_5.motions import RobotMotions
from project.Hardware.Raspberry_Pi_5.behavior import RobotBehavior
from project.Hardware.Raspberry_Pi_5.workspace import WorkspaceManager

from check_resource import PerformanceMonitor


# ---------------- CONFIG ----------------
TARGET_FPS = 20
IDLE_FPS = 2                    # ตอนไม่มีคนดู + AI off
AI_INTERVAL = 0.25
AI_INPUT_SIZE = 320
AI_FRAME_SKIP = 3
WORKSPACE_UPDATE_EVERY = 20     # ~1 ครั้ง/วินาที ที่ 20fps
OUTPUT_W, OUTPUT_H = 640, 480

# ---------------- ICE SERVERS ----------------
# STUN: ช่วยเช็ค public IP/port ของ Pi
# TURN: relay traffic ผ่าน server กลาง เมื่อ P2P ตรงไม่ได้ (symmetric NAT, CGNAT)
# openrelay.metered.ca = TURN ฟรี (อาจไม่เสถียรช่วง peak — production ควรตั้งของตัวเอง)
ICE_SERVERS = [
    RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
    RTCIceServer(urls=["stun:stun1.l.google.com:19302"]),
    RTCIceServer(
        urls=["turn:openrelay.metered.ca:80"],
        username="openrelayproject",
        credential="openrelayproject",
    ),
    RTCIceServer(
        urls=["turn:openrelay.metered.ca:443"],
        username="openrelayproject",
        credential="openrelayproject",
    ),
    RTCIceServer(
        urls=["turn:openrelay.metered.ca:443?transport=tcp"],
        username="openrelayproject",
        credential="openrelayproject",
    ),
]

ICE_GATHERING_TIMEOUT = 5.0     # วินาที — รอเก็บ candidate ไม่เกินเวลานี้


def candidate_from_sdp(sdp_str):
    """แปลง candidate string จาก browser → RTCIceCandidate ของ aiortc

    Format ตัวอย่าง:
      'candidate:842163049 1 udp 1677729535 1.2.3.4 51234 typ srflx raddr 0.0.0.0 rport 0'
    """
    if sdp_str.startswith("candidate:"):
        sdp_str = sdp_str[len("candidate:"):]

    bits = sdp_str.split()
    if len(bits) < 8:
        raise ValueError(f"Invalid candidate SDP: {sdp_str}")

    candidate = RTCIceCandidate(
        component=int(bits[1]),
        foundation=bits[0],
        ip=bits[4],
        port=int(bits[5]),
        priority=int(bits[3]),
        protocol=bits[2],
        type=bits[7],
    )

    # optional attributes
    for i in range(8, len(bits) - 1, 2):
        key, val = bits[i], bits[i + 1]
        if key == "raddr":
            candidate.relatedAddress = val
        elif key == "rport":
            candidate.relatedPort = int(val)
        elif key == "tcptype":
            candidate.tcpType = val

    return candidate


class RobotSystem:
    def __init__(self):
        print("[INIT] RobotSystem starting...")

        self.cam = CameraManager()

        self.ai = None
        self.enable_ai = False

        self.mqtt = RobotController()
        self.mqtt.connect()

        self.workspace = WorkspaceManager()
        self.motions = RobotMotions(self.mqtt)
        self.brain = RobotBehavior(self.motions, self.workspace)

        self.mqtt.client.subscribe("robot/command/target")
        self.mqtt.client.on_message = self.on_message

        self.motions.go_to_park()

        # ---------------- PRE-ALLOCATED BUFFERS ----------------
        # จองครั้งเดียว ใช้ตลอด → ไม่มี per-frame allocation = ไม่มี GC pressure
        self.flip_buf = None       # alloc ตอนรู้ shape ของกล้อง
        self.resize_buf = np.empty((OUTPUT_H, OUTPUT_W, 3), dtype=np.uint8)
        self.ai_bgr_buf = np.empty((AI_INPUT_SIZE, AI_INPUT_SIZE, 3), dtype=np.uint8)
        self.ai_rgb_buf = np.empty((AI_INPUT_SIZE, AI_INPUT_SIZE, 3), dtype=np.uint8)

        # Double-buffer สำหรับ YUV → กัน race ระหว่าง process_loop เขียน + VideoTrack อ่าน
        self.yuv_bufs = [
            np.empty((OUTPUT_H * 3 // 2, OUTPUT_W), dtype=np.uint8),
            np.empty((OUTPUT_H * 3 // 2, OUTPUT_W), dtype=np.uint8),
        ]
        self.yuv_idx = 0

        # ---------------- STATE ----------------
        self.latest_frame = None
        self.frame_for_ai = None
        self.pts_src_cache = None

        self.target_fps = TARGET_FPS
        self.frame_interval = 1 / TARGET_FPS
        self.idle_interval = 1 / IDLE_FPS
        self.prev_time = 0

        self.last_ai_time = 0
        self.ai_interval = AI_INTERVAL
        self.cached_detections = []
        self.frame_count = 0
        self.ai_scale_x = 1.0
        self.ai_scale_y = 1.0
        self.ai_frame_ready = asyncio.Event()

        # Brain task tracking — กันสั่งซ้อน + ไม่ block process_loop
        self.brain_busy = False

        # Viewer state
        self.has_viewer = False

        self.perf = PerformanceMonitor(log_interval=2)

        # Bounded queue — กัน leak ถ้า log_worker ตามไม่ทัน
        self.log_queue = asyncio.Queue(maxsize=200)

        print("[INIT] System ready")

    # ---------------- LOG ----------------
    def log(self, msg):
        try:
            self.log_queue.put_nowait(msg)
        except asyncio.QueueFull:
            pass

    async def log_worker(self):
        while True:
            msg = await self.log_queue.get()
            print(msg)

    # ---------------- AI ----------------
    def init_ai(self):
        if self.ai is None:
            self.log("[AI] Loading Coral...")
            self.ai = AIEngine(
                model_path='/home/shiina/object_detection/models/object_detection.tflite',
                label_path='/home/shiina/object_detection/models/object.txt'
            )
            self.log("[AI] Loaded")

    def disable_ai(self):
        if self.ai is not None:
            self.log("[AI] Releasing Coral...")
            self.ai = None
            self.cached_detections = []
            self.brain.target_name = None
            self.last_ai_time = 0
            self.perf.update_ai_latency(0)

    def on_message(self, client, userdata, msg):
        command = msg.payload.decode()
        self.brain.target_name = command
        self.log(f"[MQTT] target = {command}")

    async def shutdown(self):
        self.log("[SHUTDOWN] Cleaning up...")
        try:
            self.mqtt.client.loop_stop()
            self.mqtt.client.disconnect()
        except Exception:
            pass
        try:
            self.cam.release()
        except Exception:
            pass
        self.disable_ai()
        self.log("[SHUTDOWN] Done")

    # ---------------- AI LOOP ----------------
    async def ai_loop(self):
        while True:
            await self.ai_frame_ready.wait()
            self.ai_frame_ready.clear()

            if not self.enable_ai or self.frame_for_ai is None:
                continue

            if self.ai is None:
                self.init_ai()

            now = time.time()
            if now - self.last_ai_time < self.ai_interval:
                continue

            try:
                start = time.time()
                detections = await asyncio.to_thread(self.ai.detect, self.frame_for_ai)
                latency = time.time() - start

                # ⭐ ระหว่างที่ detect รันใน thread ผู้ใช้อาจกด toggle AI off
                # ถ้าเป็นแบบนั้น → ทิ้งผลลัพธ์ ไม่ assign cached_detections
                if not self.enable_ai or self.ai is None:
                    self.cached_detections = []
                    continue

                sx, sy = self.ai_scale_x, self.ai_scale_y
                if sx != 1.0 or sy != 1.0:
                    for obj in detections:
                        x1, y1, x2, y2 = obj['box']
                        obj['box'] = (
                            int(x1 * sx), int(y1 * sy),
                            int(x2 * sx), int(y2 * sy),
                        )
                        obj['cx'] = int(obj['cx'] * sx)
                        obj['cy'] = int(obj['cy'] * sy)

                self.cached_detections = detections
                self.perf.update_ai_latency(latency)
            except Exception as e:
                self.log(f"[AI ERROR]: {e}")
                self.cached_detections = []

            self.last_ai_time = now

    # ---------------- BRAIN (non-blocking) ----------------
    async def _run_brain(self, detections, current_dist, frame_snapshot):
        """รัน brain.execute ใน thread → ไม่ block process_loop ตอนหยิบของ"""
        try:
            await asyncio.to_thread(
                self.brain.execute,
                detections, self.ai.labels, current_dist, frame_snapshot
            )
        except Exception as e:
            self.log(f"[BRAIN ERROR]: {e}")
        finally:
            self.brain_busy = False

    # ---------------- MAIN LOOP ----------------
    async def process_loop(self):
        self.log("[PROC] loop started")

        while True:
            start_time = time.time()

            active = self.has_viewer or self.enable_ai
            target_interval = self.frame_interval if active else self.idle_interval

            try:
                # ดึงเฟรมใน thread ไม่ block event loop
                result = await asyncio.to_thread(self.cam.get_frames)
                if not result:
                    await asyncio.sleep(0.05)
                    continue

                raw_frame, depth_array = result
                if raw_frame is None:
                    await asyncio.sleep(0.05)
                    continue

                # ---------------- FLIP (ใช้ pre-alloc buffer) ----------------
                if self.flip_buf is None or self.flip_buf.shape != raw_frame.shape:
                    self.flip_buf = np.empty_like(raw_frame)
                cv2.flip(raw_frame, -1, dst=self.flip_buf)
                frame = self.flip_buf

                # ---------------- RESIZE (เฉพาะถ้าจำเป็น) ----------------
                if frame.shape[1] != OUTPUT_W or frame.shape[0] != OUTPUT_H:
                    cv2.resize(frame, (OUTPUT_W, OUTPUT_H), dst=self.resize_buf)
                    frame = self.resize_buf

                self.frame_count += 1

                # ---------------- WORKSPACE ----------------
                if self.frame_count % WORKSPACE_UPDATE_EVERY == 0 or self.pts_src_cache is None:
                    _, self.pts_src_cache = self.workspace.update_matrix(frame)
                self.workspace.draw_workspace(frame, self.pts_src_cache)

                # ---------------- ส่งเฟรมให้ AI (ใช้ pre-alloc) ----------------
                if self.enable_ai and self.frame_count % AI_FRAME_SKIP == 0:
                    cv2.resize(frame, (AI_INPUT_SIZE, AI_INPUT_SIZE), dst=self.ai_bgr_buf)
                    cv2.cvtColor(self.ai_bgr_buf, cv2.COLOR_BGR2RGB, dst=self.ai_rgb_buf)
                    self.frame_for_ai = self.ai_rgb_buf
                    self.ai_scale_x = OUTPUT_W / AI_INPUT_SIZE
                    self.ai_scale_y = OUTPUT_H / AI_INPUT_SIZE
                    self.ai_frame_ready.set()

                detections = self.cached_detections if self.enable_ai else []
                current_dist = 0

                # ---------------- DRAW OBJECTS ----------------
                for obj in detections:
                    xmin, ymin, xmax, ymax = obj['box']
                    cx, cy = obj['cx'], obj['cy']
                    cid = obj['class_id']

                    name = self.ai.labels.get(cid, "N/A") if self.ai else "N/A"
                    color = self.ai.colors.get(cid, (0, 255, 0)) if self.ai else (0, 255, 0)

                    dist = self.cam.get_smart_depth(depth_array, xmin, ymin, xmax, ymax)

                    is_target = (name == self.brain.target_name)
                    if is_target:
                        current_dist = dist

                    thickness = 3 if is_target else 1

                    cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, thickness)
                    cv2.circle(frame, (cx, cy), 4, color, -1)

                    real_x, real_y = self.workspace.get_cm_coords(cx, cy)
                    label = f"{name} ({real_x:.1f},{real_y:.1f})"

                    cv2.putText(frame, label, (xmin, ymin - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, thickness)

                # ---------------- BRAIN (NON-BLOCKING!) ----------------
                # รันใน thread → process_loop ส่งภาพต่อได้ระหว่างหยิบของ
                if self.enable_ai and self.ai is not None and detections and not self.brain_busy:
                    self.brain_busy = True
                    # snapshot frame ก่อนส่ง brain (เพราะ buffer หลักจะถูกเขียนทับเฟรมถัดไป)
                    frame_snapshot = frame.copy()
                    asyncio.create_task(
                        self._run_brain(detections, current_dist, frame_snapshot)
                    )

                # ---------------- FPS / OVERLAY ----------------
                curr_time = time.time()
                fps = 1 / (curr_time - self.prev_time) if self.prev_time else 0
                self.prev_time = curr_time
                self.perf.log(fps, len(detections))

                cv2.putText(frame,
                            f"FPS: {int(fps)} | Target: {self.brain.target_name}",
                            (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                cv2.putText(frame,
                            self.perf.get_overlay_text(),
                            (20, 70),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)

                # ---------------- ENCODE YUV (double-buffer + has_viewer guard) ----------------
                if self.has_viewer:
                    buf = self.yuv_bufs[self.yuv_idx]
                    cv2.cvtColor(frame, cv2.COLOR_BGR2YUV_I420, dst=buf)
                    self.latest_frame = buf            # publish หลังเขียนเสร็จ
                    self.yuv_idx ^= 1                  # toggle ไป buffer อีกฝั่ง

                # ---------------- PACING ----------------
                elapsed = time.time() - start_time
                await asyncio.sleep(max(0, target_interval - elapsed))

            except Exception as e:
                self.log(f"[PROC ERROR]: {e}")
                await asyncio.sleep(0.1)


# ---------------- VIDEO TRACK ----------------
class VideoTrack(VideoStreamTrack):
    def __init__(self, system):
        super().__init__()
        self.system = system

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        while self.system.latest_frame is None:
            await asyncio.sleep(0.02)
        frame = self.system.latest_frame
        vf = VideoFrame.from_ndarray(frame, format="yuv420p")
        vf.pts = pts
        vf.time_base = time_base
        return vf


# ---------------- RUN ----------------
async def run():
    uri = "wss://project-final-gg.onrender.com/ws/pi"

    system = RobotSystem()

    tasks = [
        asyncio.create_task(system.process_loop()),
        asyncio.create_task(system.ai_loop()),
        asyncio.create_task(system.log_worker()),
    ]

    source_track = VideoTrack(system)
    relay = MediaRelay()

    current_pc = {"pc": None}

    async def close_pc():
        pc = current_pc["pc"]
        if pc:
            await pc.close()
            current_pc["pc"] = None
        system.has_viewer = False
        system.latest_frame = None
        print("[VIEWER] disconnected")

    try:
        while True:
            try:
                print("[WS] Connecting...")
                async with websockets.connect(uri) as ws:
                    print("[WS] Connected")

                    while True:
                        msg = json.loads(await ws.recv())
                        mtype = msg.get("type")

                        if mtype == "offer":
                            await close_pc()

                            # ⭐ ใช้ RTCConfiguration พร้อม STUN + TURN
                            config = RTCConfiguration(iceServers=ICE_SERVERS)
                            pc = RTCPeerConnection(configuration=config)
                            current_pc["pc"] = pc

                            @pc.on("connectionstatechange")
                            async def on_state_change():
                                state = pc.connectionState
                                print(f"[PC STATE] {state}")
                                if state == "connected":
                                    system.has_viewer = True
                                elif state in ("failed", "closed", "disconnected"):
                                    system.has_viewer = False

                            @pc.on("iceconnectionstatechange")
                            async def on_ice_state_change():
                                print(f"[ICE STATE] {pc.iceConnectionState}")

                            @pc.on("icegatheringstatechange")
                            async def on_ice_gather_change():
                                print(f"[ICE GATHER] {pc.iceGatheringState}")

                            pc.addTrack(relay.subscribe(source_track))

                            offer = msg["data"]
                            await pc.setRemoteDescription(
                                RTCSessionDescription(sdp=offer["sdp"], type=offer["type"])
                            )
                            answer = await pc.createAnswer()
                            await pc.setLocalDescription(answer)

                            # ⭐ รอ ICE gathering เสร็จก่อนส่ง answer
                            # → SDP จะมี candidates ครบ (host + srflx + relay)
                            # ใช้ timeout กันค้างถ้า TURN server ตอบช้า
                            gather_start = time.time()
                            while pc.iceGatheringState != "complete":
                                if time.time() - gather_start > ICE_GATHERING_TIMEOUT:
                                    print("[ICE] gather timeout — ส่ง answer ที่มีเท่านี้")
                                    break
                                await asyncio.sleep(0.1)

                            await ws.send(json.dumps({
                                "type": "answer",
                                "data": {
                                    "sdp": pc.localDescription.sdp,
                                    "type": pc.localDescription.type
                                }
                            }))

                            system.has_viewer = True

                        elif mtype in ("candidate", "ice", "ice_candidate"):
                            # ⭐ รับ ICE candidate จาก browser (trickle ICE)
                            pc = current_pc["pc"]
                            cand_data = msg.get("data") or msg.get("candidate")
                            if pc and cand_data:
                                try:
                                    if isinstance(cand_data, dict):
                                        cand_str = cand_data.get("candidate")
                                        sdp_mid = cand_data.get("sdpMid")
                                        sdp_mline = cand_data.get("sdpMLineIndex")
                                    else:
                                        cand_str = cand_data
                                        sdp_mid = None
                                        sdp_mline = None

                                    # null candidate = end-of-candidates marker → ข้าม
                                    if cand_str:
                                        ice = candidate_from_sdp(cand_str)
                                        ice.sdpMid = sdp_mid
                                        ice.sdpMLineIndex = sdp_mline
                                        await pc.addIceCandidate(ice)
                                except Exception as e:
                                    print(f"[ICE PARSE ERROR]: {e}")

                        elif mtype == "toggle_ai":
                            enable = msg.get("enable", False)
                            system.enable_ai = enable
                            if not enable:
                                system.disable_ai()
                            print("[AI TOGGLE] =", enable)

            except Exception as e:
                print("[WS ERROR]:", e)
                await close_pc()
                await asyncio.sleep(2)

    finally:
        print("[RUN] shutdown...")
        for t in tasks:
            t.cancel()
        await close_pc()
        await system.shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("\n[MAIN] Ctrl+C exit")
