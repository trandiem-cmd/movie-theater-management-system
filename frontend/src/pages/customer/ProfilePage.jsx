import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { updateProfile, changePassword } from "../../api";
import { Pencil, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Edit Profile states
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
  });

  // Change Password states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Initialize profile data
  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || "",
        phone: user.phone || "",
        date_of_birth: user.date_of_birth
          ? String(user.date_of_birth).slice(0, 10)
          : "",
      });
    }
  }, [user]);

  // Edit Profile handlers
  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setProfile({
      full_name: user.full_name || "",
      phone: user.phone || "",
      date_of_birth: user.date_of_birth
        ? String(user.date_of_birth).slice(0, 10)
        : "",
    });

    setError("");
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    try {
      setIsSaving(true);

      const result = await updateProfile(profile);

      setProfile({
        full_name: result.user.full_name || "",
        phone: result.user.phone || "",
        date_of_birth: result.user.date_of_birth
          ? String(result.user.date_of_birth).slice(0, 10)
          : "",
      });

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password handlers
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordCancel = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordError("");
    setIsChangingPassword(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setIsPasswordSaving(true);

      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      );

      // Backend already destroys the session and clears the cookie.
      navigate("/login", { replace: true });
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setIsPasswordSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Profile Header */}
        <div className="profile-header">
          <h1>My Profile</h1>

          {!isEditing && (
            <button
              type="button"
              className="edit-profile-btn"
              onClick={handleEdit}
              aria-label="Edit profile"
              title="Edit Profile"
            >
              <Pencil size={20} />
            </button>
          )}
        </div>

        <p className="profile-subtitle">
          Your RIO Theater Account
        </p>

        {error && <p className="profile-error">{error}</p>}
        {success && <p className="profile-success">{success}</p>}

        {/* Profile Information */}
        <div className="profile-info">
          {isEditing ? (
            <form onSubmit={handleSave}>
              <div className="profile-field">
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  value={profile.full_name}
                  onChange={handleChange}
                  maxLength={100}
                  required
                />
              </div>

              <div className="profile-field">
                <label>Email</label>
                <p>{user.email}</p>
              </div>

              <div className="profile-field">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  maxLength={20}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="date_of_birth">Date of Birth</label>
                <input
                  id="date_of_birth"
                  type="date"
                  name="date_of_birth"
                  value={profile.date_of_birth}
                  onChange={handleChange}
                />
              </div>

              <div className="profile-field">
                <label>Account Role</label>
                <p>{user.role}</p>
              </div>

              <div className="profile-actions">
                <button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="profile-field">
                <label>Full Name</label>
                <p>{profile.full_name}</p>
              </div>

              <div className="profile-field">
                <label>Email</label>
                <p>{user.email}</p>
              </div>

              <div className="profile-field">
                <label>Phone Number</label>
                <p>{profile.phone || "Not provided"}</p>
              </div>

              <div className="profile-field">
                <label>Date of Birth</label>
                <p>
                  {profile.date_of_birth
                    ? new Date(
                        `${profile.date_of_birth}T00:00:00`
                      ).toLocaleDateString()
                    : "Not provided"}
                </p>
              </div>

              <div className="profile-field">
                <label>Account Role</label>
                <p>{user.role}</p>
              </div>
            </>
          )}
        </div>

        {/* Change Password */}
        {!isEditing && (
          <div className="password-section">
            <div className="password-header">
              <div>
                <LockKeyhole size={15} />
                <h2>Password</h2>
              </div>

              {!isChangingPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setPasswordError("");
                    setIsChangingPassword(true);
                  }}
                >
                  Change Password
                </button>
              )}
            </div>

            {isChangingPassword && (
              <form onSubmit={handlePasswordSubmit}>
                {passwordError && (
                  <p className="profile-error">{passwordError}</p>
                )}

                <div className="profile-field">
                  <label htmlFor="currentPassword">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    minLength={8}
                    required
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    minLength={8}
                    required
                  />
                </div>

                <div className="profile-actions">
                  <button type="submit" disabled={isPasswordSaving}>
                    {isPasswordSaving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={handlePasswordCancel}
                    disabled={isPasswordSaving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;