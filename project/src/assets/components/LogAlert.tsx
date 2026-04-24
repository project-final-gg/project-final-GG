import { useState, useEffect } from "react"
import Control from "./Control"
import { Modal, Table, Tag, DatePicker, Space, Empty } from "antd"
import { Dayjs } from "dayjs"
import { db } from "../../firebase"
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore"

type LogType = "info" | "success" | "error"

interface LogItem {
  time: string
  messages: string[]
  type: LogType
}

export default function LogAlert() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)

  const showLogs = logs.slice(0, 6)

  // 🔥 โหลด log จาก Firebase (Realtime)
  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("time", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: LogItem[] = snapshot.docs.map((doc) => {
        const d: any = doc.data()
        const dateObj = d.time?.toDate?.() || new Date()

        const date = dateObj.toLocaleDateString("en-GB")
        const time = dateObj.toLocaleTimeString("en-GB")

        return {
          time: `${date} (${time})`,
          type: d.status,
          messages: [d.message],
        }
      })

      setLogs(data)
    })

    return () => unsubscribe()
  }, [])

  const sendData = async (
    name: string,
    value: number,
    prev: number,
    setPrevAngles: any
  ) => {
    const data = {
      joint: name,
      angle: name === "gripper" ? 90 - value : value,
    }

    try {
      const res = await fetch("https://project-final-gg.onrender.com/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      await res.json()

      // ✅ บันทึก SUCCESS ลง Firebase
      await addDoc(collection(db, "logs"), {
        message: `[INFO] Moving: ${name} ${prev} -> ${value}`,
        status: "success",
        time: serverTimestamp(),
      })

      setPrevAngles((prevState: any) => ({
        ...prevState,
        [name]: value,
      }))
    } catch (err) {
      // ❌ บันทึก ERROR ลง Firebase
      await addDoc(collection(db, "logs"), {
        message: `[ERROR] Moving failed: ${name}`,
        status: "error",
        time: serverTimestamp(),
      })
    }
  }

  const tableData = logs.map((log, index) => {
    const [date, time] = log.time.split(" ")
    return {
      key: index,
      date: date,
      time: time?.replace("(", "").replace(")", ""),
      type: log.type.toUpperCase(),
      message: log.messages.join(" "),
    }
  })

  const filteredData = selectedDate
    ? tableData.filter(
      (item) => item.date === selectedDate.format("DD/MM/YYYY")
    )
    : tableData

  const columns = [
    { title: "Date", dataIndex: "date" },
    { title: "Time", dataIndex: "time" },
    {
      title: "Status",
      dataIndex: "type",
      render: (type: string) => {
        let color = "default"
        if (type === "SUCCESS") color = "green"
        if (type === "ERROR") color = "red"
        if (type === "INFO") color = "gold"
        return <Tag color={color}>{type}</Tag>
      },
    },
    { title: "Message", dataIndex: "message" },
  ]

  return (
    <>
      <Control sendData={sendData} />

      <div className="log-alert-card">
        <div className="log-alert-header">
          <span className="section-pill">Log Alert</span>
          <span className="bell-icon">🔔</span>
        </div>

        <div className="log-list">
          {logs.length === 0 && (
            <div className="log-empty">No logs yet...</div>
          )}

          {showLogs.map((log, index) => (
            <div key={index} className={`log-item ${log.type}`}>
              <span
                className={`log-dot ${log.type === "success"
                    ? "green"
                    : log.type === "error"
                      ? "red"
                      : "yellow"
                  }`}
              ></span>

              <div className="log-content">
                <div className="log-time">{log.time}</div>

                {log.messages.map((msg, i) => (
                  <div key={i} className="log-message">
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button className="view-all-btn" onClick={() => setOpen(true)}>
            View All +
          </button>
        </div>
      </div>

      <Modal
        title="All Logs"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={900}
      >
        <Space style={{ marginBottom: 16 }}>
          <span>Select Date:</span>
          <DatePicker
            value={selectedDate}
            allowClear
            onChange={(date) => setSelectedDate(date)}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 5 }}
          scroll={{ y: 300 }}
          locale={{
            emptyText: <Empty description="No logs found" />,
          }}
        />
      </Modal>
    </>
  )
}