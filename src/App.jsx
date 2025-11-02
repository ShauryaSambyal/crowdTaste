import React from 'react'
import Navbar from './components/Navbar'
import Searchbar from './components/Searchbar'
import { BrowserRouter, Route, Router, Routes } from 'react-router-dom'
import RestaurantCard from './components/RestaurantCard'


const App = () => {
  return (
    <>
      <BrowserRouter>
          <Routes>
            <Route path='/' element= {<Searchbar />}/>

            <Route path='/restaurant/:id' element={<RestaurantCard />} />
          </Routes>
      </BrowserRouter>

      
    </>
  )
}

export default App
