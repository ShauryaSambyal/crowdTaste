import axios from 'axios'
import React, { useState } from 'react'

const Searchbar = () => {
    const apiKey = import.meta.env.API_KEY
    const [restaurants, setRestaurants] = useState([])
    const [loading, setLoading] = useState(false)
    const [location, setLocation] = useState('Banglore, Karnataka')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRestaurant, setSelectedRestaurant] = useState(null)
    const [reviews, setReviews] = useState([])

    const restaurantAPI = axios.create({
        baseURL: 'https://api.foursquare.com/v3',
        headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
        }
    })

    const searchRestaurants = async ()=>{
        if (!searchQuery.trim()){
            alert('Please enter a restaurant name')
            return
        }
        setLoading(true)
        try {
            const response = await restaurantAPI.get('/places/search', {
                params: {
                    query: searchQuery,
                    near: location,
                    limit: 10
                }
            })
            setRestaurants(response.data.results || [])
        } catch(error) {
            console.error("Error: ", error)
            setRestaurants([])
        } finally{
            setLoading(false)
        }
    }
    const onclick = (e)=>{
        e.preventDefault()
    }

    console.log(restaurants)
  return (
    <>
        <div className='text-center py-20'>
            <div>
                <p className='text-sm text-blue-100 font-light rounded-4xl bg-gradient-to-r from-blue-800 to-blue-600 inline-block px-3 py-2 mb-6 hover:cursor-pointer'><i className="ri-restaurant-line px-2"></i>Spotify for Restaurant Discovery</p>
                <h1 className='text-5xl font-light text-white mb-6 px-3 sm:text-7xl'>Discover restaurants that <h2 className='mt-2 bg-gradient-to-r from-white to-blue-800 bg-clip-text text-transparent text-6xl'>speaks to you</h2></h1>
                <h2 className='hidden sm:block px-2 font-light text-blue-400 text-lg mb-6 max-w-2xl mx-auto leading-relaxed'>Skip the endless scrolling. Get ultra-short summaries of every restaurant based on thousands of real reviews. Find your perfect place in seconds.</h2>
            </div>
            <form action="" className='px-6'>
                <input type="text" placeholder='Search for restaurants...' className='bg-gray-400 px-18 border-3 border-transparent py-4 hover:border-3 hover:border-blue-500 duration-200 ease-in rounded-4xl'/>
                <button onClick={onclick} className='mx-4 px-8 py-4 text-blue-600 border-2 border-blue-600 rounded-4xl my-3 hover:bg-blue-600 hover:text-white duration-150'>Search</button>
            </form>
            
        </div>
    </>
  )
}

export default Searchbar