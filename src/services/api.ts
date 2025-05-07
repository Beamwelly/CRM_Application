import axios from 'axios';

// Base URL for the API (ensure this is correct for your setup)
const API_URL = 'http://localhost:3001/api';

console.log('API URL:', API_URL); // Debug log

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true // Important for CORS with credentials
});

// Function to get the token (replace with your actual token storage mechanism)
const getToken = () => {
  const token = localStorage.getItem('authToken');
  console.log('Auth token:', token ? 'Present' : 'Missing'); // Debug log
  return token;
};

// Interceptor to add the auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log('Request config:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
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
    console.log(`Response from ${response.config.url}:`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });
    return Promise.reject(error);
  }
);

// API helper functions
const get = async (endpoint: string): Promise<unknown> => {
  try {
    console.log(`Making GET request to ${endpoint}`);
    const response = await axiosInstance.get(endpoint);
    return response.data;
  } catch (error) {
    console.error(`GET ${endpoint} failed:`, error);
    throw error;
  }
};

const post = async (endpoint: string, data: unknown): Promise<unknown> => {
  try {
    console.log(`Making POST request to ${endpoint} with data:`, data);
    const response = await axiosInstance.post(endpoint, data);
    return response.data;
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    throw error;
  }
};

const put = async (endpoint: string, data: unknown): Promise<unknown> => {
  try {
    console.log(`Making PUT request to ${endpoint} with data:`, data);
    const response = await axiosInstance.put(endpoint, data);
    if (response.status === 204) {
      return null;
    }
    return response.data;
  } catch (error) {
    console.error(`PUT ${endpoint} failed:`, error);
    throw error;
  }
};

const del = async (endpoint: string): Promise<void> => {
  try {
    console.log(`Making DELETE request to ${endpoint}`);
    const response = await axiosInstance.delete(endpoint);
    if (response.status !== 204 && response.status !== 200) {
      console.warn(`DELETE ${endpoint} returned status ${response.status}`);
    }
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    throw error;
  }
};

export const api = {
  get,
  post,
  put,
  delete: del,
}; 