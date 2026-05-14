import { useState, useEffect, useRef } from 'react';
import { Switch, notification } from 'antd';

export default function AIDetectContent() {
    const [isAIEnabled, setIsAIEnabled] = useState(false);
    const [api, contextHolder] = notification.useNotification();

    const wsRef = useRef<WebSocket | null>(null);
    const WS_URL = "wss://project-final-gg.onrender.com/ws/ai";
    

    // ฟังก์ชันสำหรับส่งข้อมูลผ่าน WebSocket
    const safeSend = (obj: object) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(obj));
        }
    };

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => console.log("AI Control: Connected to WS");
        ws.onclose = () => console.log("AI Control: WS closed");

        return () => ws.close();
    }, []);

    useEffect(() => {
        const savedAIStatus = localStorage.getItem("ai_status");

        if (savedAIStatus !== null) {
            const parsedStatus = JSON.parse(savedAIStatus);

            setIsAIEnabled(parsedStatus);

            safeSend({
                type: "toggle_ai",
                enable: parsedStatus,
            });
        }
    }, []);

    const enableAI = () => {
        safeSend({
            type: "toggle_ai",
            enable: true,
        });

        console.log("🧠 AI ON");
    };

    const disableAI = () => {
        safeSend({
            type: "toggle_ai",
            enable: false,
        });

        console.log("💤 AI OFF");
    };

    const handleToggleAI = (checked: boolean) => {

        setIsAIEnabled(checked);

        localStorage.setItem("ai_status", JSON.stringify(checked));

        if (checked) {
            enableAI();

            api.success({
                title: 'Enable AI',
                description: 'AI Detection has been enabled.',
                placement: 'topRight',
                duration: 3,
                className:"rounded-2xl border border-green-600"
            });

        } else {
            disableAI();

            api.error({
                title: 'Disable AI',
                description: 'AI Detection has been disabled.',
                placement: 'topRight',
                duration: 3,
                className:"rounded-2xl border border-red-600"
            });

        }
    };

    return (
        <div className="flex flex-col w-full h-full font-sans">
            {contextHolder}
            <h3 className="text-orange-600 rounded-full text-[16px] font-black uppercase tracking-wider mb-2">
                AI Detection
            </h3>

            <div className="flex-1 bg-white border border-slate-100 rounded-xl p-4 flex flex-col justify-center shadow-sm mb-3">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center">
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

                    <div className="flex flex-col">
                        <span className="text-black text-[11px] font-bold uppercase mb-1">
                            AI Status
                        </span>
                        <span className={`text-3xl font-black mb-1 ${isAIEnabled ? 'text-green-500' : 'text-slate-300'}`}>
                            {isAIEnabled ? 'ON' : 'OFF'}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${isAIEnabled ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                            <span className="text-slate-500 text-[10px]">
                                {isAIEnabled ? 'AI is running and detecting objects.' : 'AI is currently disabled.'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50/50 rounded-xl px-4 py-3 flex items-center justify-between border border-slate-100">
                <span className="text-slate-600 text-xs font-bold">Enable AI Detection</span>
                <Switch
                    checked={isAIEnabled}
                    onChange={handleToggleAI}
                    style={{ backgroundColor: isAIEnabled ? '#fb923c' : '#d1d5db' }}
                />
            </div>
        </div>
    );
}