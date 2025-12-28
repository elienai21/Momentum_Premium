import { render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "../Toast"; // Importar ToastProvider e useToast

// Componente auxiliar para testar os toasts
const ToastTester = () => {
  const { notify } = useToast();
  return (
    <div>
      <button onClick={() => notify({ type: "success", message: "Test Success" })}>Success</button>
      <button onClick={() => notify({ type: "error", message: "Test Error" })}>Error</button>
    </div>
  );
};

describe("Toast", () => {
  it("displays success and error toasts", () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    // Test success toast
    fireEvent.click(screen.getByText("Success"));
    expect(screen.getByText("Test Success")).toBeInTheDocument();

    // Test error toast
    fireEvent.click(screen.getByText("Error"));
    expect(screen.getByText("Test Error")).toBeInTheDocument();
  });
});
