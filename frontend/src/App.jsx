import { BrowserRouter, Routes, Route } from "react-router-dom";

import Footer from "./components/common/Footer";

import MovieManagementPage from "./pages/admin/MovieManagementPage";

import "./App.css";


function App() {
  return (
    <BrowserRouter>
      <main className="main-content">
        <Routes>
          <Route
            path="/admin/movies"
            element={<MovieManagementPage />}
          />
        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  );
}













export default App;