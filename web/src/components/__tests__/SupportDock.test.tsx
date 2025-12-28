import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SupportDock from "../SupportDock";

// mock de fetch para /api/support/query
global.fetch = vi.fn(async (url, init) => {
  if (typeof url === "string" && url.includes("/api/support/query")) {
    return new Response(JSON.stringify({ reply: "Aqui está a resposta do suporte." }), { status: 200 });
  }
  return new Response(null, { status: 404 });
}) as any;

describe("<SupportDock />", () => {
  it("envia pergunta e renderiza resposta", async () => {
    render(<SupportDock open onClose={() => { }} />);
    const input = screen.getByPlaceholderText(/Descreva sua dúvida/i);
    fireEvent.change(input, { target: { value: "Como importar CSV?" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Aqui está a resposta do suporte/i)).toBeInTheDocument();
    });
  });
});
