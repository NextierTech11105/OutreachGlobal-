import axios, { AxiosInstance } from "axios";
import { $cookie } from "./cookie/client-cookie";

export class HttpInstance {
  static http: AxiosInstance;

  static getInstance() {
    if (!this.http) {
      const http = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL + "/rest",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      http.interceptors.request.use(
        function (config) {
          if (typeof window !== "undefined") {
            const token = $cookie.get("session");
            if (!!token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          }

          // Do something before request is sent
          return config;
        },
        function (error) {
          // Do something with request error
          return Promise.reject(error);
        },
      );

      this.http = http;
    }
    return this.http;
  }
}

export const $http = HttpInstance.getInstance();
