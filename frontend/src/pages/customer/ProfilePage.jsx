import { useAuth } from "../../context/AuthContext";
import "./ProfilePage.css";

function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="profile-page">
      <div className="profile-container">

        <h1>My Profile</h1>

        <p className="profile-subtitle">
          Your RIO Theater Account
        </p>

        <div className="profile-info">

          <div className="profile-field">
            <label>Full Name</label>
            <p>{user.full_name}</p>
          </div>

          <div className="profile-field">
            <label>Email</label>
            <p>{user.email}</p>
          </div>

          <div className="profile-field">
            <label>Phone Number</label>
            <p>{user.phone || "Not provided"}</p>
          </div>

          <div className="profile-field">
            <label>Date of Birth</label>
            <p>
              {user.date_of_birth
                ? new Date(user.date_of_birth).toLocaleDateString()
                : "Not provided"}
            </p>
          </div>

          <div className="profile-field">
            <label>Account Role</label>
            <p>{user.role}</p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default ProfilePage;