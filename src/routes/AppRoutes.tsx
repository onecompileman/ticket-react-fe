import { Route, Routes } from "react-router-dom";
import { BoardPage } from "../pages/Board/BoardPage";
import { HomePage } from "../pages/Home/HomePage";
import { LoginPage } from "../pages/LoginPage";
import ProtectedRoute from "./guards/ProtectedRoute";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/board/:id" element={<ProtectedRoute><BoardPage /></ProtectedRoute>} />
    </Routes>
  );
};