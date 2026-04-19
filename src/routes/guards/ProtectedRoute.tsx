import { Navigate } from "react-router-dom";
import { useUserStore } from "../../shared/stores/userStore";

const ProtectedRoute = ({ children }) => {
  const { user } = useUserStore();
 
  return user ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
