// apiFetch.ts

export const API_BASE_RAW = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const API_BASE = API_BASE_RAW.replace(/\/+$/, "");

// Aviso en caso de no tener base configurada
if (!API_BASE && typeof window !== "undefined") {
  console.warn(
    "[API] NEXT_PUBLIC_API_BASE_URL no está definido; " +
      "configura NEXT_PUBLIC_API_BASE_URL para apuntar a tu backend " +
      "(por ejemplo: https://profitup-api-xxxxx.azurewebsites.net)."
  );
}

export type ApiError = {
  status: number;
  message: string;
  raw?: unknown;
};

function buildUrl(path: string): string {
  // Si ya es absoluta, la dejamos igual
  if (/^https?:\/\//i.test(path)) return path;

  const clean = path.replace(/^\/+/, "");

  // Si no hay API_BASE, devolvemos ruta relativa (ya hay warning global arriba)
  if (!API_BASE) {
    console.warn(
      "[API] buildUrl llamado sin API_BASE configurado. Ruta relativa:",
      path
    );
    return `/${clean}`;
  }

  return `${API_BASE}/${clean}`;
}

function getBearer(token?: string): string | undefined {
  if (token) return `Bearer ${token}`;

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("token");
    if (stored) return `Bearer ${stored}`;
  }

  return undefined;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = buildUrl(path);

  const headers = new Headers(options.headers ?? {});
  const bearer = getBearer(token);

  if (bearer && !headers.has("Authorization")) {
    headers.set("Authorization", bearer);
  }

  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const init: RequestInit = {
    // Para JWT en header no necesitamos cookies; mantenemos same-origin por defecto.
    credentials: options.credentials ?? "same-origin",
    ...options,
    headers
  };

  // Serializar body si es objeto normal
  if (
    hasBody &&
    options.body &&
    typeof options.body !== "string" &&
    !(options.body instanceof FormData)
  ) {
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, init);

  const parseProblem = async () => {
    try {
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const j = await res.json();
        const msg =
          (j as any)?.title ??
          (j as any)?.detail ??
          (j as any)?.message ??
          (j as any)?.error ??
          (typeof j === "string" ? j : `HTTP ${res.status}`);

        return { message: msg, raw: j };
      }

      const t = await res.text();
      return { message: t || `HTTP ${res.status}`, raw: t };
    } catch {
      return { message: `HTTP ${res.status}` };
    }
  };

  if (!res.ok) {
    const { message, raw } = await parseProblem();
    const err: ApiError = { status: res.status, message, raw };

    if (res.status === 401) {
      console.warn("[API] 401 No autorizado. ¿Token presente?:", !!bearer, "URL:", url);
    } else {
      console.warn("[API] Error HTTP", res.status, "en", url, "-", message);
    }

    throw err;
  }

  if (res.status === 204 || res.status === 205) {
    // Sin contenido
    return {} as T;
  }

  const ct = res.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }

  const text = await res.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
