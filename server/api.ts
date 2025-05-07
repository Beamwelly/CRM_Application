const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'; // Use env var or default

/**
 * Performs a GET request to the backend API.
 * @param endpoint The API endpoint (e.g., '/users').
 * @returns Promise resolving to the JSON response.
 */
const get = async (endpoint: string) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    console.error(`API GET Error (${endpoint}):`, response.status, errorData);
    throw new Error(errorData.message || `Failed to fetch data from ${endpoint}`);
  }
  return response.json();
};

/**
 * Performs a POST request to the backend API.
 * @param endpoint The API endpoint (e.g., '/auth/login').
 * @param data The data to send in the request body.
 * @returns Promise resolving to the JSON response.
 */
const post = async (endpoint: string, data: unknown) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add Authorization header if needed, e.g., for authenticated requests
      // 'Authorization': `Bearer ${getToken()}` 
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    console.error(`API POST Error (${endpoint}):`, response.status, errorData);
    throw new Error(errorData.message || `Failed to post data to ${endpoint}`);
  }
  return response.json();
};

// TODO: Add PUT, DELETE methods as needed
// const put = async (endpoint: string, data: unknown) => { /* ... */ };
// const del = async (endpoint: string) => { /* ... */ };

export const api = {
  get,
  post,
  // put, 
  // del,
}; 