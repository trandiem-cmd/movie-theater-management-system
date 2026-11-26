
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Footer from "./components/common/Footer";
import Header from "./components/common/Header";
import ProtectedRoute from "./components/common/ProtectedRoute";
import MovieManagementPage from "./pages/admin/MovieManagementPage";

import ShowtimeManagementPage from "./pages/admin/ShowtimeManagementPage";
import AddShowtimePage from "./pages/admin/AddShowtimePage";
import TheaterManagementPage from "./pages/admin/TheaterManagementPage";

import HomePage from "./pages/customer/HomePage";
import MovieListPage from "./pages/customer/MovieListPage";
import MovieDetailPage from "./pages/customer/MovieDetailPage";


import SeatSelectionPage from "./pages/customer/SeatSelectionPage";
import SeatManagementPage from "./pages/admin/SeatManagementPage";


import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import VerifyResetOtpPage from "./pages/auth/VerifyResetOtpPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ProfilePage from "./pages/auth/ProfilePage";
import TheaterListPage from "./pages/customer/TheaterListPage";

import "./App.css";


function App() {
  return (
    <BrowserRouter>
      
      <main className="main-content">
        <Header />
        <Routes>
          {/* Customer pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<MovieListPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />


          <Route path="/theaters" element={<TheaterListPage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage />}
          />
          <Route
            path="/verify-reset-otp"
            element={<VerifyResetOtpPage />}
          />
          <Route
            path="/reset-password"
            element={<ResetPasswordPage />}
          />

          {/* Protected customer pages */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

                      {/* Admin pages */}
            <Route
              path="/admin/movies"
              element={<MovieManagementPage />}
            />

            {/* Customer Seat Selection */}
            <Route
              path="/showtimes/:id/seats"
              element={<SeatSelectionPage />}
            />

            {/* Admin Showtime Management */}
            <Route element={<ProtectedRoute allowedRole="admin" />}>
              <Route
                path="/admin/showtimes"
                element={<ShowtimeManagementPage />}
              />
              <Route
                path="/admin/showtimes/new"
                element={<AddShowtimePage />}
              />
            </Route>

            {/* Admin Theater Management */}
            <Route
              path="/admin/theaters"
              element={<TheaterManagementPage />}
            />

           {/* Admin Seat Management */}
          <Route element={<ProtectedRoute allowedRole="admin" />}>
            <Route
              path="/admin/seats"
              element={<SeatManagementPage />}
            />
          </Route>

        </Routes>
      

      <Footer />
      </main>
    </BrowserRouter>
  );
}

export default App;
