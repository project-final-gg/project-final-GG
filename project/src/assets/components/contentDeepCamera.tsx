import React, { useEffect, useRef, useState } from 'react';

export default function DeepCameraContent() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const WS_URL = "wss://project-final-gg.onrender.com/ws/browser";

    const connect = () => {
        if (pcRef.current) pcRef.current.close();
        if (wsRef.current) wsRef.current.close();

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
            <h3 className="text-orange-600 rounded-full text-[16px] font-black uppercase tracking-wider mb-2 ml-4 mt-4">
                Deep Camera
            </h3>
            
            {/* Container สำหรับวิดีโอ */}
            <div className="flex-1 ml-4 mr-4 mb-4 bg-black rounded-xl overflow-hidden border border-slate-200 relative">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover" 
                />
                
                {/* Overlay แสดงสถานะเล็กน้อย */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] text-white font-bold uppercase">Live</span>
                </div>
            </div>
        </div>
    );
}