import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { ConfigProvider, Tabs, Divider, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import JointControlsContent from './assets/components/contentTabsJointControl';
import ObjectDetectContent from './assets/components/contentTabsObjectDetect';
import DeepCameraContent from './assets/components/contentDeepCamera';
import AIDetectContent from './assets/components/contentAiDetect';
import ActivityLogsContent from './assets/components/contentActivityLogs';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('1');
    const [isConnected, setIsConnected] = useState(false);

    const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm:ss'));
    const jointRef = useRef<{ handleReset: () => void } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs().format('HH:mm:ss')), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <img src="/images/mechanical-arm.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold text-slate-800 uppercase tracking-tight">Robotic Arm Control</span>
                </div>

                {/* ส่วนขวา: Text ล้วนพร้อมตัวคั่น */}
                <div className="flex items-center gap-3 text-sm font-bold">
                    {/* Status Section */}
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

                    {/* ตัวคั่น | */}
                    <span className="text-slate-300 font-light">|</span>

                    {/* Time Section */}
                    <div className="text-slate-600 font-mono">
                        {currentTime}
                    </div>
                </div>
            </header>

            <main className="flex flex-row flex-1 p-4 gap-4 overflow-hidden">
                <div className="flex flex-col flex-[1.5] gap-4 h-full overflow-hidden">
                    <div className="h-[45%] w-full bg-white shadow-sm border border-gray-200 rounded-2xl p-4 flex-shrink-0 overflow-hidden">
                        <DeepCameraContent />
                    </div>

                    <div className="flex-1 w-full bg-white shadow-sm border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
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
                            <ConfigProvider theme={{
                                components: { Tabs: { itemSelectedColor: "#fb923c", inkBarColor: "#fb923c", itemHoverColor: "#fb923c", titleFontSize: 16 } }
                            }}>
                                <Tabs
                                    className="flex-1 flex flex-col overflow-hidden"
                                    activeKey={activeTab}
                                    onChange={(key) => setActiveTab(key)}
                                    items={[
                                        {
                                            key: '1',
                                            label: 'Joint Controls',
                                            // ยอมให้ Scroll เฉพาะส่วน Slider
                                            children: (
                                                <div className="h-full w-full overflow-hidden">
                                                    <JointControlsContent onRef={(ref) => (jointRef.current = ref)} />
                                                </div>
                                            )
                                        },
                                        { key: '2', label: 'Object Detect', children: <ObjectDetectContent /> },
                                    ]}
                                />
                            </ConfigProvider>
                        </div>

                        {activeTab === '1' && (
                            <div className="px-6 pb-6 bg-white flex-shrink-0">
                                <Divider className="mt-0 mb-4" />
                                <div className="flex justify-center">
                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={() => jointRef.current?.handleReset()}
                                        className="h-11 w-full max-w-[280px] rounded-full !border-orange-400 !text-orange-500 font-bold hover:!bg-orange-50 transition-all shadow-sm"
                                    >
                                        Reset Position
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="hidden lg:flex flex-col gap-4 w-96 flex-shrink-0 h-full overflow-hidden">
                    <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 h-[35%] flex-shrink-0 overflow-hidden">
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