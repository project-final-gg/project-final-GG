import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-5 flex flex-col gap-4">
      <Link to="/home" className="hover:text-blue-400">Home</Link>
      <Link to="/deepcam" className="hover:text-blue-400">Deep Camera</Link>
    </div>
  );
}