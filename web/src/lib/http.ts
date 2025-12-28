export type BackendError = Error & {
  code?: string;
  status?: number;
};

export async function buildErrorFromResponse(r: Response): Promise<BackendError> {
  let payload: any = null;

  try {
    payload = await r.json();
  } catch {
    // sem body JSON
  }

  const message =
    payload?.message || `Erro na requisição (${r.status} ${r.statusText})`;

  const err: BackendError = Object.assign(new Error(message), {
    code: payload?.code,
    status: r.status,
  });

  return err;
}
