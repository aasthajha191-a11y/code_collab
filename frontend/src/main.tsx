import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Mount the React application into the #root div in index.html
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* BrowserRouter enables client-side routing via react-router-dom */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
