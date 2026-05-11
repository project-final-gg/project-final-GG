import React, { useEffect, useRef, useState } from "react";
import { Switch } from "antd";

/* =========================================================
    DEEP CAMERA COMPONENT
========================================================= */

export function DeepCamera() {
    const videoRef = useRef<HTMLVideoElement>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    const WS_URL = "wss://project-final-gg.onrender.com/ws/browser";

    useEffect(() => {
        connectWebRTC();

        return () => {
            wsRef.current?.close();
            pcRef.current?.close();
        };
    }, []);

    const connectWebRTC = async () => {
        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302",
                },
            ],
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
            if (
                event.candidate &&
                wsRef.current?.readyState === WebSocket.OPEN
            ) {
                wsRef.current.send(
                    JSON.stringify({
                        type: "candidate",
                        data: event.candidate,
                    })
                );
            }
        };

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = async () => {
            console.log("📷 Camera WS Connected");

            pc.addTransceiver("video", {
                direction: "recvonly",
            });

            const offer = await pc.createOffer();

            await pc.setLocalDescription(offer);

            ws.send(
                JSON.stringify({
                    type: "offer",
                    data: pc.localDescription,
                })
            );
        };

        ws.onmessage = async (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === "answer") {
                await pc.setRemoteDescription(msg.data);

                remoteReady = true;

                for (const candidate of iceQueue) {
                    try {
                        await pc.addIceCandidate(candidate);
                    } catch (err) {
                        console.error(err);
                    }
                }

                iceQueue = [];
            }

            if (msg.type === "candidate") {
                const candidate = new RTCIceCandidate(msg.data);

                if (!remoteReady) {
                    iceQueue.push(candidate);
                } else {
                    try {
                        await pc.addIceCandidate(candidate);
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        };

        ws.onclose = () => {
            console.log("❌ Camera WS Closed");
        };
    };

    return (
        <div className="h-full">

            <h3 className="font-bold text-orange-500 mb-3 uppercase tracking-wider text-[11px]">
                Deep Camera
            </h3>

            <div className="bg-black rounded-xl overflow-hidden relative min-h-[420px]">

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />

                {/* LIVE */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">

                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>

                    <span className="text-[10px] font-bold uppercase text-black">
                        LIVE
                    </span>
                </div>
            </div>
        </div>
    );
}

/* =========================================================
    AI DETECT COMPONENT
========================================================= */

export function AIDetect() {
    const [isAIEnabled, setIsAIEnabled] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);

    const WS_URL = "wss://project-final-gg.onrender.com/ws/browser";

    useEffect(() => {
        connectAIWebSocket();

        return () => {
            wsRef.current?.close();
        };
    }, []);

    const connectAIWebSocket = () => {
        const ws = new WebSocket(WS_URL);

        wsRef.current = ws;

        ws.onopen = () => {
            console.log("🧠 AI WS Connected");
        };

        ws.onclose = () => {
            console.log("❌ AI WS Closed");
        };
    };

    const safeSend = (payload: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        }
    };

    const handleToggleAI = (checked: boolean) => {
        setIsAIEnabled(checked);

        safeSend({
            type: "toggle_ai",
            enable: checked,
        });

        console.log(checked ? "🧠 AI ON" : "💤 AI OFF");
    };

    return (
        <div className="h-full">

            <h3 className="text-orange-600 text-[16px] font-black uppercase tracking-wider mb-3">
                AI Detect
            </h3>

            {/* STATUS CARD */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">

                <div className="flex items-center gap-5">

                    {/* AI ICON */}
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">

                        <div className="relative">

                            <div className="w-10 h-10 border-2 border-orange-400 rounded-lg flex items-center justify-center font-black text-orange-500 text-xs">
                                AI
                            </div>

                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-orange-400"></div>

                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-orange-400"></div>

                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-0.5 bg-orange-400"></div>

                            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-0.5 bg-orange-400"></div>
                        </div>
                    </div>

                    {/* STATUS */}
                    <div className="flex flex-col">

                        <span className="text-black text-[11px] font-bold uppercase mb-1">
                            AI STATUS
                        </span>

                        <span
                            className={`text-3xl font-black mb-1 ${isAIEnabled
                                    ? "text-green-500"
                                    : "text-slate-300"
                                }`}
                        >
                            {isAIEnabled ? "ON" : "OFF"}
                        </span>

                        <div className="flex items-center gap-1.5">

                            <div
                                className={`w-2 h-2 rounded-full ${isAIEnabled
                                        ? "bg-green-500 animate-pulse"
                                        : "bg-slate-300"
                                    }`}
                            ></div>

                            <span className="text-slate-500 text-[10px]">
                                {isAIEnabled
                                    ? "AI is running and detecting objects."
                                    : "AI is currently disabled."}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SWITCH */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between border border-slate-100">

                <span className="text-slate-600 text-xs font-bold">
                    Enable AI Detection
                </span>

                <Switch
                    checked={isAIEnabled}
                    onChange={handleToggleAI}
                    style={{
                        backgroundColor: isAIEnabled
                            ? "#fb923c"
                            : "#d1d5db",
                    }}
                />
            </div>
        </div>
    );
}

