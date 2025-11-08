import React, { useState } from 'react';
import restaurantData from '../data.json'
import RestaurantCard from './RestaurantCard';
import { Link } from 'react-router-dom';



const Searchbar = () => {
    const restaurantImages = [
        '/restaurant_images/rest1.jpg',
        '/restaurant_images/rest2.jpg',
        '/restaurant_images/rest3.jpg',
        '/restaurant_images/rest4.jpg',
        '/restaurant_images/rest5.jpg',
        '/restaurant_images/rest6.jpg',
    ]
    const foodImages = [
        '/food_images/food1.jpg',
        '/food_images/food2.jpg',
        '/food_images/food3.jpg',
        '/food_images/food4.jpg',
        '/food_images/food5.jpg',
        '/food_images/food6.jpg',
        '/food_images/food7.jpg',
        '/food_images/food8.jpg',
        '/food_images/food9.jpg',
        '/food_images/food10.jpg',        
    ]
    const [currentRestaurantImage, setCurrentRestaurantImage] = useState(restaurantImages[0])
    const [currentFoodImage, setCurrentFoodImage] = useState(foodImages[0])
    const [searchQuery, setSearchQuery] = useState('');
    const [filtered, setFiltered] = useState([])
    const [selectedRestaurant, setSelectedRestaurant] = useState([])

    const getRandomRestaurantImage = () =>{
        const randomIndex = Math.floor(Math.random() * restaurantImages.length)
        setCurrentRestaurantImage(restaurantImages[randomIndex])
    }
    const getRandomFoodImages = () => {
        const shuffled = [...foodImages].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        setCurrentFoodImage(selected);
    };



    const searchRestaurants = () =>{
        const restaurant = restaurantData.filter(restaurants =>{
            return restaurants.name.toLowerCase().includes(searchQuery.toLowerCase())
        })
        setFiltered(restaurant)
    }

    const onclick = (e) => {
        e.preventDefault();
        searchRestaurants();
        getRandomRestaurantImage()
        getRandomFoodImages()
    };
    
  return (
    <>
        <div className='text-center py-10 px-4 sm:py-20'>
            <div className='max-w-5xl mx-auto py-15 sm:py-0'>
                <p className='text-xs sm:text-sm text-blue-100 font-light rounded-4xl bg-gradient-to-r from-blue-800 to-blue-600 mt-4 sm:mt-8 inline-block px-3 py-2 mb-4 sm:mb-6 hover:cursor-pointer'>
                    <i className="ri-restaurant-line px-1 sm:px-2"></i>
                    Spotify for Restaurant Discovery
                </p>
                <h1 className='text-3xl sm:text-5xl lg:text-7xl font-light text-white mb-4 sm:mb-6 px-2'>
                    Discover restaurants that 
                    <span className='block mt-2 bg-gradient-to-r from-white to-blue-800 bg-clip-text text-transparent text-4xl sm:text-6xl lg:text-7xl'>
                        speaks to you
                    </span>
                </h1>
                <h2 className='hidden sm:block px-2 font-light text-blue-400 text-base sm:text-lg mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed'>
                    Skip the endless scrolling. Get ultra-short summaries of every restaurant based on thousands of real reviews. Find your perfect place in seconds.
                </h2>
            </div>

            <form className='px-4 sm:px-6 max-w-4xl mx-auto'>
                <div className='flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4'>
                    <input  
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                        }} 
                        placeholder='Search for restaurants...' 
                        className='w-full sm:w-auto bg-gray-400 px-4 sm:px-6 lg:px-8 py-3 border-2 border-transparent hover:border-blue-500 duration-200 ease-in rounded-full text-sm sm:text-base focus:outline-none focus:border-blue-500'
                    />
                    <button 
                        onClick={onclick} 
                        type='button' 
                        className='w-full sm:w-auto px-6 sm:px-8 py-3 text-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-600 hover:text-white duration-150 text-sm sm:text-base font-medium whitespace-nowrap'
                    >
                        Search
                    </button>
                </div>

                <div className="mt-3 py-2 px-2 sm:px-10 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto overflow-y-hidden scrollbar-hide">
                    <div className='flex gap-2 border border-white rounded-full py-2 px-3 sm:px-4 hover:border-blue-600 duration-150 hover:cursor-pointer whitespace-nowrap flex-shrink-0'>
                        <h2 className='text-white text-xs sm:text-sm'>Ambience</h2>
                        <i className="ri-bowl-fill text-white text-sm sm:text-base"></i>
                    </div>
                    <div className='flex gap-2 border border-white rounded-full py-2 px-3 sm:px-4 hover:border-blue-600 duration-150 hover:cursor-pointer whitespace-nowrap flex-shrink-0'>
                        <h2 className='text-white text-xs sm:text-sm'>Cuisine</h2>
                        <i className="ri-restaurant-2-line text-white text-sm sm:text-base"></i>
                    </div>
                    <div className='flex gap-2 border border-white rounded-full py-2 px-3 sm:px-4 hover:border-blue-600 duration-150 hover:cursor-pointer whitespace-nowrap flex-shrink-0'>
                        <h2 className='text-white text-xs sm:text-sm'>Vibe</h2>
                        <i className="ri-goblet-line text-white text-sm sm:text-base"></i>
                    </div>
                    <div className='flex gap-2 border border-white rounded-full py-2 px-3 sm:px-4 hover:border-blue-600 duration-150 hover:cursor-pointer whitespace-nowrap flex-shrink-0'>
                        <h2 className='text-white text-xs sm:text-sm'>Taste</h2>
                        <i className="ri-bread-fill text-white text-sm sm:text-base"></i>
                    </div>
                </div>
            </form>

            {filtered.length > 0 && (
                <div className='mt-8 sm:mt-10 px-4 sm:px-8 max-w-7xl mx-auto'>
                    <h3 className='text-white text-xl sm:text-2xl mb-4 sm:mb-6 text-left sm:text-center'>
                        Search Results ({filtered.length})
                    </h3>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
                        {filtered.map((restaurant, index) => (
                            <Link
                                to={`/restaurant/${restaurant.id}`}
                                key={restaurant.id}
                                state={{ restaurant }}
                            >
                                <div 
                                key={index} 
                                className='bg-gray-600 p-4 sm:p-6 rounded-2xl border-2 border-gray-400 hover:border-gray-500 transition duration-200 hover:cursor-pointer flex flex-col items-center' onClick={(restaurant)=>{
                                    handleRestaurantClick(restaurant)
                                }}
                                >
                                    <h4 className='text-white text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center'>
                                        {restaurant.name}
                                    </h4>
                                    <img 
                                        src={currentRestaurantImage} 
                                        alt="Restaurant_image" 
                                        className='rounded-2xl mb-4 sm:mb-5 w-full h-40 sm:h-48 object-cover' 
                                    />
                                    <div className='text-center w-full'>
                                        <p className='text-xs sm:text-sm text-gray-300 font-bold mb-1'>
                                            Location:
                                        </p>
                                        <h4 className='text-blue-200 text-xs sm:text-sm'>
                                            {restaurant.location || restaurant.location_example}
                                        </h4>
                                    </div>
                                </div>
                            </Link>
                            
                        ))}
                    </div>
                </div>
            )}
        </div>

    </>
  )
}

export default Searchbar;