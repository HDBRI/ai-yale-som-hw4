import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import BagDrawer from './components/BagDrawer'
import Ticker from './components/Ticker'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import Login from './pages/Login'
import Signup from './pages/Signup'

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <Ticker />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<p className="page-msg">Page not found.</p>} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
      <BagDrawer />
    </div>
  )
}
