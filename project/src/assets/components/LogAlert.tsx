import { useState, useEffect } from "react";
import Control from "./Control";
import { Modal, Table, Tag, DatePicker, Space } from "antd";
import { Dayjs } from "dayjs";
import { db } from "../../firebase"; // ตรวจสอบ path ไฟล์ firebase ของคุณ
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
} from "firebase/firestore";

type LogType = "info" | "success" | "error";

interface LogItem {
  time: string;
  messages: string[];
  type: LogType;
}

export default function LogAlert() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  // State สำหรับเก็บค่าตำแหน่งล่าสุดจาก Firebase
  const [currentAngles, setCurrentAngles] = useState<Record<string, number>>({
    base: 90,
    shoulder: 0,
    elbow: 0,
    wrist_v: 180,
    wrist_r: 90,
    gripper: 45,
  });

  useEffect(() => {
    const qLogs = query(collection(db, "logs"), orderBy("time", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const data: LogItem[] = snapshot.docs.map((doc) => {
        const d: any = doc.data();
        const dateObj = d.time?.toDate?.() || new Date();
        return {
          time: `${dateObj.toLocaleDateString("en-GB")} (${dateObj.toLocaleTimeString("en-GB")})`,
          type: d.status,
          messages: [d.message],
        };
      });
      setLogs(data);
    });

    const unsubStatus = onSnapshot(doc(db, "robot_status", "current"), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentAngles(docSnap.data() as Record<string, number>);
      }
    });

    return () => {
      unsubLogs();
      unsubStatus();
    };
  }, []);

  const sendData = async (name: string, value: number, prev: number) => {
    const data = {
      joint: name,
      angle: name === "gripper" ? 90 - value : value,
    };

    try {
      const res = await fetch("https://project-final-gg.onrender.com/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await res.json();

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

  const tableData = logs.map((log, index) => {
    const [date, time] = log.time.split(" ");
    return {
      key: index,
      date,
      time: time?.replace("(", "").replace(")", ""),
      type: log.type.toUpperCase(),
      message: log.messages.join(" "),
    };
  });

  const filteredData = selectedDate
    ? tableData.filter((item) => item.date === selectedDate.format("DD/MM/YYYY"))
    : tableData;

  const columns = [
    { title: "Date", dataIndex: "date" },
    { title: "Time", dataIndex: "time" },
    {
      title: "Status",
      dataIndex: "type",
      render: (type: string) => (
        <Tag color={type === "SUCCESS" ? "green" : type === "ERROR" ? "red" : "gold"}>{type}</Tag>
      ),
    },
    { title: "Message", dataIndex: "message" },
  ];

  return (
    <>
      <Control sendData={sendData} initialAngles={currentAngles} />

      <div className="log-alert-card">
        <div className="log-alert-header">
          <span className="section-pill">Log Alert</span>
          <span className="bell-icon">🔔</span>
        </div>
        <div className="log-list">
          {logs.length === 0 && <div className="log-empty">No logs yet...</div>}
          {logs.slice(0, 6).map((log, index) => (
            <div key={index} className={`log-item ${log.type}`}>
              <span className={`log-dot ${log.type === "success" ? "green" : log.type === "error" ? "red" : "yellow"}`}></span>
              <div className="log-content">
                <div className="log-time">{log.time}</div>
                <div className="log-message">{log.messages[0]}</div>
              </div>
            </div>
          ))}
          <button className="view-all-btn" onClick={() => setOpen(true)}>View All +</button>
        </div>
      </div>

      <Modal title="All Logs" open={open} onCancel={() => setOpen(false)} footer={null} width={900}>
        <Space style={{ marginBottom: 16 }}>
          <span>Select Date:</span>
          <DatePicker value={selectedDate} allowClear onChange={(date) => setSelectedDate(date)} />
        </Space>
        <Table columns={columns} dataSource={filteredData} pagination={{ pageSize: 5 }} scroll={{ y: 300 }} />
      </Modal>
    </>
  );
}