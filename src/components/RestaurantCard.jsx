import React, { useState } from 'react'
import restaurantData from '../data.json'
import { useLocation, useParams } from 'react-router-dom'


const RestaurantCard = () => {
  const { id } = useParams()
  const location = useLocation()
  const restaurant = location.state?.restaurant
  
  return (
    <>
        <div className='text-white relative block top-50 left-50'>
          <h1 className='text-2xl'>{restaurant.name}</h1>
          <h2 className=''>{restaurant.location || restaurant.location_example}</h2>
        </div>
    </>
  )
}

export default RestaurantCard