// src/components/__tests__/simple.test.tsx
import { render, screen } from "@testing-library/react";
import React from "react";

test("Simples Teste", () => {
  render(<div>Hello, world!</div>);
  expect(screen.getByText("Hello, world!")).toBeInTheDocument();
});
