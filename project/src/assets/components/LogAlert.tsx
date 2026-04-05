import { useState } from "react";
import { Modal, Table, Tag, DatePicker, Space, Empty } from "antd";
import dayjs, { Dayjs } from "dayjs";

export default function LogAlert() {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs()); // Defualt = Today

  // Data
  const data = [
    {
      key: "1",
      time: "09:56:32",
      type: "SUCCESS",
      message: "Move Completed: Position 1 → Position 2",
      date: "02-04-2026",
    },
    {
      key: "2",
      time: "09:54:44",
      type: "ERROR",
      message: "Object not detected.",
      date: "01-04-2026",
    }
  ];

  // Filter
  const filteredData = selectedDate 
    ? data.filter(
      (item) => item.date === selectedDate.format("DD-MM-YYYY")
      )
    : data;

  // Columns
  const columns = [
    {
      title: "Date",
      dataIndex: "date",
    },
    {
      title: "Time",
      dataIndex: "time",
    },
    {
      title : "Status",
      dataIndex: "type",
      render: (type: string) => {
        let color = "default";
        if (type === "SUCCESS") color = "green";
        if (type === "ERROR") color = "red";

        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: "Message",
      dataIndex: "message",
    },
  ];

  return (
    <>
      <div className="log-alert-card">
        <div className="log-alert-header">
          <span className="section-pill">Log Alert</span>
          <span className="bell-icon">🔔</span>
        </div>

        <div className="log-list">
          <div className="log-item success">
            <span className="log-dot green"></span>
            <div className="log-content">
              <div className="log-time">09:56:32</div>
              <div className="log-message">[INFO] Moving: Position 1 → Position 2</div>
              <div className="log-message">[SUCCESS] Move completed: Position 1 → Position 2</div>
            </div>
          </div>

          <div className="log-item error">
            <span className="log-dot red"></span>
            <div className="log-content">
              <div className="log-time">09:54:44</div>
              <div className="log-message">[INFO] Moved from Position 1 → Position 2</div>
              <div className="log-message">[ERROR] Object note detected.</div>
            </div>
          </div>
        </div>

        {/* Button */}
        <button className="view-all-btn" onClick={() => setOpen(true)}>
          View All +
        </button>
      </div>
      
      {/* Modal */}
      <Modal
        title="All Logs"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={900}
      >
        {/* Filter */}
        <Space style={{ marginBottom: 16}}>
          <span>Select Date:</span>

          <DatePicker 
            value={selectedDate}
            allowClear
            onChange={(date) => setSelectedDate(date)} 
          />
        </Space>

        {/* Table */}
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
  );
}