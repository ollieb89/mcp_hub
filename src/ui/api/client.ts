const defaultHeaders = {
  "Content-Type": "application/json",
} as const;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    const error = new Error(
      typeof errorBody.error === "string"
        ? errorBody.error
        : errorBody.message ?? `Request failed: ${response.status}`,
    );
    throw error;
  }

  return response.json() as Promise<T>;
}
