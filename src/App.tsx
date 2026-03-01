import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

import type { User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './supabaseClient'
import Navigation from './components/Navigation'
import ProfilePage from './components/ProfilePage'
import AutomationPage from './components/AutomationPage'
import WeatherPage from './components/WeatherPage'

type SensorRow = {
  id: string
  sensor1: number | null
  sensor2: number | null
  temperature: number | null
  timestamp: string
  created_at: string
}

type ConnectionStatusRow = {
  id: string
  is_connected: boolean
  port: string | null
  baud_rate: number | null
  last_reading: string | null
  updated_at: string
}

type BaudRateOption = 9600 | 19200 | 38400 | 57600 | 115200

const BAUD_RATES: BaudRateOption[] = [9600, 19200, 38400, 57600, 115200]

const STORAGE_CAPACITY_GB = 100

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function formatTimeAgo(value: string | null | undefined) {
  if (!value) return '—'
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return '—'
  const diffSec = Math.max(0, (Date.now() - ts) / 1000)
  if (diffSec < 60) return `${Math.floor(diffSec)}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  const hours = Math.floor(diffSec / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  return `${hours}h ${minutes}m ago`
}

function computeStats(values: Array<number | null | undefined>) {
  const filtered = values.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  )
  if (filtered.length === 0) {
    return { average: '—', min: '—', max: '—' }
  }
  const sum = filtered.reduce((a, b) => a + b, 0)
  const avg = sum / filtered.length
  const min = Math.min(...filtered)
  const max = Math.max(...filtered)
  const fmt = (n: number) => n.toFixed(2)
  return {
    average: fmt(avg),
    min: fmt(min),
    max: fmt(max),
  }
}

function App() {
  const [sensorData, setSensorData] = useState<SensorRow[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [connectionRow, setConnectionRow] = useState<ConnectionStatusRow | null>(null)

  const [serialSupported, setSerialSupported] = useState(false)
  const [selectedPort, setSelectedPort] = useState<WebSerialPort | null>(null)
  const [baudRate, setBaudRate] = useState<BaudRateOption>(115200)
  const [connecting, setConnecting] = useState(false)
  const [serialError, setSerialError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  const supabaseReady = supabaseConfigured && supabase

  // Add connection status logging
  useEffect(() => {
    if (supabaseReady) {
      console.log('✅ Supabase client initialized successfully')
    } else {
      console.warn('⚠️ Supabase client not configured - check your .env file')
    }
  }, [supabaseReady])

  const [targetMoisture, setTargetMoisture] = useState(55)
  const [pumpState, setPumpState] = useState<'unknown' | 'on' | 'off'>('unknown')
  const [pumpLoading, setPumpLoading] = useState(false)
  const [pumpError, setPumpError] = useState<string | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [currentPageState, setCurrentPageState] = useState<'dashboard' | 'automation' | 'weather' | 'profile'>('dashboard')

  useEffect(() => {
    if (!supabaseReady) {
      setAuthLoading(false)
      setUser(null)
      return
    }

    setAuthLoading(true)
    supabaseReady.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error getting user', error)
        }
        setUser(data?.user ?? null)
      })
      .finally(() => {
        setAuthLoading(false)
      })

    const { data } = supabaseReady.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [supabaseReady])

  useEffect(() => {
    const supported =
      typeof navigator !== 'undefined' && typeof navigator.serial !== 'undefined'
    setSerialSupported(Boolean(supported))
  }, [])

  useEffect(() => {
    if (!supabaseReady) {
      setLoadingData(false)
      return
    }

    async function loadInitialData() {
      setLoadingData(true)
      try {
        if (!supabaseReady) return
        const { data, error } = await supabaseReady
          .from('sensor_data')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(500)

        if (error) {
          console.error('Error loading sensor_data', error)
        } else if (data) {
          setSensorData(data as SensorRow[])
        }
      } finally {
        setLoadingData(false)
      }
    }

    async function loadConnectionStatus() {
      try {
        if (!supabaseReady) return
        const { data, error } = await supabaseReady
          .from('connection_status')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading connection_status', error)
        } else if (data) {
          setConnectionRow(data as ConnectionStatusRow)
        } else {
          setConnectionRow(null)
        }
      } catch (err) {
        console.error('Unexpected error loading connection_status', err)
      }
    }

    loadInitialData()
    loadConnectionStatus()

    if (supabaseReady) {
      const channel = supabaseReady
        .channel('sensor_data_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sensor_data',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setSensorData((prev) => {
                const next = [payload.new as SensorRow, ...prev]
                return next.slice(0, 500)
              })
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connection_status',
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setConnectionRow(payload.new as ConnectionStatusRow)
            }
          },
        )
        .subscribe()

      return () => {
        supabaseReady.removeChannel(channel)
      }
    }
  }, [supabaseReady])

  const totalReadings = sensorData.length

  const lastReadingTimestamp = sensorData[0]?.timestamp ?? connectionRow?.last_reading ?? null

  const currentMoisture = sensorData[0]?.sensor1 ?? null

  const isConnected = Boolean(connectionRow?.is_connected)

  const statsSensor1 = useMemo(
    () => computeStats(sensorData.map((r) => r.sensor1)),
    [sensorData],
  )
  const statsSensor2 = useMemo(
    () => computeStats(sensorData.map((r) => r.sensor2)),
    [sensorData],
  )
  const statsTemperature = useMemo(
    () => computeStats(sensorData.map((r) => r.temperature)),
    [sensorData],
  )

  const totalPages = Math.max(1, Math.ceil(sensorData.length / pageSize))
  const currentPageClamped = Math.min(currentPage, totalPages)
  const paginatedRows = sensorData.slice(
    (currentPageClamped - 1) * pageSize,
    currentPageClamped * pageSize,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [sensorData.length])

  async function handleRequestPort() {
    if (!serialSupported || !navigator.serial) return
    try {
      const port = await navigator.serial.requestPort()
      setSelectedPort(port)
      setSerialError(null)
    } catch (err) {
      if ((err as DOMException).name === 'NotFoundError') return
      console.error(err)
      setSerialError('Unable to access the selected serial port.')
    }
  }

  async function handleConnectToggle() {
    if (!supabaseReady) {
      setSerialError('Supabase is not configured. Check your .env settings.')
      return
    }

    if (!selectedPort) {
      setSerialError('Select a USB port first.')
      return
    }

    if (connecting) return

    try {
      setConnecting(true)
      setSerialError(null)

      if (isConnected) {
        await selectedPort.close().catch(() => {})
        await supabaseReady.from('connection_status').insert({
          is_connected: false,
          port: 'USB',
          baud_rate: baudRate,
          last_reading: lastReadingTimestamp,
        })
      } else {
        await selectedPort.open({ baudRate })
        await supabaseReady.from('connection_status').insert({
          is_connected: true,
          port: 'USB',
          baud_rate: baudRate,
          last_reading: lastReadingTimestamp,
        })
      }
    } catch (err) {
      console.error(err)
      setSerialError('Failed to open or close the serial connection.')
    } finally {
      setConnecting(false)
    }
  }

  async function handleExportCsv() {
    if (!supabaseReady || !user) {
      alert('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    try {
      const { data, error } = await supabaseReady
        .from('sensor_data')
        .select('*')
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Error exporting CSV', error)
        return
      }

      const rows = (data as SensorRow[]) ?? []
      const header = ['timestamp', 'sensor1', 'sensor2', 'temperature', 'created_at']
      const csvLines = [
        header.join(','),
        ...rows.map((row) =>
          [
            row.timestamp,
            row.sensor1 ?? '',
            row.sensor2 ?? '',
            row.temperature ?? '',
            row.created_at,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(','),
        ),
      ]

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.download = `sensor-data-${stamp}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Track data export
      await supabaseReady.from('user_history').insert({
        user_id: user.id,
        action: 'data_export',
        details: { count: rows.length, timestamp: new Date().toISOString() }
      })
    } catch (err) {
      console.error('Unexpected error exporting CSV', err)
    }
  }

  async function handleClearData() {
    const confirmed = window.confirm(
      'This will permanently delete all sensor readings from Supabase. Continue?',
    )
    if (!confirmed) return

    try {
      if (!supabaseReady || !user) {
        alert('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
        return
      }

      const { error } = await supabaseReady.from('sensor_data').delete().neq('id', null)
      if (error) {
        console.error('Error clearing data', error)
        return
      }
      setSensorData([])

      // Track data clear
      await supabaseReady.from('user_history').insert({
        user_id: user.id,
        action: 'data_clear',
        details: { cleared_at: new Date().toISOString() }
      })
    } catch (err) {
      console.error('Unexpected error clearing data', err)
    }
  }

  async function handlePumpCommand(nextState: 'on' | 'off') {
    if (!supabaseReady || !user) {
      alert('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    try {
      setPumpLoading(true)
      setPumpError(null)
      setPumpState(nextState)

      const { error } = await supabaseReady.from('pump_commands').insert({
        state: nextState,
        issued_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Error sending pump command', error)
        setPumpError('Failed to send command to pump.')
      } else {
        // Track pump command
        await supabaseReady.from('user_history').insert({
          user_id: user.id,
          action: `pump_${nextState}`,
          details: { state: nextState, timestamp: new Date().toISOString() }
        })
      }
    } catch (err) {
      console.error('Unexpected error sending pump command', err)
      setPumpError('Unexpected error sending pump command.')
    } finally {
      setPumpLoading(false)
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabaseReady) return

    setAuthError(null)
    setAuthSubmitting(true)
    try {
      if (!authEmail || !authPassword) {
        setAuthError('Email and password are required.')
        return
      }

      if (authMode === 'signup') {
        const { data, error } = await supabaseReady.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authName || null,
            },
          },
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        if (data.user) {
          await supabaseReady.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: authName || null,
          })

          // Track signup
          await supabaseReady.from('user_history').insert({
            user_id: data.user.id,
            action: 'signup',
            details: { email: data.user.email }
          })
        }
      } else {
        const { error } = await supabaseReady.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        // Track login
        if (user) {
          await supabaseReady.from('user_history').insert({
            user_id: user.id,
            action: 'login',
            details: { email: user.email }
          })
        }
      }
    } catch (err) {
      console.error('Auth error', err)
      setAuthError('Unexpected authentication error.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleSignOut() {
    if (!supabaseReady || !user) return
    try {
      // Track logout
      await supabaseReady.from('user_history').insert({
        user_id: user.id,
        action: 'logout',
        details: { email: user.email }
      })
      await supabaseReady.auth.signOut()
    } catch (err) {
      console.error('Sign out error', err)
    }
  }

  const handlePageChange = (page: 'dashboard' | 'automation' | 'weather' | 'profile') => {
    setCurrentPageState(page)
  }

  const chartData = [...sensorData]
    .slice()
    .reverse()
    .map((row) => ({
      ...row,
      timestampLabel: new Date(row.timestamp).toLocaleTimeString(),
    }))

  if (!supabaseReady) {
    return (
      <div className="app-root">
        <header className="app-header">
          <div>
            <h1>Arduino Soil Monitor</h1>
            <p className="app-subtitle">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your
              <code>.env</code> file.
            </p>
          </div>
        </header>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="app-root auth-root">
        <div className="auth-card">
          <h1>Arduino Soil Monitor</h1>
          <p className="app-subtitle">Loading your account…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-root auth-root">
        <div className="auth-card">
          <h1>Arduino Soil Monitor</h1>
          <p className="app-subtitle">Sign in or create an account to use your dashboard.</p>

          <div className="auth-toggle">
            <button
              type="button"
              className={`secondary-button auth-toggle-button ${
                authMode === 'signin' ? 'auth-toggle-button--active' : ''
              }`}
              onClick={() => setAuthMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`secondary-button auth-toggle-button ${
                authMode === 'signup' ? 'auth-toggle-button--active' : ''
              }`}
              onClick={() => setAuthMode('signup')}
            >
              Sign up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="form-field">
              <label>Email</label>
              <input
                className="auth-input"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input
                className="auth-input"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
            </div>
            {authMode === 'signup' && (
              <div className="form-field">
                <label>Full name (optional)</label>
                <input
                  className="auth-input"
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              </div>
            )}
            {authError && <p className="error-text">{authError}</p>}
            <button
              type="submit"
              className="primary-button"
              disabled={authSubmitting || !authEmail || !authPassword}
            >
              {authSubmitting
                ? authMode === 'signin'
                  ? 'Signing in…'
                  : 'Creating account…'
                : authMode === 'signin'
                ? 'Sign in'
                : 'Sign up'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-root">
      <div className="supabase-status">
        <span className="supabase-status-indicator">
          <span className="status-dot" />
          Supabase Connected
        </span>
      </div>
      <Navigation 
        currentPage={currentPageState} 
        onPageChange={handlePageChange} 
        onSignOut={handleSignOut}
        user={user}
      />
      
      {currentPageState === 'dashboard' ? (
        <main className="layout-grid">
          <section className="panel">
            <div className="panel-header">
              <h2>Connection Control</h2>
              <span
                className={`status-indicator ${
                  isConnected ? 'status-indicator--active' : 'status-indicator--idle'
                }`}
              >
                <span className="status-pulse" />
                {isConnected ? 'Active' : 'Idle'}
              </span>
            </div>
            <div className="control-grid">
              <div className="form-field">
                <label>USB Port</label>
                {serialSupported ? (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleRequestPort}
                    >
                      {selectedPort ? 'Change Port' : 'Select Port'}
                    </button>
                    <p className="field-helper">
                      {selectedPort
                        ? 'Port selected. This dashboard still relies on Wi‑Fi HTTP posts to Supabase.'
                        : 'Select a USB port (Chrome / Edge only).'}
                    </p>
                  </>
                ) : (
                  <p className="field-helper">
                    Web Serial not supported in this browser. Arduino will still send data via Wi‑Fi to
                    Supabase.
                  </p>
                )}
              </div>
              <div className="form-field">
                <label>Baud Rate</label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value) as BaudRateOption)}
                >
                  {BAUD_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate.toLocaleString()} bps
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field form-field--wide">
                <label>&nbsp;</label>
                <button
                  type="button"
                  className={`primary-button ${
                    isConnected ? 'primary-button--danger' : 'primary-button--success'
                  } ${isConnected ? 'primary-button--pulse' : ''}`}
                  onClick={handleConnectToggle}
                  disabled={connecting || !serialSupported}
                >
                  {connecting
                    ? isConnected
                      ? 'Disconnecting...'
                      : 'Connecting...'
                    : isConnected
                    ? 'Disconnect'
                    : 'Connect'}
                </button>
                {serialError && <p className="error-text">{serialError}</p>}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Dashboard Statistics</h2>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Readings</span>
                <span className="stat-value">{loadingData ? '—' : totalReadings}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Connection Status</span>
                <span className="stat-value">{isConnected ? 'Active' : 'Idle'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Last Sync</span>
                <span className="stat-value">
                  {lastReadingTimestamp ? formatDateTime(lastReadingTimestamp) : '—'}
                </span>
                <span className="stat-subvalue">
                  {lastReadingTimestamp ? formatTimeAgo(lastReadingTimestamp) : 'Waiting for data'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Storage Capacity</span>
                <span className="stat-value">{STORAGE_CAPACITY_GB} GB</span>
                <span className="stat-subvalue">Supabase auto-backup</span>
              </div>
              <div className="stat-card stat-card--moisture">
                <span className="stat-label">Soil Moisture</span>
                <span className="stat-value">
                  {currentMoisture !== null ? `${currentMoisture.toFixed(1)} %` : '—'}
                </span>
                <div className="moisture-bar">
                  <div
                    className="moisture-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, currentMoisture ?? 0))}%`,
                    }}
                  />
                  <div
                    className="moisture-bar-target"
                    style={{ left: `${targetMoisture}%` }}
                    title={`Target ${targetMoisture}%`}
                  />
                </div>
                <span className="stat-subvalue">
                  Target {targetMoisture}% · Pump {pumpState === 'unknown' ? '—' : pumpState}
                </span>
              </div>
            </div>
          </section>

          <section className="panel panel--full">
            <div className="panel-header">
              <h2>Irrigation Control</h2>
            </div>
            <div className="irrigation-grid">
              <div className="form-field">
                <label>Desired Soil Moisture (%)</label>
                <input
                  type="range"
                  min={20}
                  max={80}
                  value={targetMoisture}
                  onChange={(e) => setTargetMoisture(Number(e.target.value))}
                />
                <p className="field-helper">
                  Current:{' '}
                  {currentMoisture !== null ? `${currentMoisture.toFixed(1)} %` : 'waiting for data…'}
                </p>
              </div>
              <div className="form-field">
                <label>Pump Control</label>
                <div className="pump-buttons">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handlePumpCommand('on')}
                    disabled={pumpLoading}
                  >
                    Turn Pump On
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handlePumpCommand('off')}
                    disabled={pumpLoading}
                  >
                    Turn Pump Off
                  </button>
                </div>
                <p className="field-helper">
                  Status:{' '}
                  {pumpState === 'unknown'
                    ? 'Waiting for first command'
                    : pumpState === 'on'
                    ? 'Pump requested ON'
                    : 'Pump requested OFF'}
                </p>
                {pumpError && <p className="error-text">{pumpError}</p>}
              </div>
            </div>
          </section>

          <section className="panel panel--full">
            <div className="panel-header">
              <h2>Real-Time Sensor Monitor</h2>
              <span className="panel-header-subtitle">
                Live multi-line chart – Sensor 1 (Blue), Sensor 2 (Green), Temperature (Amber)
              </span>
            </div>
            <div className="chart-container">
              {chartData.length === 0 ? (
                <div className="chart-empty">
                  {loadingData ? 'Loading data from Supabase…' : 'Waiting for first readings…'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                    <XAxis dataKey="timestampLabel" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sensor1"
                      stroke="#3b82f6"
                      dot={false}
                      name="Sensor 1"
                    />
                    <Line
                      type="monotone"
                      dataKey="sensor2"
                      stroke="#22c55e"
                      dot={false}
                      name="Sensor 2"
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#f59e0b"
                      dot={false}
                      name="Temperature"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="panel panel--full">
            <div className="panel-header">
              <h2>Sensor Statistics</h2>
            </div>
            <div className="stats-grid stats-grid--three">
              <div className="stat-card stat-card--sensor1">
                <span className="stat-label">Sensor 1 (Blue)</span>
                <span className="stat-value">{statsSensor1.average}</span>
                <span className="stat-subvalue">
                  Min {statsSensor1.min} · Max {statsSensor1.max}
                </span>
              </div>
              <div className="stat-card stat-card--sensor2">
                <span className="stat-label">Sensor 2 (Green)</span>
                <span className="stat-value">{statsSensor2.average}</span>
                <span className="stat-subvalue">
                  Min {statsSensor2.min} · Max {statsSensor2.max}
                </span>
              </div>
              <div className="stat-card stat-card--temperature">
                <span className="stat-label">Temperature (Amber)</span>
                <span className="stat-value">{statsTemperature.average}</span>
                <span className="stat-subvalue">
                  Min {statsTemperature.min} · Max {statsTemperature.max}
                </span>
              </div>
            </div>
          </section>

          <section className="panel panel--full">
            <div className="panel-header">
              <h2>Data Management</h2>
              <div className="panel-actions">
                <button type="button" className="secondary-button" onClick={handleExportCsv}>
                  Export CSV
                </button>
                <button type="button" className="danger-button" onClick={handleClearData}>
                  Clear Data
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Sensor 1</th>
                    <th>Sensor 2</th>
                    <th>Temperature</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-empty">
                        {loadingData
                          ? 'Loading latest readings…'
                          : 'No readings yet. Once your Arduino starts posting, they will appear here.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDateTime(row.timestamp)}</td>
                        <td>{row.sensor1 ?? '—'}</td>
                        <td>{row.sensor2 ?? '—'}</td>
                        <td>{row.temperature ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span className="pagination-summary">
                Showing {paginatedRows.length} of {sensorData.length} readings
              </span>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPageClamped === 1}
                >
                  Previous
                </button>
                <span className="pagination-page">
                  Page {currentPageClamped} of {totalPages}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPageClamped === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </main>
      ) : currentPageState === 'automation' ? (
        <AutomationPage />
      ) : currentPageState === 'weather' ? (
        <WeatherPage user={user} />
      ) : (
        <ProfilePage user={user} />
      )}
    </div>
  )
}

export default App