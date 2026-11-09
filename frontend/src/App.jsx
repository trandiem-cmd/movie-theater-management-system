import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
//import ConnectionTest from "./components/ConnectionTest";
import HomePage from "./pages/customer/HomePage";
import MovieListPage from "./pages/customer/MovieListPage";
import MovieDetailPage from "./pages/customer/MovieDetailPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ProfilePage from "./pages/customer/ProfilePage";
import "./App.css";
import { Omega } from "lucide-react";


function App() {
  return (
    <BrowserRouter>
      <Header />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<MovieListPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  );
}













export default App;