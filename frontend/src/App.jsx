import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assistant from './pages/Assistant'
import Operations from './pages/Operations'
import Profil from './pages/Profil'
import XAI from './pages/XAI'
import Analytics from './pages/Analytics'
import Simulateur from './pages/Simulateur'
import Supervision from './pages/Supervision'
import Documents from './pages/Documents'
import Historique from './pages/Historique'
import Conversations from './pages/Conversations'
import { authService } from './services/authService'

// Garde de route : redirige vers /login si pas de jeton valide.
function RequireAuth({ children }) {
  const location = useLocation()
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/xai" element={<XAI />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/simulateur" element={<Simulateur />} />
        <Route path="/supervision" element={<Supervision />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/historique" element={<Historique />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
