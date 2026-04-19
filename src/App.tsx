import { useLoadingStore } from "./shared/stores/loadingStore";
import "./App.css";
import { SquareLoader } from "react-spinners";
import { AppRoutes } from "./routes/AppRoutes";
import { ConfirmationModal } from "./shared/components/Modals/ConfirmationModal/ConfirmationModal";

function App() {
  const { loading } = useLoadingStore();

  return (
    <>
      <AppRoutes />

      {/* Global components */}
      <ConfirmationModal />

      {loading && (
        <div className="loader-backdrop">
          <SquareLoader
            color={"#fff"}
            loading={true}
            size={100}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
        </div>
      )}
    </>
  );
}

export default App;
