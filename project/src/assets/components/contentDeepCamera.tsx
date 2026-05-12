import { useEffect, useRef } from 'react';
import { notification } from 'antd';

export default function DeepCameraContent() {
    const [api, contextHolder] = notification.useNotification();

    const videoRef = useRef<HTMLVideoElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const WS_URL = "wss://project-final-gg.onrender.com/ws/browser";

    const connect = () => {
        if (pcRef.current) pcRef.current.close();
        if (wsRef.current) wsRef.current.close();

        api.warning({
            key: 'camera-status',
            message: 'กำลังเชื่อมต่อกล้อง',
            description: 'กำลังเชื่อมต่อกล้อง...',
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
        };

        api.success({
            key: 'camera-status',
            message: 'เชื่อมต่อกล้องสำเร็จ',
            description: 'ภาพจากกล้องพร้อมใช้งานแล้ว',
            placement: 'topRight',
            duration: 3,
            className: "rounded-2xl border border-green-600"
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "candidate", data: event.candidate }));
            }
        };

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = async () => {
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

        ws.onclose = () => {
            api.error({
                key: 'camera-status',
                message: 'กล้องถูกตัดการเชื่อมต่อ',
                description: 'ภาพถูกตัดการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง...',
                placement: 'topRight',
                duration: 3,
                className: "rounded-2xl border border-red-600"
            });
        }
    };

    useEffect(() => {
        connect();
        return () => {
            pcRef.current?.close();
            wsRef.current?.close();
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
                    <span className="text-16 text-white font-bold uppercase">Live</span>
                </div>
            </div>
        </div>
    );
}