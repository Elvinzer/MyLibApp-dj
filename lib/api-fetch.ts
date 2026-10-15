/** Keep native fetch failures actionable without hiding server-side errors. */
export async function apiFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    // Cancelled searches are expected; callers use this signal to ignore them.
    if (options?.signal?.aborted) throw error;
    throw new Error(
      "La connexion à MyLib a été interrompue. Rouvrez MyLib puis réessayez. Votre lien reste dans le formulaire.",
    );
  }
}
