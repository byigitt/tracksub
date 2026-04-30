// Tek-yer fetch wrapper: cookie'leri at, JSON parse, error throw.
// Bu projede çok fazla fetch kullanmıyoruz, ama auth dışı endpoint'ler için.

export const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path.startsWith('/') ? path : `/${path}`, {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
};
