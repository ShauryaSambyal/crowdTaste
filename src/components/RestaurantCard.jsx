import React, { useState, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'

const RestaurantCard = () => {
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

  const [currentRestaurantImage, setCurrentRestaurantImage] = useState('')
  const [currentFoodImages, setCurrentFoodImages] = useState([])
  
  const { id } = useParams()
  const location = useLocation()
  const restaurant = location.state?.restaurant

  useEffect(() => {
    const randomRestIndex = Math.floor(Math.random() * restaurantImages.length)
    setCurrentRestaurantImage(restaurantImages[randomRestIndex])
    
    const shuffled = [...foodImages].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 3)
    setCurrentFoodImages(selected)
  }, [])

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white text-xl">Restaurant not found</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-28 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="relative">
            {currentRestaurantImage && (
              <img 
                src={currentRestaurantImage} 
                alt={restaurant.name}
                className="w-full h-64 sm:h-80 md:h-96 object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                {restaurant.name}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-500 rounded-full p-3 flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">Location</h2>
                <p className="text-gray-300 text-base">
                  {restaurant.location || restaurant.location_example || 'Location not specified'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-start space-x-4">
              <div className="bg-green-500 rounded-full p-3 flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">Famous For</h2>
                <p className="text-gray-300 text-base">
                  {restaurant.cuisine || restaurant.famous_for || restaurant.type || 'Delicious food'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Menu Highlights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {currentFoodImages.map((img, index) => (
              <div 
                key={index} 
                className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <img 
                  src={img} 
                  alt={`Food item ${index + 1}`}
                  className="w-full h-48 sm:h-56 md:h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        </div>

        <div>
          
        </div>

      </div>
    </div>
  )
}

export default RestaurantCard