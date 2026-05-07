import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type Method,
} from "axios";

function joinUrl(baseUrl: string, path: string) {
  if (!baseUrl) {
    return path;
  }

  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

type JsonRequestConfig = {
  method?: Method;
  headers?: AxiosRequestConfig["headers"];
  body?: unknown;
  params?: AxiosRequestConfig["params"];
};

const apiClient = axios.create({
  headers: {
    Accept: "application/json",
  },
});

// Attach Bearer token from session on every request
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("oyci.session");
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.token) {
        config.headers = config.headers ?? {};
        config.headers["Authorization"] = `Bearer ${session.token}`;
      }
    }
  } catch {
    // ignore parse errors
  }
  return config;
});

export async function fetchJson<TResponse>(
  path: string,
  init?: JsonRequestConfig
) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  const requestHeaders = init?.body
    ? {
        "Content-Type": "application/json",
        ...init.headers,
      }
    : init?.headers;

  try {
    const response = await apiClient.request<TResponse>({
      url: joinUrl(apiBaseUrl, path),
      method: init?.method ?? "GET",
      headers: requestHeaders,
      data: init?.body,
      params: init?.params,
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        `Request failed with status ${error.response?.status ?? "unknown"}: ${error.message}`
      );
    }

    throw error;
  }
}