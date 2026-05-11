import React, { useState, useEffect, useRef } from 'react';

// รายชื่อวัตถุชุดใหม่ 13 รายการ
const Object_List = [
    { label: "ไขควง", value: "Screwdriver", id: "1" },
    { label: "คีม", value: "Pliers", id: "2" },
    { label: "คัตเตอร์", value: "Cutter", id: "3" },
    { label: "ลูกบาศก์", value: "Cube", id: "4" },
    { label: "ปากกาน้ำเงิน", value: "Blue_pen", id: "5" },
    { label: "ปากกาแดง", value: "Red_pen", id: "6" },
    { label: "ไขควงวัดไฟ", value: "Electrical_screwdriver", id: "7" },
    { label: "ยางลบ", value: "Eraser", id: "8" },
    { label: "ไขควงปากแบน", value: "Flat_head_screwdriver", id: "9" },
    { label: "ปากกาตัดเส้น", value: "Line_cutting_pen", id: "10" },
    { label: "คีมปากจิ้งจก", value: "Needle_nose_pliers", id: "11" },
    { label: "ดินสอ", value: "Pencil", id: "12" },
    { label: "คีมตัดสายไฟ", value: "Wire_cutting_pliers", id: "13" }
];

export default function ObjectDetectContent() {
    const [activeObject, setActiveObject] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const WS_URL = "wss://project-final-gg.onrender.com/ws/browser";

    // เชื่อมต่อ WebSocket
    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen = () => console.log("Object Detect: Connected");
        return () => ws.close();
    }, []);

    // ฟังก์ชันส่งคำสั่งเลือกวัตถุ
    const handleSelectObject = (value: string) => {
        const newTarget = activeObject === value ? "stop" : value;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "set_target", data: newTarget }));
            setActiveObject(newTarget === "stop" ? null : value);
        }
    };

    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            {/* Custom Scrollbar Style */}
            <style>
                {`
                .object-scroll-container::-webkit-scrollbar { width: 4px; }
                .object-scroll-container::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 10px; }
                `}
            </style>

            <h3 className="font-bold text-orange-500 mb-3 uppercase tracking-wider text-[11px] flex-shrink-0">
                Object Detection Selection
            </h3>

            {/* Grid รายการวัตถุแบบกระชับ (Compact Grid) */}
            <div className="flex-1 overflow-y-auto pr-1 object-scroll-container">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 pb-2">
                    {Object_List.map((obj) => {
                        const isActive = activeObject === obj.value;
                        return (
                            <div 
                                key={obj.id}
                                onClick={() => handleSelectObject(obj.value)}
                                className={`
                                    cursor-pointer group flex flex-col items-center p-2 rounded-xl border transition-all duration-200
                                    ${isActive 
                                        ? 'border-orange-500 bg-orange-50 shadow-sm transform scale-[1.02]' 
                                        : 'border-slate-100 bg-white hover:border-orange-200'
                                    }
                                `}
                            >
                                {/* รูปภาพวัตถุขนาดเล็ก */}
                                <div className={`
                                    w-9 h-9 rounded-lg mb-1 flex items-center justify-center overflow-hidden transition-colors
                                    ${isActive ? 'bg-orange-200' : 'bg-slate-50 group-hover:bg-orange-50'}
                                `}>
                                    <img 
                                        src="/images/mechanical-arm.png" 
                                        alt={obj.label}
                                        className={`w-6 h-6 object-contain ${isActive ? 'brightness-110' : 'grayscale-[0.5]'}`}
                                    />
                                </div>

                                {/* ชื่อวัตถุภาษาไทยแบบกระชับ */}
                                <span className={`
                                    text-[10px] font-bold text-center leading-tight min-h-[24px] flex items-center justify-center
                                    ${isActive ? 'text-orange-600' : 'text-slate-500'}
                                `}>
                                    {obj.label}
                                </span>

                                {isActive && (
                                    <div className="mt-0.5 w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}