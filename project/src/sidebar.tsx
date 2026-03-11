import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-5 flex flex-col gap-4">
      <span className="flex flex-col gap-2">
        <a href="/tab1" className="hover:text-blue-400">tab 1</a>
        <a href="/tab2" className="hover:text-blue-400">tab 2</a>
        <a href="/tab3" className="hover:text-blue-400">tab 3</a>
      </span>
    </div>
  );
}