import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { ConfigProvider, Tabs, Divider, Button, notification } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import JointControlsContent from './assets/components/contentTabsJointControl';
import ObjectDetectContent from './assets/components/contentTabsObjectDetect';
import DeepCameraContent from './assets/components/contentDeepCamera';
import AIDetectContent from './assets/components/contentAiDetect';
import ActivityLogsContent from './assets/components/contentActivityLogs';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('1');
    const [isConnected, setIsConnected] = useState(false);
    const [resetPosition, setResetPosition] = useState(false);
    const [api, contextHolder] = notification.useNotification();

    const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm:ss'));
    const jointRef = useRef<{ handleReset: () => void } | null>(null);

    const API_URL = "https://project-final-gg.onrender.com";

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs().format('HH:mm:ss')), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/status`);
                const data = await res.json();

                setIsConnected(data.esp32_status === "online");
            } catch (err) {
                console.error("Falied to fetch Robotic Arm Status");

                setIsConnected(false);
            }
        };

        fetchStatus();

        const interval = setInterval(fetchStatus, 10000);

        return () => clearInterval(interval);
    }, []);

    const onClickReset = () => {
        if (resetPosition) return;

        setResetPosition(true);
        jointRef.current?.handleReset();

        api.warning({
            message: 'Infomation',
            description: `กำลังรีเซ็ตตำแหน่งแขนกล กรุณารอสักครู่...`,
            placement: 'topRight',
            duration: 3,
            className:"rounded-2xl border border-orange-200"
        })

        setTimeout(() => {
            setResetPosition(false);
        }, 3000)
    }

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans">
            {contextHolder}
            <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <img src="/images/mechanical-arm.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold text-slate-800 uppercase tracking-tight">Robotic Arm Control</span>
                </div>

                <div className="flex items-center gap-3 text-sm font-bold">
                    <div className="flex items-center gap-2">
                        <div className="relative flex h-2 w-2">
                            {isConnected && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                        <span className={`uppercase tracking-wider ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
                            Robotic Arm {isConnected ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    <span className="text-slate-300 font-light">|</span>

                    <div className="text-slate-600 font-mono">
                        {currentTime}
                    </div>
                </div>
            </header>

            <main className="flex flex-row flex-1 p-4 gap-4 overflow-hidden">

                <div className="flex flex-row gap-4 flex-1 overflow-hidden">
                    <div className="aspect-square h-full max-h-full">

                        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl h-full w-full overflow-hidden">

                            <DeepCameraContent />

                        </div>
                    </div>
                    <div className="flex-1 bg-white shadow-sm border border-gray-200 rounded-2xl flex flex-col overflow-hidden">

                        <div className='px-6 pt-4 flex-1 flex flex-col overflow-hidden'>

                            <style>
                                {`
                    .ant-tabs-tab-btn {
                        color: #94a3b8 !important;
                        font-weight: 700 !important;
                        font-size: 16px !important;
                    }

                    .ant-tabs-tab-active .ant-tabs-tab-btn {
                        color: #fb923c !important;
                    }

                    .ant-tabs-tab:hover .ant-tabs-tab-btn {
                        color: #fb923c !important;
                    }
                    `}
                            </style>

                            <ConfigProvider
                                theme={{
                                    components: {
                                        Tabs: {
                                            itemSelectedColor: "#fb923c",
                                            inkBarColor: "#fb923c",
                                            itemHoverColor: "#fb923c",
                                            titleFontSize: 16
                                        }
                                    }
                                }}
                            >

                                <Tabs
                                    className="flex-1 flex flex-col overflow-hidden"
                                    activeKey={activeTab}
                                    onChange={(key) => setActiveTab(key)}
                                    items={[
                                        {
                                            key: '1',
                                            label: 'Joint Controls',
                                            children: (
                                                <div className="h-full w-full overflow-hidden">
                                                    <JointControlsContent
                                                        onRef={(ref) => (jointRef.current = ref)}
                                                    />
                                                </div>
                                            )
                                        },
                                        {
                                            key: '2',
                                            label: 'Object Detect',
                                            children: <ObjectDetectContent />
                                        },
                                    ]}
                                />

                            </ConfigProvider>
                        </div>

                        {activeTab === '1' && (
                            <div className="px-6 pb-6 bg-white">

                                <Divider className="mt-0 mb-4" />

                                <div className="flex justify-center">

                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={onClickReset}
                                        disabled={resetPosition}
                                        className="
                                        h-11 
                                        w-full 
                                        max-w-70 
                                        rounded-full 
                                        !border-orange-400 
                                        !text-orange-500 
                                        font-bold 
                                        hover:!text-red-600
                                        hover:!border-red-600 
                                        transition-all 
                                        shadow-sm"
                                    >
                                        {resetPosition ? 'Resetting...' : 'Reset Position'}
                                    </Button>

                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="hidden lg:flex flex-col gap-4 w-96 h-full overflow-hidden">
                    <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 h-[35%] overflow-hidden">
                        <AIDetectContent />
                    </div>

                    <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 flex-1 overflow-hidden">
                        <ActivityLogsContent />
                    </div>
                </div>
            </main>

        </div>
    );
}