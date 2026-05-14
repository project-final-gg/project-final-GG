import { useEffect, useRef } from 'react';
import { notification } from 'antd';

export default function DeepCameraContent() {

    const [api, contextHolder] =
        notification.useNotification();

    // =====================================
    // REFS
    // =====================================
    const videoRef =
        useRef<HTMLVideoElement>(null);

    const wsRef =
        useRef<WebSocket | null>(null);

    const pcRef =
        useRef<RTCPeerConnection | null>(null);

    const reconnectTimer =
        useRef<number | null>(null);

    const freezeCheckRef =
        useRef<number | null>(null);

    const isUnmounting =
        useRef(false);

    const isConnecting =
        useRef(false);

    const isReconnecting =
        useRef(false);

    const hasConnected =
        useRef(false);

    // กัน reconnect ยิงซ้ำ
    const reconnectLock =
        useRef(false);

    // =====================================
    // WS URL
    // =====================================
    const WS_URL =
        "wss://project-final-gg.onrender.com/ws/browser";

    // =====================================
    // CLEANUP
    // =====================================
    const cleanup = () => {

        console.log("cleanup");

        // -----------------------------
        // FREEZE WATCHER
        // -----------------------------
        if (freezeCheckRef.current) {

            clearInterval(
                freezeCheckRef.current
            );

            freezeCheckRef.current =
                null;
        }

        // -----------------------------
        // WEBSOCKET
        // -----------------------------
        if (wsRef.current) {

            wsRef.current.onopen =
                null;

            wsRef.current.onmessage =
                null;

            wsRef.current.onclose =
                null;

            wsRef.current.onerror =
                null;

            try {

                if (

                    wsRef.current.readyState ===
                    WebSocket.OPEN ||

                    wsRef.current.readyState ===
                    WebSocket.CONNECTING
                ) {

                    wsRef.current.close();
                }

            } catch (e) {

                console.log(
                    "ws close error",
                    e
                );
            }

            wsRef.current = null;
        }

        // -----------------------------
        // PEER CONNECTION
        // -----------------------------
        if (pcRef.current) {

            pcRef.current.ontrack =
                null;

            pcRef.current.onicecandidate =
                null;

            pcRef.current.onconnectionstatechange =
                null;

            pcRef.current.oniceconnectionstatechange =
                null;

            try {

                pcRef.current.close();

            } catch (e) {

                console.log(
                    "pc close error",
                    e
                );
            }

            pcRef.current = null;
        }

        // -----------------------------
        // VIDEO
        // -----------------------------
        if (videoRef.current) {

            videoRef.current.srcObject =
                null;
        }

        // IMPORTANT
        isConnecting.current =
            false;
    };

    // =====================================
    // RECONNECT
    // =====================================
    const reconnect = () => {

        if (isUnmounting.current)
            return;

        // กัน reconnect spam
        if (reconnectLock.current) {

            console.log(
                "RECONNECT LOCKED"
            );

            return;
        }

        reconnectLock.current =
            true;

        console.log(
            "START RECONNECT"
        );

        isReconnecting.current =
            true;

        cleanup();

        if (reconnectTimer.current) {

            clearTimeout(
                reconnectTimer.current
            );
        }

        api.error({
            key: "camera-status",
            title:
                "กล้องถูกตัดการเชื่อมต่อ",
            description:
                "กำลัง reconnect...",
            placement:
                "topRight",
            duration: 2
        });

        reconnectTimer.current =
            window.setTimeout(() => {

                if (
                    isUnmounting.current
                ) return;

                console.log(
                    "🔄 reconnecting..."
                );

                isReconnecting.current =
                    false;

                reconnectLock.current =
                    false;

                connect();

            }, 3000);
    };

    // =====================================
    // FREEZE WATCHER
    // =====================================
    const startFreezeWatcher = () => {

        if (freezeCheckRef.current) {

            clearInterval(
                freezeCheckRef.current
            );
        }

        let lastTime = 0;

        let freezeCount = 0;

        freezeCheckRef.current =
            window.setInterval(() => {

                // =========================
                // reconnect อยู่
                // =========================
                if (
                    isReconnecting.current
                ) return;

                const video =
                    videoRef.current;

                if (!video)
                    return;

                // =========================
                // NO STREAM
                // =========================
                if (!video.srcObject) {

                    console.log(
                        "NO STREAM"
                    );

                    reconnect();

                    return;
                }

                // =========================
                // VIDEO NOT READY
                // =========================
                if (
                    video.readyState < 2
                ) {

                    console.log(
                        "VIDEO NOT READY"
                    );

                    return;
                }

                // =========================
                // FREEZE DETECT
                // =========================
                if (
                    video.currentTime ===
                    lastTime
                ) {

                    freezeCount++;

                    console.log(
                        "freeze count:",
                        freezeCount
                    );

                    if (
                        freezeCount >= 3
                    ) {

                        console.log(
                            "VIDEO FREEZE DETECTED"
                        );

                        reconnect();

                        return;
                    }

                } else {

                    freezeCount = 0;
                }

                lastTime =
                    video.currentTime;

            }, 5000);
    };

    // =====================================
    // CONNECT
    // =====================================
    const connect = async () => {

        console.log({
            isConnecting:
                isConnecting.current,

            isReconnecting:
                isReconnecting.current
        });

        if (
            isConnecting.current
        ) {

            console.log(
                "already connecting"
            );

            return;
        }

        console.log("connect");

        isConnecting.current =
            true;

        hasConnected.current =
            false;

        cleanup();

        api.warning({
            key: "camera-status",
            title:
                "กำลังเชื่อมต่อกล้อง",
            description:
                "กำลังเชื่อมต่อกล้อง...",
            placement:
                "topRight",
            duration: 0
        });

        // =================================
        // PEER CONNECTION
        // =================================
        const pc =
            new RTCPeerConnection({

                iceServers: [
                    {
                        urls:
                            "stun:stun.l.google.com:19302"
                    }
                ]
            });

        pcRef.current = pc;

        // =================================
        // TRACK
        // =================================
        pc.ontrack = (event) => {

            console.log(
                "TRACK RECEIVED"
            );

            const stream =
                event.streams[0];

            // =============================
            // VIDEO
            // =============================
            if (videoRef.current) {

                videoRef.current.srcObject =
                    stream;
            }

            // =============================
            // TRACK EVENTS
            // =============================
            stream
                .getTracks()
                .forEach((track) => {

                    track.onended =
                        () => {

                            console.log(
                                "TRACK ENDED"
                            );

                            reconnect();
                        };

                    track.onmute =
                        () => {

                            console.log(
                                "TRACK MUTED"
                            );
                        };

                    track.onunmute =
                        () => {

                            console.log(
                                "TRACK UNMUTED"
                            );
                        };
                });

            // =============================
            // FREEZE WATCHER
            // =============================
            startFreezeWatcher();

            // =============================
            // SUCCESS
            // =============================
            if (
                !hasConnected.current
            ) {

                hasConnected.current =
                    true;

                api.success({
                    key:
                        "camera-status",

                    title:
                        "เชื่อมต่อกล้องสำเร็จ",

                    description:
                        "ภาพจากกล้องพร้อมใช้งานแล้ว",

                    placement:
                        "topRight",

                    duration: 3
                });
            }
        };

        // =================================
        // ICE CANDIDATE
        // =================================
        pc.onicecandidate = (
            event
        ) => {

            if (
                event.candidate &&
                wsRef.current
                    ?.readyState ===
                WebSocket.OPEN
            ) {

                wsRef.current.send(
                    JSON.stringify({
                        type:
                            "candidate",

                        data:
                            event.candidate
                    })
                );
            }
        };

        // =================================
        // CONNECTION STATE
        // =================================
        pc.onconnectionstatechange =
            () => {

                console.log(
                    "PC STATE:",
                    pc.connectionState
                );

                if (

                    pc.connectionState ===
                    "failed" ||

                    pc.connectionState ===
                    "disconnected"
                ) {

                    reconnect();
                }
            };

        // =================================
        // ICE STATE
        // =================================
        pc.oniceconnectionstatechange =
            () => {

                console.log(
                    "ICE STATE:",
                    pc.iceConnectionState
                );

                if (

                    pc.iceConnectionState ===
                    "failed" ||

                    pc.iceConnectionState ===
                    "disconnected"
                ) {

                    reconnect();
                }
            };

        // =================================
        // WEBSOCKET
        // =================================
        const ws =
            new WebSocket(WS_URL);

        wsRef.current = ws;

        let remoteReady =
            false;

        let iceQueue:
            RTCIceCandidate[] = [];

        // =================================
        // OPEN
        // =================================
        ws.onopen = async () => {

            console.log(
                "WS OPEN"
            );

            isConnecting.current =
                false;

            try {

                pc.addTransceiver(
                    "video",
                    {
                        direction:
                            "recvonly"
                    }
                );

                const offer =
                    await pc.createOffer();

                await pc.setLocalDescription(
                    offer
                );

                ws.send(
                    JSON.stringify({
                        type:
                            "offer",

                        data:
                            pc.localDescription
                    })
                );

            } catch (e) {

                console.log(
                    "offer error",
                    e
                );

                reconnect();
            }
        };

        // =================================
        // MESSAGE
        // =================================
        ws.onmessage = async (
            event
        ) => {

            try {

                const msg =
                    JSON.parse(
                        event.data
                    );

                // =========================
                // ANSWER
                // =========================
                if (
                    msg.type ===
                    "answer"
                ) {

                    await pc.setRemoteDescription(
                        msg.data
                    );

                    remoteReady =
                        true;

                    for (
                        const c
                        of iceQueue
                    ) {

                        try {

                            await pc.addIceCandidate(
                                c
                            );

                        } catch (e) {

                            console.log(
                                "candidate error",
                                e
                            );
                        }
                    }

                    iceQueue = [];
                }

                // =========================
                // CANDIDATE
                // =========================
                if (
                    msg.type ===
                    "candidate"
                ) {

                    const candidate =
                        new RTCIceCandidate(
                            msg.data
                        );

                    if (
                        !remoteReady
                    ) {

                        iceQueue.push(
                            candidate
                        );

                    } else {

                        try {

                            await pc.addIceCandidate(
                                candidate
                            );

                        } catch (e) {

                            console.log(
                                "candidate error",
                                e
                            );
                        }
                    }
                }

            } catch (e) {

                console.log(
                    "message error",
                    e
                );
            }
        };

        // =================================
        // CLOSE
        // =================================
        ws.onclose = () => {

            console.log(
                "WS CLOSED"
            );

            isConnecting.current =
                false;

            reconnect();
        };

        // =================================
        // ERROR
        // =================================
        ws.onerror = (err) => {

            console.log(
                "WS ERROR",
                err
            );
        };
    };

    // =====================================
    // EFFECT
    // =====================================
    useEffect(() => {

        connect();

        return () => {

            console.log(
                "UNMOUNT"
            );

            isUnmounting.current =
                true;

            if (
                reconnectTimer.current
            ) {

                clearTimeout(
                    reconnectTimer.current
                );
            }

            cleanup();
        };

    }, []);

    // =====================================
    // UI
    // =====================================
    return (

        <div
            className="
                flex
                flex-col
                w-full
                h-full
            "
        >

            {contextHolder}

            <h3
                className="
                    text-orange-600
                    rounded-full
                    text-[16px]
                    font-black
                    uppercase
                    tracking-wider
                    mb-2
                    ml-4
                    mt-4
                "
            >
                Deep Camera
            </h3>

            <div
                className="
                    flex-1
                    ml-4
                    mr-4
                    mb-4
                    bg-black
                    rounded-xl
                    overflow-hidden
                    border
                    border-slate-200
                    relative
                "
            >

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="
                    w-full
                    h-full
                    object-contain
                    bg-black
                "
                            />

                {/* LIVE BADGE */}
                <div
                    className="
                        absolute
                        top-2
                        right-2
                        flex
                        items-center
                        gap-1.5
                        bg-black/40
                        px-2
                        py-1
                        rounded-md
                        backdrop-blur-sm
                    "
                >

                    <div
                        className="
                            w-2
                            h-2
                            bg-red-500
                            rounded-full
                            animate-pulse
                        "
                    />

                    <span
                        className="
                            text-white
                            text-sm
                            font-bold
                            uppercase
                        "
                    >
                        Live
                    </span>

                </div>

            </div>

        </div>
    );
}