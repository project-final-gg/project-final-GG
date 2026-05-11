import { useState, useEffect } from 'react';
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Modal, Table, DatePicker, Space } from "antd";
import { Dayjs } from "dayjs";

// แผนผังไอคอนตัวเลขตามลำดับ Joint
const jointIcons: Record<string, string> = {
    base: "①",
    shoulder: "②",
    elbow: "③",
    wrist_v: "④",
    wrist_r: "⑤",
    gripper: "⑥",
};

export default function ActivityLogsContent() {
    const [logs, setLogs] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

    useEffect(() => {
        // ดึงข้อมูล Log จาก Firebase เรียงตามเวลาล่าสุด
        const qLogs = query(collection(db, "logs"), orderBy("time", "desc"));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
            const data = snapshot.docs.map((doc) => {
                const d: any = doc.data();
                const dateObj = d.time?.toDate?.() || new Date();
                return {
                    time: dateObj.toLocaleTimeString("en-GB", { hour12: false }),
                    dateRaw: dateObj.toLocaleDateString("en-GB"),
                    message: d.message,
                };
            });
            setLogs(data);
        });
        return () => unsubLogs();
    }, []);

    const formatLogMessage = (rawMsg: string, time: string) => {
        const match = rawMsg.match(/Moving:\s+(\w+)\s+(\d+)\s+->\s+(\d+)/);

        if (match) {
            const [_, name, prev, current] = match;
            const icon = jointIcons[name] || "•";
            return (
                <div className="flex items-center gap-2 text-[12px] py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <span className="text-slate-400 font-mono">[{time}]</span>
                    <span className="text-orange-500 font-bold text-base leading-none">{icon}</span>
                    <span className="text-slate-600 font-bold w-16">{name} :</span>
                    <span className="text-slate-400 w-8 text-right">{prev}°</span>
                    <span className="text-slate-300 mx-1">to</span>
                    <span className="text-slate-800 font-bold w-8 text-right">{current}°</span>
                </div>
            );
        }
        return <div className="text-[11px] text-slate-400 py-1 italic">{rawMsg}</div>;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <style>
                {`
                .custom-scroll-container::-webkit-scrollbar {
                    width: 6px;
                    display: block; /* มั่นใจว่ามีการแสดงผล */
                }
                .custom-scroll-container::-webkit-scrollbar-thumb {
                    background-color: #d9d9d9; /* แสดงสีเทาอ่อนตลอดเวลา */
                    border-radius: 10px;
                }
                .custom-scroll-container::-webkit-scrollbar-track {
                    background: #f8fafc; /* สีพื้นหลังราง Scrollbar อ่อนๆ */
                    border-radius: 10px;
                }
                .custom-scroll-container::-webkit-scrollbar-thumb:hover {
                    background-color: #bfbfbf; /* เข้มขึ้นเมื่อชี้ */
                }
                `}
            </style>

            <div className="flex items-center justify-between mb-4">
                <span className=" text-orange-600 rounded-full text-[16px] font-black uppercase tracking-wider">
                    Activity Logs
                </span>
                <span className="text-lg">🔔</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scroll-container">
                <div className="space-y-0.5">
                    {logs.length === 0 && (
                        <div className="text-center text-gray-300 py-10 text-xs italic">
                            Waiting for activities...
                        </div>
                    )}
                    {logs.slice(0, 20).map((log, index) => (
                        <div key={index}>
                            {formatLogMessage(log.message, log.time)}
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={() => setOpen(true)}
                className="mt-2 w-full py-3 text-[10px] font-bold text-slate-400 hover:text-orange-500 transition-colors uppercase tracking-[0.2em] border-t border-slate-100 cursor-pointer"
            >
                View History Full Log
            </button>

            <Modal title="System History" open={open} onCancel={() => setOpen(false)} footer={null} width={600}>
                <Space style={{ marginBottom: 16 }}>
                    <span className="text-sm text-slate-500">Filter by Date:</span>
                    <DatePicker
                        value={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        format="DD/MM/YYYY"
                    />
                </Space>
                <Table
                    columns={[
                        { title: "Time", dataIndex: "time", width: 100 },
                        { title: "Activity", dataIndex: "message", render: (text) => <span className="text-xs">{text}</span> }
                    ]}
                    dataSource={selectedDate ? logs.filter(l => l.dateRaw === selectedDate.format("DD/MM/YYYY")) : logs}
                    pagination={{
                        pageSize: 10,           
                        showSizeChanger: false, 
                        size: "small",
                        position: ['bottomRight'],
                    }}
                    size="middle"
                />
            </Modal>
        </div>
    );
}