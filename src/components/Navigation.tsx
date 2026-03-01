import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { User } from '@supabase/supabase-js'

interface NavigationProps {
  user: User | null
  currentPage: 'dashboard' | 'automation' | 'profile'
  onPageChange: (page: 'dashboard' | 'automation' | 'profile') => void
  onSignOut: () => void
}

export default function Navigation({ user, currentPage, onPageChange, onSignOut }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    if (!supabase) return
    try {
      await supabase.auth.signOut()
      onSignOut()
    } catch (err) {
      console.error('Sign out error', err)
    }
  }

  return (
    <nav className="app-navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>Arduino Dashboard</h1>
        </div>
        
        <div className="nav-links">
          <button
            className={`nav-link ${currentPage === 'dashboard' ? 'nav-link--active' : ''}`}
            onClick={() => onPageChange('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${currentPage === 'automation' ? 'nav-link--active' : ''}`}
            onClick={() => onPageChange('automation')}
          >
            Automation
          </button>
          <button
            className={`nav-link ${currentPage === 'profile' ? 'nav-link--active' : ''}`}
            onClick={() => onPageChange('profile')}
          >
            Profile
          </button>
        </div>

        <div className="nav-user">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-status">Online</span>
          </div>
          
          <div className="nav-actions">
            <button
              type="button"
              className="secondary-button nav-button"
              onClick={() => onPageChange('profile')}
            >
              Profile
            </button>
            <button
              type="button"
              className="danger-button nav-button"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <button
            className={`mobile-link ${currentPage === 'dashboard' ? 'mobile-link--active' : ''}`}
            onClick={() => {
              onPageChange('dashboard')
              setIsMenuOpen(false)
            }}
          >
            Dashboard
          </button>
          <button
            className={`mobile-link ${currentPage === 'automation' ? 'mobile-link--active' : ''}`}
            onClick={() => {
              onPageChange('automation')
              setIsMenuOpen(false)
            }}
          >
            Automation
          </button>
          <button
            className={`mobile-link ${currentPage === 'profile' ? 'mobile-link--active' : ''}`}
            onClick={() => {
              onPageChange('profile')
              setIsMenuOpen(false)
            }}
          >
            Profile
          </button>
          <div className="mobile-divider" />
          <button
            className="mobile-link"
            onClick={() => {
              onPageChange('profile')
              setIsMenuOpen(false)
            }}
          >
            View Profile
          </button>
          <button
            className="mobile-link"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  )
}