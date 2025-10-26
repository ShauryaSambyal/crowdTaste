import React, { useState } from 'react';
import restaurantData from '../data.json'


const Searchbar = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filtered, setFiltered] = useState([])

    const searchRestaurants = () =>{
        const restaurant = restaurantData.filter(restaurants =>{
            return restaurants.name.toLowerCase().includes(searchQuery.toLowerCase())
        })
        setFiltered(restaurant)

        restaurant.forEach(r =>{
            console.log(r.name)
        })

        
    }

    const onclick = (e) => {
        e.preventDefault();
        searchRestaurants();
    };
    
  return (
    <>
        <div className='text-center py-20'>
            <div>
                <p className='text-sm text-blue-100 font-light rounded-4xl bg-gradient-to-r from-blue-800 to-blue-600 mt-8 sm:mt-15 inline-block px-3 py-2 mb-6 hover:cursor-pointer'><i className="ri-restaurant-line px-2"></i>Spotify for Restaurant Discovery</p>
                <h1 className='text-5xl font-light text-white mb-6 px-3 sm:text-7xl'>Discover restaurants that <h2 className='mt-2 bg-gradient-to-r from-white to-blue-800 bg-clip-text text-transparent text-6xl'>speaks to you</h2></h1>
                <h2 className='hidden sm:block px-2 font-light text-blue-400 text-lg mb-6 max-w-2xl mx-auto leading-relaxed'>Skip the endless scrolling. Get ultra-short summaries of every restaurant based on thousands of real reviews. Find your perfect place in seconds.</h2>
            </div>
            <form action="" className='px-6'>
                <input  type="text" value={searchQuery} onChange={(e) => {
                    setSearchQuery(e.target.value);
                }} placeholder='Search for restaurants...' className='bg-gray-400 px-18 border-3 border-transparent py-3 hover:border-3 hover:border-blue-500 duration-200 ease-in rounded-4xl'/>
                <button onClick={onclick} type='button' className='mx-4 px-8 py-3 text-blue-600 border-2 border-blue-600 rounded-4xl my-3 hover:bg-blue-600 hover:text-white duration-150'>Search</button>

    
                <div className="scroll-hide mt-3 py-2 px-10 flex items-center sm:justify-center gap-2 overflow-x-auto overflow-y-hidden relative">
                    <div className='div flex gap-2 border-1 border-white rounded-4xl py-2 px-2 hover:border-1 hover:border-blue-600 duration-150 hover:cursor-pointer'>
                        <h2 className='text-white'>Ambience</h2>
                        <i className="ri-bowl-fill text-white"></i>
                    </div>
                    <div className='flex gap-2 border-1 border-white rounded-4xl py-2 px-2 hover:border-1 hover:border-blue-600 duration-150 hover:cursor-pointer'>
                        <h2 className='text-white'>Cuisine</h2>
                        <i className="ri-restaurant-2-line text-white"></i>
                    </div>
                    <div className='flex gap-2 border-1 border-white rounded-4xl py-2 px-2 hover:border-1 hover:border-blue-600 duration-150 hover:cursor-pointer'>
                        <h2 className='text-white'>Vibe</h2>
                        <i className="ri-goblet-line text-white"></i>
                    </div>
                    <div className='flex gap-2 border-1 border-white rounded-4xl py-2 px-2 hover:border-1 hover:border-blue-600 duration-150 hover:cursor-pointer'>
                        <h2 className='text-white'>Taste</h2>
                        <i className="ri-bread-fill text-white"></i>
                    </div>
                </div>
            </form>
            {filtered.length > 0 && (
                <div className='mt-10 px-6 max-w-4xl mx-auto'>
                    <h3 className='text-white text-2xl mb-4'>Search Results ({filtered.length})</h3>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {filtered.map((restaurant, index) => (
                            <div key={index} className='bg-gradient-to-br from-blue-900 to-blue-800 p-6 rounded-2xl border-2 border-blue-600 hover:border-blue-400 transition duration-200 hover:cursor-pointer'>
                                <h4 className='text-white text-xl font-semibold mb-2'>{restaurant.name}</h4>
                                <p className='text-blue-200 text-sm'>{restaurant.type}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </>
  )
}

export default Searchbar;