import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with requests
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry if request was cancelled or has no config
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't try to refresh if we're already on the refresh endpoint or login
      const url = originalRequest.url || "";
      if (url.includes("/auth/refresh/") || url.includes("/auth/login/")) {
        return Promise.reject(error);
      }

      try {
        // Refresh token is in httpOnly cookie, so we can't read it
        // Use direct axios call to avoid interceptor recursion
        const refreshResponse = await axios.post(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
          }/auth/refresh/`,
          {},
          {
            withCredentials: true,
            // Don't retry refresh failures
            validateStatus: (status) => status < 500,
          }
        );

        if (refreshResponse.status === 200 && refreshResponse.data.access) {
          const { access } = refreshResponse.data;
          Cookies.set("access_token", access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } else {
          // Refresh failed, clear tokens
          Cookies.remove("access_token");
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and reject
        Cookies.remove("access_token");
        // Don't redirect here - let the component handle it
        return Promise.reject(refreshError);
      }
    }

    // Extract error message from response for better error handling
    if (error.response?.data) {
      const data = error.response.data;
      const errorMessage = data.detail || data.message || JSON.stringify(data);
      error.message = errorMessage;
    }

    return Promise.reject(error);
  }
);

export default api;
