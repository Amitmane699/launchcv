import axios from "axios";
import { useAuthStore } from "../store/authStore";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = BASE;

export const api = axios.create({
    baseURL: `${BASE}/api`,
    timeout: 30000,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(err);
    },
);
