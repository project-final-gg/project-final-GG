import { useState, useEffect } from 'react';
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
        if (value === prev) return;

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
        const jointName = joints[index].name;

        setTempPrevValues((prev) => {
            if (prev[jointName] === undefined) {
                return {
                    ...prev,
                    [jointName]: joints[index].value,
                };
            }
            return prev;
        });

        const updatedJoints = [...joints];
        updatedJoints[index].value = newValue;
        setJoints(updatedJoints);
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spin tip="Loading Status..." /></div>;

    return (
        <div className="w-full h-full overflow-hidden flex items-center">
            <div
                className="
                w-full
                h-full
                flex flex-col
                justify-evenly
                px-[clamp(8px,1vw,24px)]
                py-[clamp(4px,1vh,16px)]
            "
            >
                {joints.map((joint, index) => (
                    <div
                        key={index}
                        className="
                        flex flex-col
                        items-center
                        justify-center
                        flex-1
                        min-h-0
                    "
                    >
                        <div className="flex flex-col items-center">
                            <span
                                className="
                                text-gray-400
                                text-[clamp(8px,0.8vh,12px)]
                                mb-[0.2vh]
                            "
                            >
                                Max: {joint.max}°
                            </span>

                            <div
                                className="
                                rounded-full
                                border-2 border-orange-400
                                flex items-center justify-center
                                shadow-sm

                                w-[clamp(36px,3.8vh,64px)]
                                h-[clamp(36px,3.8vh,64px)]
                            "
                            >
                                <span
                                    className="
                                    text-orange-600
                                    font-bold
                                    text-[clamp(10px,1.2vh,20px)]
                                "
                                >
                                    {joint.value}°
                                </span>
                            </div>

                            <span
                                className="
                                uppercase
                                font-bold
                                text-slate-400

                                mt-[0.3vh]
                                mb-[0.6vh]

                                text-[clamp(9px,0.9vh,14px)]
                            "
                            >
                                {joint.name}
                            </span>
                        </div>

                        <div className="w-full px-[clamp(4px,1vw,20px)]"
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                        >

                            <Slider
                                min={0}
                                max={joint.max}
                                value={joint.value}
                                onChange={(val) =>
                                    handleSliderChange(index, val)
                                }
                                onAfterChange={(val) => {
                                    const lastValue =
                                        tempPrevValues[joint.name] ??
                                        joint.value;

                                    sendData(
                                        joint.name,
                                        val,
                                        lastValue
                                    );

                                    setTempPrevValues((prev) => {
                                        const updated = { ...prev };
                                        delete updated[joint.name];
                                        return updated;
                                    });
                                }}
                                trackStyle={{
                                    backgroundColor: '#fb923c',
                                    height: 4,
                                }}
                                railStyle={{
                                    height: 4,
                                    backgroundColor: '#e5e7eb',
                                }}
                                handleStyle={{
                                    borderColor: '#fb923c',
                                    width: 14,
                                    height: 14,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}