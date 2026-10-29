import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ProblemSchema, type Problem } from '@siem/shared';

import { crearSingleFlight } from './single-flight.js';

// Campos propios que marcamos en la config de cada petición (AxiosRequestConfig
// es el tipo público que aceptan .get/.post; InternalAxiosRequestConfig lo extiende).
declare module 'axios' {
  export interface AxiosRequestConfig {
    sinRefresh?: boolean; // no intentar refresh ante 401 (el propio /auth/refresh y /auth/login)
    _reintentadoTrasRefresh?: boolean; // ya se reintentó una vez tras refrescar
    _reintentosRed?: number; // cuántos reintentos de red lleva
  }
}

// Genera un UUID v4 para el x-correlation-id. crypto.randomUUID solo existe en
// contextos seguros (HTTPS o localhost); como el laboratorio sirve la web por
// http://192.168.56.101, usamos getRandomValues (disponible siempre) como respaldo.
function nuevoCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // versión 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variante
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// La sesión (store) se conecta en el arranque con configurarHttp, para no acoplar
// este módulo a Pinia ni al router y evitar dependencias circulares.
interface ConexionSesion {
  obtenerToken: () => string | null;
  refrescar: () => Promise<void>; // actualiza el access token en el store
  onFalloAuth: () => void; // limpia la sesión y redirige a /login
}

let sesion: ConexionSesion | null = null;
let refrescarUnaVez: (() => Promise<void>) | null = null;

export function configurarHttp(conexion: ConexionSesion): void {
  sesion = conexion;
  refrescarUnaVez = crearSingleFlight(conexion.refrescar);
}

export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // envía la cookie de refresh
  timeout: 10_000,
});

// Petición: Bearer + correlation-id nuevo por cada llamada.
http.interceptors.request.use((config) => {
  const token = sesion?.obtenerToken() ?? null;
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  config.headers.set('x-correlation-id', nuevoCorrelationId());
  return config;
});

const METODOS_REINTENTABLES = new Set(['get', 'head']);
const ESTADOS_REINTENTABLES = new Set([502, 503, 504]);
const RETRASOS_MS = [300, 600, 1200];
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

http.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;

    // 1) 401: un solo refresh compartido; las demás peticiones esperan en cola.
    if (
      error.response?.status === 401 &&
      original &&
      !original.sinRefresh &&
      !original._reintentadoTrasRefresh &&
      sesion &&
      refrescarUnaVez
    ) {
      original._reintentadoTrasRefresh = true;
      try {
        await refrescarUnaVez();
      } catch {
        sesion.onFalloAuth();
        return Promise.reject(error);
      }
      const token = sesion.obtenerToken();
      if (token) original.headers.set('Authorization', `Bearer ${token}`);
      return http(original);
    }

    // 2) Red, 502, 503 y 504 en GET/HEAD: hasta 3 reintentos con backoff y jitter.
    const metodo = original?.method?.toLowerCase() ?? '';
    const esReintentable =
      original !== undefined &&
      METODOS_REINTENTABLES.has(metodo) &&
      (error.response === undefined || ESTADOS_REINTENTABLES.has(error.response.status));
    if (esReintentable && original) {
      const intentos = original._reintentosRed ?? 0;
      if (intentos < RETRASOS_MS.length) {
        original._reintentosRed = intentos + 1;
        const base = RETRASOS_MS[intentos] ?? 1200;
        await dormir(base + Math.floor(Math.random() * 100));
        return http(original);
      }
    }

    // 3) Cualquier otro error se normaliza a Problem para que los stores lo guarden tipado.
    return Promise.reject(error);
  },
);

// Extrae el problem+json de un error de Axios, o null si no lo trae.
export function extraerProblem(error: unknown): Problem | null {
  if (error instanceof AxiosError && error.response?.data) {
    const parseado = ProblemSchema.safeParse(error.response.data);
    if (parseado.success) return parseado.data;
  }
  return null;
}
