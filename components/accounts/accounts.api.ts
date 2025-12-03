import { apiJson } from "../../helpers/apiClient";

export type Role = "Administrador" | "Empleado";
export type Status = "ACTIVE" | "PAUSED" | "VACATION";

export type RegisterInput = {
  nombre: string;
  apellido?: string;
  correo: string;
  password: string;
  telefono?: string | null;
  rol: Role;
};

export type UserDto = {
  usuarioID: number;
  nombre: string;
  apellido?: string;
  correo: string;
  telefono?: string | null;
  rol: Role | string;
  isActive: boolean;
  estadoUsuario?: Status;
};

// 👇 base relativa: dejamos que apiJson agregue el host correcto
const BASE = "/auth";

function path(p: string) {
  return `${BASE}${p}`;
}

export async function listUsers(authHeader: Record<string, string>) {
  return apiJson<UserDto[]>(path("/users"), "GET", undefined, authHeader);
}

export async function createUser(
  input: RegisterInput,
  authHeader: Record<string, string>
) {
  return apiJson<{ usuarioId: number }>(
    path("/register"),
    "POST",
    input,
    authHeader
  );
}

export async function updateUserRole(
  usuarioId: number,
  rol: Role,
  authHeader: Record<string, string>
) {
  const url = path(`/users/${usuarioId}/role/${encodeURIComponent(rol)}`);
  return apiJson<{ usuarioId: number; rol: string }>(url, "PATCH", {}, authHeader);
}

export type UpdateUserInput = Partial<{
  nombre: string;
  apellido?: string;
  correo: string;
  telefono?: string | null;
  rol: Role;
}>;

export async function updateUser(
  usuarioId: number,
  payload: UpdateUserInput,
  authHeader: Record<string, string>
) {
  const url = path(`/users/${usuarioId}`);
  return apiJson<{ usuarioId: number }>(url, "PATCH", payload, authHeader);
}

export async function setUserStatus(
  usuarioId: number,
  status: Status,
  authHeader: Record<string, string>
) {
  const url = path(`/users/${usuarioId}/status/${status}`);
  return apiJson<{ usuarioId: number; estado: Status }>(url, "PATCH", {}, authHeader);
}
