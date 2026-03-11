import React from "react";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-5 flex flex-col gap-4">
      <span className="flex flex-col gap-2">
        <span className="hover:text-blue-400">tab 1</span>
        <span className="hover:text-blue-400">tab 2</span>
        <span className="hover:text-blue-400">tab 3</span>
      </span>
    </div>
  );
}