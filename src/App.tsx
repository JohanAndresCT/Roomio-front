import { Routes, Route } from 'react-router-dom'
import Home from '@pages/Home'
import About from '@pages/About'
import SiteMap from '@pages/SiteMap'
import Dashboard from '@pages/Dashboard'
import Login from '@pages/Login'
import Register from '@pages/Register'
import ForgotPasswordPage from '@pages/ForgotPasswordPage'
import ResetPasswordPage from '@pages/ResetPasswordPage'
import CreateMeeting from '@pages/CreateMeeting'
import JoinMeeting from '@pages/JoinMeeting'
import MeetingLayout from '@pages/MeetingLayout'
import VideoCallRoom from '@pages/VideoCallRoom'
import ProfilePage from '@pages/ProfilePage'
import Navbar from '@components/Navbar'
import Footer from '@components/Footer'
import { AuthProvider } from '@hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'

const App = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigate = (page: string) => {
    const routes: Record<string, string> = {
      landing: '/',
      about: '/about',
      login: '/login',
      register: '/register',
      'forgot-password': '/forgot-password',
      'reset-password': '/reset-password',
      auth: '/dashboard',
      dashboard: '/dashboard',
      sitemap: '/sitemap',
      room: '/room',
      profile: '/profile'
    }
    const path = routes[page] ?? '/'
    navigate(path)
  }

  // Rutas donde NO se muestra Navbar y Footer
  const hideLayoutRoutes = ['/room', '/meeting']
  const shouldHideLayout = hideLayoutRoutes.includes(location.pathname)

  return (
    <AuthProvider>
      <div className="app-root" role="application">
        {!shouldHideLayout && <Navbar />}
        <main id="main" role="main">
          <Routes>
            <Route path="/" element={<Home onNavigate={handleNavigate} />} />
            <Route path="/about" element={<About onNavigate={handleNavigate} />} />
            <Route path="/sitemap" element={<SiteMap onNavigate={handleNavigate} />} />
            <Route path="/login" element={<Login onNavigate={handleNavigate} />} />
            <Route path="/register" element={<Register onNavigate={handleNavigate} />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage onNavigate={handleNavigate} />} />
            <Route path="/reset-password" element={<ResetPasswordPage onNavigate={handleNavigate} />} />
            <Route path="/dashboard" element={<Dashboard onNavigate={handleNavigate} />} />
            <Route path="/create" element={<CreateMeeting />} />
            <Route path="/join" element={<JoinMeeting />} />
            <Route path="/meeting" element={<MeetingLayout />} />
            <Route path="/room" element={<VideoCallRoom onNavigate={handleNavigate} />} />
            <Route path="/profile" element={<ProfilePage onNavigate={handleNavigate} />} />
          </Routes>
        </main>
        {!shouldHideLayout && <Footer onNavigate={handleNavigate} />}
      </div>
    </AuthProvider>
  )
}

export default App
