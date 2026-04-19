type QueryParams = Record<string, string | number | boolean | null | undefined>;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface HttpRequestOptions extends Omit<RequestInit, "body" | "headers" | "method"> {
	method?: HttpMethod;
	headers?: HeadersInit;
	params?: QueryParams;
	body?: unknown;
	withAuth?: boolean;
	token?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const resolveToken = (): string | null => {
	if (typeof window === "undefined") {
		return null;
	}

	return localStorage.getItem("access_token") ?? localStorage.getItem("id_token");
};

export const generateBearerToken = (token?: string | null): string | null => {
	const rawToken = token ?? resolveToken();
	return rawToken ? `Bearer ${rawToken}` : null;
};

const buildUrl = (path: string, params?: QueryParams): string => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const url = new URL(`${API_BASE_URL}${normalizedPath}`, window.location.origin);

	if (!params) {
		return url.toString();
	}

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			url.searchParams.set(key, String(value));
		}
	});

	return url.toString();
};

const toRequestBody = (body: unknown): BodyInit | undefined => {
	if (body == null) {
		return undefined;
	}

	if (body instanceof FormData || body instanceof URLSearchParams || typeof body === "string") {
		return body;
	}

	return JSON.stringify(body);
};

const buildHeaders = (options: HttpRequestOptions): Headers => {
	const headers = new Headers(options.headers);
	const hasJsonBody = options.body != null && !(options.body instanceof FormData) && !headers.has("Content-Type");

	if (hasJsonBody) {
		headers.set("Content-Type", "application/json");
	}

	if (options.withAuth !== false) {
		const authorization = generateBearerToken(options.token ?? null);
		if (authorization) {
			headers.set("Authorization", authorization);
		}
	}

	return headers;
};

export const httpRequest = async <T>(path: string, options: HttpRequestOptions = {}): Promise<T> => {
	const method = options.method ?? "GET";
	const url = buildUrl(path, options.params);
	const headers = buildHeaders(options);

	const response = await fetch(url, {
		...options,
		method,
		headers,
		body: toRequestBody(options.body),
	});

    if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("id_token");
        localStorage.removeItem("ticket_user");
        window.location.href = "/";
        return undefined as T;
    }

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(errorText || `Request failed with status ${response.status}`);
	}

	if (response.status === 204) {
		return undefined as T;
	}

    

	const contentType = response.headers.get("Content-Type") ?? "";
	return contentType.includes("application/json")
		? ((await response.json()) as T)
		: ((await response.text()) as T);
};

export const httpClient = {
	get: <T>(path: string, options: Omit<HttpRequestOptions, "method"> = {}) =>
		httpRequest<T>(path, { ...options, method: "GET" }),
	post: <T>(path: string, body?: unknown, options: Omit<HttpRequestOptions, "method" | "body"> = {}) =>
		httpRequest<T>(path, { ...options, method: "POST", body }),
	put: <T>(path: string, body?: unknown, options: Omit<HttpRequestOptions, "method" | "body"> = {}) =>
		httpRequest<T>(path, { ...options, method: "PUT", body }),
	patch: <T>(path: string, body?: unknown, options: Omit<HttpRequestOptions, "method" | "body"> = {}) =>
		httpRequest<T>(path, { ...options, method: "PATCH", body }),
	delete: <T>(path: string, options: Omit<HttpRequestOptions, "method"> = {}) =>
		httpRequest<T>(path, { ...options, method: "DELETE" }),
};

