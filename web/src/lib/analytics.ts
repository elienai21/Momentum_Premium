export function track(event: string, payload?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[analytics]", event, payload ?? {});
  }
  // Aqui depois você pluga o analytics real (Amplitude, GA4, etc.)
}
