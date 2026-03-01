import { useState, useEffect } from 'react'
import { supabase, supabaseConfigured } from '../supabaseClient'
import type { User } from '@supabase/supabase-js'

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  created_at: string
  updated_at: string
}

type HistoryEntry = {
  id: number
  user_id: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

type UserProfile = {
  profile: Profile | null
  history: HistoryEntry[]
  loading: boolean
  error: string | null
}

export default function ProfilePage({ user }: { user: User | null }) {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    profile: null,
    history: [],
    loading: true,
    error: null,
  })
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || !supabaseConfigured || !supabase) return

    async function loadProfileAndHistory() {
      try {
        setUserProfile(prev => ({ ...prev, loading: true, error: null }))

        // Load profile
        if (!supabase) return
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }

        // Load history
        if (!supabase) return
        const { data: historyData, error: historyError } = await supabase
          .from('user_history')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (historyError) {
          throw historyError
        }

        setUserProfile({
          profile: profileData as Profile,
          history: historyData as HistoryEntry[],
          loading: false,
          error: null,
        })

        setFullName(profileData?.full_name || '')
      } catch (err) {
        console.error('Error loading profile:', err)
        setUserProfile(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load profile data'
        }))
      }
    }

    loadProfileAndHistory()
  }, [user])

  const handleUpdateProfile = async () => {
    if (!user || !supabaseConfigured || !supabase) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      // Update local profile
      setUserProfile(prev => ({
        ...prev,
        profile: {
          ...prev.profile!,
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString(),
        }
      }))

      setEditing(false)
    } catch (err) {
      console.error('Error updating profile:', err)
      setUserProfile(prev => ({
        ...prev,
        error: 'Failed to update profile'
      }))
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login': return '🔐'
      case 'logout': return '🚪'
      case 'data_export': return '📊'
      case 'data_clear': return '🗑️'
      case 'pump_on': return '💧'
      case 'pump_off': return '✋'
      case 'moisture_target_update': return '🎯'
      default: return '📝'
    }
  }

  if (!user) return null

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>User Profile</h1>
        <p className="profile-subtitle">Manage your account and view activity history</p>
      </div>

      {userProfile.error && (
        <div className="error-banner">
          {userProfile.error}
        </div>
      )}

      <div className="profile-grid">
        {/* Profile Information Card */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Profile Information</h2>
            <button
              className="secondary-button"
              onClick={() => setEditing(!editing)}
              disabled={saving}
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {userProfile.loading ? (
            <div className="loading-spinner">Loading profile...</div>
          ) : (
            <div className="profile-details">
              <div className="profile-field">
                <label>Email</label>
                <div className="profile-value">{user.email}</div>
              </div>

              <div className="profile-field">
                <label>Full Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="profile-input"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="profile-value">
                    {userProfile.profile?.full_name || 'Not set'}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label>Member Since</label>
                <div className="profile-value">
                  {userProfile.profile?.created_at 
                    ? formatDate(userProfile.profile.created_at)
                    : 'Unknown'}
                </div>
              </div>

              <div className="profile-field">
                <label>Last Updated</label>
                <div className="profile-value">
                  {userProfile.profile?.updated_at
                    ? formatDate(userProfile.profile.updated_at)
                    : 'Never'}
                </div>
              </div>

              {editing && (
                <div className="profile-actions">
                  <button
                    className="primary-button"
                    onClick={handleUpdateProfile}
                    disabled={saving || !userProfile.profile}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity History Card */}
        <div className="history-card">
          <div className="history-header">
            <h2>Activity History</h2>
            <span className="history-count">
              {userProfile.history.length} entries
            </span>
          </div>

          {userProfile.loading ? (
            <div className="loading-spinner">Loading history...</div>
          ) : userProfile.history.length === 0 ? (
            <div className="empty-history">
              <p>No activity recorded yet.</p>
              <p className="empty-subtext">
                Your actions like data exports, pump controls, and settings changes will appear here.
              </p>
            </div>
          ) : (
            <div className="history-list">
              {userProfile.history.map((entry) => (
                <div key={entry.id} className="history-item">
                  <div className="history-icon">
                    {getActivityIcon(entry.action)}
                  </div>
                  <div className="history-content">
                    <div className="history-action">{entry.action.replace('_', ' ')}</div>
                    <div className="history-time">{formatDate(entry.created_at)}</div>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <div className="history-details">
                        {JSON.stringify(entry.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}