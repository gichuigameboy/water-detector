import axios from 'axios'

export interface WeatherData {
  location: {
    name: string
    country: string
    lat: number
    lon: number
    timezone: string
  }
  current: {
    temp: number
    feels_like: number
    humidity: number
    wind_speed: number
    weather: Array<{
      id: number
      main: string
      description: string
      icon: string
    }>
    pressure: number
    visibility: number
    uvi?: number
  }
  forecast: Array<{
    dt: number
    temp: {
      day: number
      min: number
      max: number
      night: number
      eve: number
      morn: number
    }
    feels_like: {
      day: number
      night: number
      eve: number
      morn: number
    }
    humidity: number
    wind_speed: number
    weather: Array<{
      id: number
      main: string
      description: string
      icon: string
    }>
    pop: number // probability of precipitation
  }>
}

export interface WeatherError {
  code: string
  message: string
}

class WeatherService {
  private apiKey: string
  private baseURL = 'https://api.openweathermap.org/data/2.5'

  constructor() {
    this.apiKey = import.meta.env.VITE_WEATHER_API_KEY || ''
    if (!this.apiKey) {
      console.warn('Weather API key not configured. Weather features will not work.')
    }
  }


  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    if (!this.apiKey) {
      throw new Error('Weather API key not configured')
    }

    try {
      const currentResponse = await axios.get(`${this.baseURL}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
        },
      })

      const forecastResponse = await axios.get(`${this.baseURL}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
        },
      })

      // Process forecast data to get daily summaries
      const dailyForecast = this.processForecastData(forecastResponse.data.list)

      return {
        location: {
          name: currentResponse.data.name || 'Unknown',
          country: currentResponse.data.sys.country || '',
          lat: currentResponse.data.coord.lat,
          lon: currentResponse.data.coord.lon,
          timezone: currentResponse.data.timezone,
        },
        current: {
          temp: currentResponse.data.main.temp,
          feels_like: currentResponse.data.main.feels_like,
          humidity: currentResponse.data.main.humidity,
          wind_speed: currentResponse.data.wind.speed,
          weather: currentResponse.data.weather,
          pressure: currentResponse.data.main.pressure,
          visibility: currentResponse.data.visibility,
          uvi: currentResponse.data.uvi,
        },
        forecast: dailyForecast,
      }
    } catch (error: unknown) {
      console.error('Error fetching weather data:', error)
      throw new Error('Failed to fetch weather data')
    }
  }

  async getWeatherByCity(city: string): Promise<WeatherData> {
    if (!this.apiKey) {
      throw new Error('Weather API key not configured')
    }

    try {
      // First get coordinates for the city
      const geoResponse = await axios.get(`${this.baseURL}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
        },
      })

      const { lat, lon } = geoResponse.data.coord

      // Then get weather data using coordinates
      return this.getCurrentWeather(lat, lon)
    } catch (error: unknown) {
      console.error('Error fetching weather by city:', error)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number } }
        if (axiosError.response?.status === 404) {
          throw new Error('City not found')
        }
      }
      throw new Error('Failed to fetch weather data')
    }
  }

  private processForecastData(forecastList: Array<{
    dt: number
    main: { temp: number; feels_like: number; humidity: number }
    wind: { speed: number }
    weather: Array<{ id: number; main: string; description: string; icon: string }>
    pop?: number
    dt_txt: string
  }>): Array<{
    dt: number
    temp: { day: number; min: number; max: number; night: number; eve: number; morn: number }
    feels_like: { day: number; night: number; eve: number; morn: number }
    humidity: number
    wind_speed: number
    weather: Array<{ id: number; main: string; description: string; icon: string }>
    pop: number
  }> {
    // Group forecast data by day
    const dailyData: { [key: string]: Array<{
      dt: number
      main: { temp: number; feels_like: number; humidity: number }
      wind: { speed: number }
      weather: Array<{ id: number; main: string; description: string; icon: string }>
      pop?: number
      dt_txt: string
    }> } = {}
    
    forecastList.forEach(item => {
      const date = new Date(item.dt * 1000)
      const dayKey = date.toDateString()
      
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = []
      }
      dailyData[dayKey].push(item)
    })

    // Process each day to get summary
    return Object.values(dailyData).map(dayData => {
      const day = dayData[0]
      const temps = dayData.map(d => d.main.temp)
      
      return {
        dt: day.dt,
        temp: {
          day: day.main.temp,
          min: Math.min(...temps),
          max: Math.max(...temps),
          night: dayData.find(d => d.dt_txt.includes('00:00:00'))?.main.temp || day.main.temp,
          eve: dayData.find(d => d.dt_txt.includes('18:00:00'))?.main.temp || day.main.temp,
          morn: dayData.find(d => d.dt_txt.includes('06:00:00'))?.main.temp || day.main.temp,
        },
        feels_like: {
          day: day.main.feels_like,
          night: dayData.find(d => d.dt_txt.includes('00:00:00'))?.main.feels_like || day.main.feels_like,
          eve: dayData.find(d => d.dt_txt.includes('18:00:00'))?.main.feels_like || day.main.feels_like,
          morn: dayData.find(d => d.dt_txt.includes('06:00:00'))?.main.feels_like || day.main.feels_like,
        },
        humidity: day.main.humidity,
        wind_speed: day.wind.speed,
        weather: day.weather,
        pop: day.pop || 0,
      }
    }).slice(0, 5) // Return only 5 days
  }

  public getWeatherIconUrl(icon: string): string {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`
  }

  public formatTemperature(temp: number): string {
    return `${Math.round(temp)}°C`
  }

  public getWeatherDescription(weather: Array<{ description: string }>): string {
    return weather[0]?.description || ''
  }
}

export const weatherService = new WeatherService()