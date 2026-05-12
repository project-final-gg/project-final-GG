import { useEffect, useRef } from 'react';
import { notification } from 'antd';

export default function DeepCameraContent() {
    const [api, contextHolder] = notification.useNotification()

    const videoRef = useRef<HTMLVideoElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const reconnectCamera = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connectionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isUnmounting = useRef(false);
    const hasConnected = useRef(false);

    const WS_URL = "wss://project-final-gg.onrender.com/ws/browser";

    const reconnect = () => {
        if (isUnmounting.current) return;

        // เคลียร์ timer เดิมทิ้งก่อนเริ่มสร้างอันใหม่
        if (reconnectCamera.current) {
            clearTimeout(reconnectCamera.current);
        }

        console.log("🔄 Reconnecting camera in 3s...");
        reconnectCamera.current = window.setTimeout(() => {
            if (isUnmounting.current) return;
            connect();
        }, 3000);
    };

    const connect = () => {
        console.log("🚀 Attempting to connect to camera...");
        hasConnected.current = false;

        // Cleanup ก่อนเชื่อมต่อใหม่
        if (pcRef.current) pcRef.current.close();
        if (wsRef.current) {
            wsRef.current.onclose = null; // ป้องกัน infinite loop จากการสั่ง close เอง
            wsRef.current.close();
        }

        api.warning({
            key: 'camera-status',
            message: 'กำลังเชื่อมต่อกล้อง',
            description: 'กำลังพยายามเชื่อมต่อกับ Server...',
            placement: 'topRight',
            duration: 0,
            className: "rounded-2xl border border-orange-200"
        });

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        let remoteReady = false;
        let iceQueue: RTCIceCandidate[] = [];

        pc.ontrack = (event) => {
            if (videoRef.current) {
                videoRef.current.srcObject = event.streams[0];
            }

            if (!hasConnected.current) {
                hasConnected.current = true;
                console.log("🎬 STREAM RECEIVED: ได้รับสัญญาณภาพจากกล้องแล้ว");
                api.success({
                    key: 'camera-status',
                    message: 'เชื่อมต่อกล้องสำเร็จ',
                    description: 'ภาพจากกล้องพร้อมใช้งานแล้ว',
                    placement: 'topRight',
                    duration: 3,
                    className: "rounded-2xl border border-green-600"
                });
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "candidate", data: event.candidate }));
            }
        };

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        // ตั้งเวลา Timeout หากต่อไม่ติดภายใน 5 วินาที
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        connectionTimeout.current = window.setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                console.log("⏳ Connection timeout - triggering retry");
                ws.close();
            }
        }, 5000);

        ws.onopen = async () => {
            if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
            console.log("✅ WebSocket Connected");

            pc.addTransceiver("video", { direction: "recvonly" });
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "offer", data: pc.localDescription }));
        };

        ws.onmessage = async (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "answer") {
                await pc.setRemoteDescription(msg.data);
                remoteReady = true;
                for (const c of iceQueue) { try { await pc.addIceCandidate(c); } catch { } }
                iceQueue = [];
            }
            if (msg.type === "candidate") {
                const candidate = new RTCIceCandidate(msg.data);
                if (!remoteReady) iceQueue.push(candidate);
                else { try { await pc.addIceCandidate(candidate); } catch { } }
            }
        };

        ws.onclose = (event) => {
            if (isUnmounting.current) return;

            console.log("🔌 WebSocket Closed:", event.reason);
            if (connectionTimeout.current) clearTimeout(connectionTimeout.current);

            api.error({
                key: 'camera-status',
                message: 'กล้องถูกตัดการเชื่อมต่อ',
                description: 'ไม่พบสัญญาณจากกล้อง กำลังพยายามเชื่อมต่อใหม่...',
                placement: 'topRight',
                duration: 2,
                className: "rounded-2xl border border-red-600"
            });

            reconnect();
        };

        ws.onerror = (err) => {
            console.error("❌ WebSocket Error:", err);
            // ปล่อยให้ onclose เป็นคนจัดการ reconnect
        };
    };

    useEffect(() => {
        isUnmounting.current = false;
        connect();

        return () => {
            isUnmounting.current = true;
            if (reconnectCamera.current) clearTimeout(reconnectCamera.current);
            if (connectionTimeout.current) clearTimeout(connectionTimeout.current);

            pcRef.current?.close();
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, []);

    return (
        <div className="flex flex-col w-full h-full">
            {contextHolder}
            <h3 className="text-orange-600 rounded-full text-[16px] font-black uppercase tracking-wider mb-2 ml-4 mt-4">
                Deep Camera
            </h3>

            <div className="flex-1 ml-4 mr-4 mb-4 bg-black rounded-xl overflow-hidden border border-slate-200 relative">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full"
                />

                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-[12px] text-white font-bold uppercase">
                        {hasConnected.current ? 'Live' : 'Offline'}
                    </span>
                </div>
            </div>
        </div>
    );
}