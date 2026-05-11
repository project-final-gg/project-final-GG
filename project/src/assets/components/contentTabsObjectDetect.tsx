import { useState, useEffect, useRef } from 'react';
import { notification } from 'antd';

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
    const [selectObject, setSelectObject] = useState(false);
    const [api, contextHolder] = notification.useNotification();

    const wsRef = useRef<WebSocket | null>(null);
    const WS_URL = "wss://project-final-gg.onrender.com/ws/browser";
    const API_URL = "https://project-final-gg.onrender.com";

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen = () => console.log("Object Detect: Connected");
        return () => ws.close();
    }, []);

    const setTarget = async (name: string) => {

        if (selectObject) return;

        setSelectObject(true);
        setActiveObject(name);
        const selectedObj = Object_List.find(obj => obj.value === name);

        api.warning({
            message: 'Infomation',
            description: `กำลังหยิบ ${selectedObj?.label}`,
            placement: 'topRight',
            duration: 3,
            className:"rounded-2xl border border-orange-200"
        });

        try {
            await fetch(`${API_URL}/set_target`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ target: name }),
            });

            console.log("🎯 " + name);

        } catch (error) {
            console.error("Set target failed:", error);
        }
        setTimeout(() => {
            setActiveObject(null);
            setSelectObject(false);
        }, 3000);
    };

    return (
        <div className="flex flex-col w-full h-full overflow-hidden px-2">
            {contextHolder}
            <style>
                {`
            .object-scroll-container::-webkit-scrollbar {
                width: 6px;
            }

            .object-scroll-container::-webkit-scrollbar-thumb {
                background-color: #cbd5e1;
                border-radius: 999px;
            }

            .object-scroll-container::-webkit-scrollbar-track {
                background: transparent;
            }
            `}
            </style>

            <h3
                className="
                font-bold
                text-orange-500
                uppercase
                tracking-wider

                mb-[clamp(8px,1vh,16px)]

                text-[clamp(11px,1vw,16px)]
            "
            >
                Object Detection Selection
            </h3>

            <div className="flex-1 overflow-y-auto pr-1 object-scroll-container">
                <div
                    className="
                    grid

                    grid-cols-2
                    sm:grid-cols-2
                    md:grid-cols-3
                    lg:grid-cols-4

                    gap-[clamp(8px,1vw,16px)]

                    pb-3
                    pr-1
                    m-2
                "
                >
                    {Object_List.map((obj) => {
                        const isActive = activeObject === obj.value;

                        return (
                            <div
                                key={obj.id}
                                onClick={() => setTarget(obj.value)}
                                className={`
                                cursor-pointer
                                group

                                flex flex-col
                                items-center
                                justify-center

                                rounded-2xl
                                border

                                transition-all
                                duration-300

                                min-h-30
                                sm:min-h-32.5
                                md:min-h-36.25

                                px-[clamp(8px,1vw,16px)]
                                py-[clamp(10px,1.2vh,18px)]

                                shadow-sm
                                hover:shadow-md
                                hover:-translate-y-1

                                ${isActive
                                        ? 'border-orange-500 bg-orange-50 scale-[1.02] shadow-md'
                                        : 'border-slate-200 bg-white hover:border-orange-300'
                                    }

                                ${selectObject && !isActive
                                        ? 'opacity-50 cursor-not-allowed pointer-events-none'
                                        : ''
                                    }
                                
                            `}
                            >
                                <div
                                    className={`
                                    flex
                                    items-center
                                    justify-center

                                    rounded-xl

                                    mb-[clamp(8px,1vh,14px)]

                                    transition-all

                                    w-[clamp(44px,4vw,64px)]
                                    h-[clamp(44px,4vw,64px)]

                                    ${isActive
                                            ? 'bg-orange-200'
                                            : 'bg-slate-50 group-hover:bg-orange-50'
                                        }
                                `}
                                >
                                    <img
                                        src="/images/mechanical-arm.png"
                                        alt={obj.label}
                                        className={`
                                        object-contain
                                        transition-all

                                        w-[clamp(24px,2.5vw,40px)]
                                        h-[clamp(24px,2.5vw,40px)]

                                        ${isActive
                                                ? 'brightness-110'
                                                : 'grayscale-[0.5]'
                                            }
                                    `}
                                    />
                                </div>
                                <span
                                    className={`
                                    font-bold
                                    text-center
                                    leading-tight

                                    flex
                                    items-center
                                    justify-center

                                    min-h-10

                                    text-[clamp(10px,0.9vw,14px)]

                                    ${isActive
                                            ? 'text-orange-600'
                                            : 'text-slate-600'
                                        }
                                `}
                                >
                                    {obj.label}
                                </span>
                                {isActive && (
                                    <div
                                        className="
                                        mt-2
                                        w-2
                                        h-2
                                        bg-orange-500
                                        rounded-full
                                        animate-pulse
                                    "
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}