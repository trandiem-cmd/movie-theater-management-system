
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Footer from "./components/common/Footer";
import MovieManagementPage from "./pages/admin/MovieManagementPage";

import HomePage from "./pages/customer/HomePage";
import MovieListPage from "./pages/customer/MovieListPage";
import MovieDetailPage from "./pages/customer/MovieDetailPage";
import LoginPage from "./pages/auth/LoginPage";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <main className="main-content">
        <Routes>
          {/* Customer pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<MovieListPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin pages */}
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
