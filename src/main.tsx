import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority:
    "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_ANIUcWB9u",
  client_id: "5ktvp0eslpna0p7k4n34adrub",
  redirect_uri: "http://localhost:5173",
  response_type: "code",
  scope: "email openid phone",
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider {...cognitoAuthConfig}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
