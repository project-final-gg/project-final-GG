import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Sidebar from './sidebar.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="flex">
      <Sidebar />
      <div className="p-8">
        <div className="w-200 h-310 p-6 bg-white rounded-3xl shadow-lg  ">
          <div className="w-100 h-20 bg-gray-200 rounded-3xl justify-start flex">
            <span className='flex justify-start items-center p-6'>Robotic Arm </span>
          </div>
          <div className="w-188 h-100 bg-gray-200 rounded-3xl mt-6 justify-start flex">
          </div>
          <div className='flex justify-between p-4'>
            <span>Position</span>
            <span>Angle</span>
          </div>
          <div className='flex justify-between p-4'>
            <span>Motor 1</span>
            <span>180°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            defaultValue="180"
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
          <div className='flex justify-between p-4'>
            <span>Motor 2</span>
            <span>180°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            defaultValue="180"
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
          <div className='flex justify-between p-4'>
            <span>Motor 3</span>
            <span>180°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            defaultValue="180"
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
          <div className='flex justify-between p-4'>
            <span>Motor 4</span>
            <span>180°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            defaultValue="180"
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
          <div className='flex justify-between p-4'>
            <span>Motor 5</span>
            <span>180°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            defaultValue="180"
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
          <div className='flex justify-between p-4'>
            <span>Motor 6</span>
            <span>180°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            defaultValue="180"
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
        </div>
      </div>
      <div className="flex flex-1 justify-end"><App /></div>
    </div>
  </StrictMode>,
)
