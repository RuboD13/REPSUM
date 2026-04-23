/**
 * Integración Gmail — Fase 5
 * Construye URLs para Gmail compose y mailto: con asunto + cuerpo prellenados.
 */

import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Abre Gmail en el navegador con el correo prellenado.
 * Si no hay email del destinatario, abre solo con asunto y cuerpo.
 */
export async function abrirEnGmail(
  asunto: string,
  cuerpo: string,
  emailDestinatario?: string
): Promise<void> {
  const params = new URLSearchParams();
  params.set("view", "cm");
  params.set("su", asunto);
  params.set("body", cuerpo);
  if (emailDestinatario) {
    params.set("to", emailDestinatario);
  }
  const url = `https://mail.google.com/mail/?${params.toString()}`;
  await openUrl(url);
}

/**
 * Genera una URL mailto: estándar como fallback.
 */
export function buildMailtoUrl(
  asunto: string,
  cuerpo: string,
  emailDestinatario?: string
): string {
  const to = emailDestinatario ?? "";
  const params = new URLSearchParams();
  params.set("subject", asunto);
  params.set("body", cuerpo);
  return `mailto:${to}?${params.toString()}`;
}

/**
 * Copia el texto al portapapeles usando la API del navegador.
 */
export async function copiarAlPortapapeles(texto: string): Promise<void> {
  await navigator.clipboard.writeText(texto);
}
