import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SupportDock from "../SupportDock";
import React from "react";

// mock de fetch para /api/support/chat
function mockFetchReply(answer = "Aqui está a resposta do suporte.") {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("/api/support/chat")) {
      return new Response(JSON.stringify({ reply: answer }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockFetchReply();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("<SupportDock />", () => {
  it("envia pergunta e renderiza resposta", async () => {
    render(<SupportDock />);
    const input = screen.getByPlaceholderText(/Descreva sua dúvida/i);
    fireEvent.change(input, { target: { value: "Como importar CSV?" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Aqui está a resposta do suporte/i)).toBeInTheDocument();
    });
  });
});
