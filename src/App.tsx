import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes'
import Sidebar from './component/layout/Sidebar'
import './App.css'

function App() {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <BrowserRouter>
      <div style={{ display: 'flex' }}>
        <Sidebar onToggle={setCollapsed} />
        <main style={{ marginLeft: collapsed ? '56px' : '150px', flex: 1, minHeight: '100vh', padding: '1.5rem', transition: 'margin-left 0.2s ease' }}>
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
