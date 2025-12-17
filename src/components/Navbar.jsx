import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <>
        <div className='w-full h-20 fixed bg-transparent backdrop-blur-lg flex items-center justify-between border-1 border-b-gray-800'>
            <div className="flex items-center px-7 relative">
                <img src='/logo.png' className='w-20 h-20 rounded-2xl object-cover' alt="" />
                <h1 className='text-xl font-bold bg-gradient-to-r from-blue-500 via-red-500 to-white bg-clip-text text-transparent hover:cursor-pointer'>Crowd Taste</h1>
            </div>
            
            <div className="flex gap-3 bg-gradient-to-r text-blue-500 px-10">

                <Link className='hover:cursor-pointer font-semibold text-xl border-2 border-transparent hover:border-b-blue-600 duration-150' to="/">Home</Link>

                <Link className='hover:cursor-pointer font-semibold text-xl border-2 border-transparent hover:border-b-blue-600 duration-150' to="/about">About</Link>
            </div>
        </div>
    </>
)
}

export default Navbar