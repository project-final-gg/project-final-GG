import { useState } from "react"
import Control from "./Control"
import { Modal, Table, Tag, DatePicker, Space, Empty } from "antd"
import { Dayjs } from "dayjs"

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
  const showLogs = logs.slice(0 , 6);

  const getTime = () => {
    const now = new Date()
    const date = now.toLocaleDateString("en-GB")
    const time = now.toLocaleTimeString("en-GB")
    return `${date} (${time})`
  }

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

    const time = getTime()

    // INFO
    // setLogs(prevLogs => [
    //   {
    //     time,
    //     type: "info",
    //     messages: [`[INFO] Moving: ${name} ${prev} -> ${value}`],
    //   },
    //   ...prevLogs,
    // ])

    try {
      const res = await fetch("https://project-final-gg.onrender.com/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      await res.json()

      // SUCCESS
      setLogs(prevLogs => [
        {
          time,
          type: "success",
          messages: [
            `[INFO] Moving: ${name} ${prev} -> ${value}`,
            `[SUCCESS] Move complete`,
          ],
        },
        ...prevLogs,
      ])

      setPrevAngles((prevState: any) => ({
        ...prevState,
        [name]: value,
      }))
    } catch (err) {
      setLogs(prevLogs => [
        {
          time,
          type: "error",
          messages: [
            `[INFO] Moving: ${name} ${prev} -> ${value}`,
            `[ERROR] Connection Failed`,
          ],
        },
        ...prevLogs,
      ])
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
      item => item.date === selectedDate.format("DD/MM/YYYY")
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

      {/* Modal */}
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