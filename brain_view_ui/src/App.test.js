import { render, screen } from "@testing-library/react";
import App from "./App";

// Mock NiiVue to avoid ESM issues and canvas dependencies
jest.mock("./components/NiiVue", () => {
  return function MockNiiVue() {
    return <div data-testid="niivue-mock">NiiVue Mock</div>;
  };
});

test("renders login page by default", () => {
  render(<App />);
  // The app should show login form initially if no token
  const loginHeader = screen.getByText(/Logowanie/i); // Header in Login.tsx
  expect(loginHeader).toBeInTheDocument();
});
