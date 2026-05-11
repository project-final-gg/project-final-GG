import React, { useState, useEffect } from 'react';
import { Slider, Spin } from 'antd';
import { db } from "../../firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";

interface JointControlsContentProps {
    onRef: (ref: { handleReset: () => void }) => void;
}

export default function JointControlsContent({ onRef }: JointControlsContentProps) {
    const initialJointsConfig = [
        { name: 'base', value: 90, max: 180 },
        { name: 'shoulder', value: 0, max: 180 },
        { name: 'elbow', value: 0, max: 180 },
        { name: 'wrist_v', value: 180, max: 180 },
        { name: 'wrist_r', value: 90, max: 180 },
        { name: 'gripper', value: 45, max: 90 },
    ];

    const [joints, setJoints] = useState(initialJointsConfig);
    const [tempPrevValues, setTempPrevValues] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true); // เพิ่ม loading เพื่อรอโหลดค่าจาก Firebase

    // 1. ดึงข้อมูลล่าสุดจาก Firebase เมื่อโหลด Component (ช่วยให้ค่าไม่หายตอนรีเฟรช)
    useEffect(() => {
        const fetchCurrentStatus = async () => {
            try {
                const docRef = doc(db, "robot_status", "current");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const latestData = docSnap.data();
                    const updatedJoints = initialJointsConfig.map(joint => ({
                        ...joint,
                        value: latestData[joint.name] !== undefined ? latestData[joint.name] : joint.value
                    }));
                    setJoints(updatedJoints);
                }
            } catch (error) {
                console.error("Error fetching latest status:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentStatus();
    }, []);

    // 2. คอยฟังการเปลี่ยนแปลงแบบ Real-time (ถ้ามีเครื่องอื่นสั่ง งานก็จะอัปเดตที่หน้าจอเราด้วย)
    useEffect(() => {
        const unsubStatus = onSnapshot(doc(db, "robot_status", "current"), (docSnap) => {
            if (docSnap.exists()) {
                const latestData = docSnap.data();
                setJoints(prevJoints => prevJoints.map(joint => ({
                    ...joint,
                    value: latestData[joint.name] !== undefined ? latestData[joint.name] : joint.value
                })));
            }
        });
        return () => unsubStatus();
    }, []);

    const sendData = async (name: string, value: number, prev: number) => {
        if (value === prev) return; // ถ้าค่าไม่เปลี่ยนไม่ต้องส่ง

        const data = {
            joint: name,
            angle: name === "gripper" ? 90 - value : value,
        };

        try {
            await fetch("https://project-final-gg.onrender.com/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            await addDoc(collection(db, "logs"), {
                message: `[INFO] Moving: ${name} ${prev} -> ${value}`,
                status: "success",
                time: serverTimestamp(),
            });

            await setDoc(doc(db, "robot_status", "current"), { [name]: value }, { merge: true });
        } catch (err) {
            await addDoc(collection(db, "logs"), {
                message: `[ERROR] Moving failed: ${name}`,
                status: "error",
                time: serverTimestamp(),
            });
        }
    };

    const handleReset = async () => {
        for (const joint of initialJointsConfig) {
            const currentVal = joints.find(j => j.name === joint.name)?.value || 0;
            await sendData(joint.name, joint.value, currentVal);
        }
        setJoints(initialJointsConfig);
    };

    useEffect(() => {
        onRef({ handleReset });
    }, [onRef, joints]);

    const handleSliderChange = (index: number, newValue: number) => {
        const updatedJoints = [...joints];
        updatedJoints[index].value = newValue;
        setJoints(updatedJoints);
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spin tip="Loading Status..." /></div>;

    return (
        <div className="flex flex-col h-full w-full">
            <div className="grid grid-cols-6 h-full w-full gap-2 py-2">
                {joints.map((joint, index) => (
                    <div key={index} className="flex flex-col items-center h-full min-h-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex-shrink-0">
                            {joint.name}
                        </span>

                        <div className="flex-1 w-full flex justify-center py-2 min-h-[150px]">
                            <Slider
                                vertical
                                min={0}
                                max={joint.max}
                                value={joint.value}
                                onChange={(val) => handleSliderChange(index, val)}
                                onFocus={() => {
                                    setTempPrevValues(prev => ({ ...prev, [joint.name]: joint.value }));
                                }}
                                onAfterChange={(val) => {
                                    const lastValue = tempPrevValues[joint.name] ?? joint.value;
                                    sendData(joint.name, val, lastValue);
                                }}
                                trackStyle={{ backgroundColor: '#fb923c' }}
                                handleStyle={{ borderColor: '#fb923c', width: 12, height: 12 }}
                            />
                        </div>

                        <div className="flex flex-col items-center flex-shrink-0 mt-2">
                            <span className="text-[8px] text-gray-400 mb-1">Max: {joint.max}°</span>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 border-orange-400 flex items-center justify-center shadow-sm">
                                <span className="text-orange-600 font-bold text-[9px] md:text-xs">
                                    {joint.value}°
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}