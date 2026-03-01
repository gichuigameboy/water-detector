import { useEffect, useState } from 'react'
import { weatherService, type WeatherData } from '../services/weatherService'

interface WeatherPageProps {
  user: {
    id: string
    email: string | undefined
  } | null
}

export default function WeatherPage({ user }: WeatherPageProps) {
  // Weather page doesn't currently use user data, but keeping for future features
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<string>('')
  const [useGeolocation, setUseGeolocation] = useState(true)

  const fetchWeatherByGeolocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await weatherService.getCurrentWeather(
            position.coords.latitude,
            position.coords.longitude
          )
          setWeatherData(data)
          setLocation(`${data.location.name}, ${data.location.country}`)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch weather data')
        } finally {
          setLoading(false)
        }
      },
      (geoError) => {
        setError(`Geolocation error: ${geoError.message}`)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    )
  }

  const fetchWeatherByCity = async (city: string) => {
    if (!city.trim()) {
      setError('Please enter a city name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await weatherService.getWeatherByCity(city)
      setWeatherData(data)
      setLocation(`${data.location.name}, ${data.location.country}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data')
    } finally {
      setLoading(false)
    }
  }

  const refreshWeather = () => {
    if (useGeolocation) {
      fetchWeatherByGeolocation()
    } else if (location) {
      const city = location.split(',')[0].trim()
      fetchWeatherByCity(city)
    }
  }

  useEffect(() => {
    if (useGeolocation) {
      fetchWeatherByGeolocation()
    }
  }, [useGeolocation])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getWeatherIcon = (icon: string) => {
    return weatherService.getWeatherIconUrl(icon)
  }

  const formatWindSpeed = (speed: number) => {
    return `${Math.round(speed * 3.6)} km/h`
  }

  const formatPrecipitation = (pop: number) => {
    return `${Math.round(pop * 100)}%`
  }

  if (loading && !weatherData) {
    return (
      <div className="weather-page">
        <div className="weather-loading">
          <div className="weather-loading-spinner" />
          <p>Fetching weather data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="weather-page">
      <div className="weather-header">
        <h1>Live Weather View</h1>
        <div className="weather-controls">
          <div className="location-controls">
            <label className="control-group">
              <input
                type="radio"
                checked={useGeolocation}
                onChange={() => setUseGeolocation(true)}
              />
              <span>Use My Location</span>
            </label>
            <label className="control-group">
              <input
                type="radio"
                checked={!useGeolocation}
                onChange={() => setUseGeolocation(false)}
              />
              <span>Enter City</span>
            </label>
          </div>
          
          {!useGeolocation && (
            <div className="city-input-group">
              <input
                type="text"
                placeholder="Enter city name (e.g., London, New York)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="city-input"
              />
              <button
                onClick={() => fetchWeatherByCity(location)}
                disabled={loading}
                className="primary-button"
              >
                Search
              </button>
            </div>
          )}
          
          <button
            onClick={refreshWeather}
            disabled={loading}
            className="secondary-button"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="weather-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      {weatherData && (
        <div className="weather-content">
          {/* Current Weather Card */}
          <div className="weather-current">
            <div className="current-main">
              <div className="current-temp">
                <img
                  src={getWeatherIcon(weatherData.current.weather[0].icon)}
                  alt={weatherData.current.weather[0].description}
                  className="weather-icon-large"
                />
                <div className="temp-display">
                  <span className="temp-main">
                    {weatherService.formatTemperature(weatherData.current.temp)}
                  </span>
                  <span className="temp-feels">
                    Feels like {weatherService.formatTemperature(weatherData.current.feels_like)}
                  </span>
                </div>
              </div>
              <div className="current-details">
                <h2>{weatherService.getWeatherDescription(weatherData.current.weather).toUpperCase()}</h2>
                <p className="location-name">{location}</p>
                <div className="current-stats">
                  <div className="stat-item">
                    <span className="stat-label">Humidity</span>
                    <span className="stat-value">{weatherData.current.humidity}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Wind</span>
                    <span className="stat-value">{formatWindSpeed(weatherData.current.wind_speed)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Pressure</span>
                    <span className="stat-value">{weatherData.current.pressure} hPa</span>
                  </div>
                  {weatherData.current.uvi && (
                    <div className="stat-item">
                      <span className="stat-label">UV Index</span>
                      <span className="stat-value">{weatherData.current.uvi}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 5-Day Forecast */}
          <div className="weather-forecast">
            <h2>5-Day Forecast</h2>
            <div className="forecast-grid">
              {weatherData.forecast.map((day) => (
                <div key={day.dt} className="forecast-day">
                  <div className="forecast-date">{formatDate(day.dt)}</div>
                  <img
                    src={getWeatherIcon(day.weather[0].icon)}
                    alt={day.weather[0].description}
                    className="weather-icon-small"
                  />
                  <div className="forecast-desc">{weatherService.getWeatherDescription(day.weather)}</div>
                  <div className="forecast-temp">
                    <span className="temp-high">{weatherService.formatTemperature(day.temp.max)}</span>
                    <span className="temp-low">{weatherService.formatTemperature(day.temp.min)}</span>
                  </div>
                  <div className="forecast-details">
                    <span className="precip-chance">Precip: {formatPrecipitation(day.pop)}</span>
                    <span className="wind-speed">Wind: {formatWindSpeed(day.wind_speed)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="weather-details">
            <div className="detail-card">
              <h3>Visibility</h3>
              <p>{Math.round(weatherData.current.visibility / 1000)} km</p>
            </div>
            <div className="detail-card">
              <h3>Humidity</h3>
              <div className="humidity-bar">
                <div 
                  className="humidity-fill" 
                  style={{ width: `${weatherData.current.humidity}%` }}
                />
                <span>{weatherData.current.humidity}%</span>
              </div>
            </div>
            <div className="detail-card">
              <h3>Wind Direction</h3>
              <p>{weatherData.current.wind_speed > 0 ? 'Varies' : 'Calm'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}