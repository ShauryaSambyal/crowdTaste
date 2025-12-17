import React from 'react'
import Navbar from './components/Navbar'
import Searchbar from './components/Searchbar'
import { BrowserRouter, Route, Router, Routes } from 'react-router-dom'
import RestaurantCard from './components/RestaurantCard'
import About from './components/About'


const App = () => {
  
  return (
    <>
    <Navbar />
      <BrowserRouter>
          <Routes>
            <Route path='/' element= {
              <>
                <Navbar />
                <Searchbar />
              </>
            }/>

            <Route path='/restaurant/:id' element={<RestaurantCard />} />
            <Route path='/about' element={<About />} />
          </Routes>
      </BrowserRouter>

      
    </>
  )
}

export default App
