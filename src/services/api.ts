import axios from 'axios';

// Use the environment variable for the API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Fallback for local development if the env var isn't set
if (!API_BASE_URL) {
  console.warn(
    'VITE_API_BASE_URL is not set. Falling back to default or potentially no API connection.'
  );
}

console.log('Using API Base URL:', API_BASE_URL); // Debug log

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
}); // Important for CORS with credentials if your backend expects/uses them


// Function to get the token (ensure 'authToken' is the key you use in localStorage)
const getToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  console.log('Auth token from localStorage:', token ? 'Present' : 'Missing'); // Debug log
  return token;
};

// Interceptor to add the auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Ensure the URL being requested is logged correctly (relative path)
    console.log('Request config:', {
      baseURL: config.baseURL, // Should be the API_BASE_URL
      url: config.url,         // This will be the relative path like '/api/users'
      method: config.method,
      headers: config.headers,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => {
    // Log the full URL requested for clarity
    const fullUrl = response.config.baseURL ? `${response.config.baseURL}${response.config.url}` : response.config.url;
    console.log(`Response from ${fullUrl}:`, {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    const fullUrl = error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : error.config?.url;
    console.error('API Error:', {
      url: fullUrl || error.config?.url, // Show full URL if possible
      method: error.config?.method,
      status: error.response?.status,
      response_data: error.response?.data, // Renamed to avoid confusion with request data
      message: error.message,
      // stack: error.stack // Stack can be very verbose, uncomment if needed for deep debugging
    });
    return Promise.reject(error);
  }
);

// API helper functions
// These functions will now take relative paths starting with '/api/...'
// e.g., get('/api/users'), post('/api/auth/login', credentials)

const get = async <T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
  try {
    console.log(`Making GET request to endpoint: ${endpoint} with params:`, params);
    const response = await axiosInstance.get<T>(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error(`GET ${endpoint} failed:`, error);
    throw error;
  }
};

const post = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  try {
    console.log(`Making POST request to endpoint: ${endpoint} with data:`, data);
    const response = await axiosInstance.post<T>(endpoint, data);
    return response.data;
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    throw error;
  }
};

const put = async <T = unknown>(endpoint: string, data: unknown): Promise<T | null> => {
  try {
    console.log(`Making PUT request to endpoint: ${endpoint} with data:`, data);
    const response = await axiosInstance.put<T>(endpoint, data);
    // Handle 204 No Content specifically, common for PUT/DELETE if no body is returned
    if (response.status === 204) {
      return null;
    }
    return response.data;
  } catch (error) {
    console.error(`PUT ${endpoint} failed:`, error);
    throw error;
  }
};

// Changed to return Promise<T | null> to be consistent and allow for responses with content
const del = async <T = unknown>(endpoint: string): Promise<T | null> => {
  try {
    console.log(`Making DELETE request to endpoint: ${endpoint}`);
    const response = await axiosInstance.delete<T>(endpoint);
    if (response.status === 204) {
      return null; // No content
    }
    // For DELETE, often a 200 or 202 might also return some confirmation
    return response.data;
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    throw error;
  }
};

export const api = {
  get,
  post,
  put,
  delete: del, // 'delete' is a reserved keyword, so 'del' is a good choice for the function name
};

// Example of how you might use this in your components:
// import { api } from './services/api';
//
// const fetchUsers = async () => {
//   try {
//     const users = await api.get<UserType[]>('/api/users'); // Endpoint starts with /api/
//     console.log(users);
//   } catch (error) {
//     console.error('Failed to fetch users:', error);
//   }
// };
//
// const loginUser = async (credentials: LoginCredentials) => {
//   try {
//     const loginResponse = await api.post<{ token: string }>('/api/auth/login', credentials);
//     localStorage.setItem('authToken', loginResponse.token); // Save the token
//   } catch (error) {
//     console.error('Login failed:', error);
//   }
// };