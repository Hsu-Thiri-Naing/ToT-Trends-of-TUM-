import { useEffect, useState } from "react";
import UserAvatar from "../common/UserAvatar";
import "./ProfileView.css";

export default function EditProfile({ user, onUpdateProfile, onGoToMyProfile }) {
  const [username, setUsername] = useState(user.name || "");
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const initialAvatar = user.profilePicture || user.avatar || user.profile_picture;

  useEffect(() => {
    if (!profilePicture) return;
    const url = URL.createObjectURL(profilePicture);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePicture]);

  function handleImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      event.target.value = "";
      setProfilePicture(null);
      setPreviewUrl(null);
      setError("Choose an image up to 2 MB.");
      return;
    }

    setError("");
    setProfilePicture(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await onUpdateProfile({ username, profilePicture });
      onGoToMyProfile();
    } catch (err) {
      setError(err.message || "Could not save your profile. Try again.");
      setSaving(false);
    }
  }

  return (
    <section className="profile-page view-enter">
      <div className="profile-shell">
        <div className="profile-editor liquid-glass glass-responsive">
          <h1>Edit Profile</h1>

          <form onSubmit={handleSubmit} aria-busy={saving}>
            <div className="profile-picture-field">
              <span className="profile-portrait glass-lens">
                <UserAvatar src={previewUrl || initialAvatar} alt="Profile picture preview" width="96" height="96" />
              </span>
              <div className="profile-field">
                <label htmlFor="profilePicture">Profile picture</label>
                <input
                  className="profile-input"
                  type="file"
                  id="profilePicture"
                  name="profilePicture"
                  accept="image/*"
                  aria-describedby="profile-picture-hint"
                  onChange={handleImageChange}
                  disabled={saving}
                />
                <p id="profile-picture-hint">Choose an image up to 2 MB.</p>
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="username">Username</label>
              <input
                className="profile-input"
                type="text"
                id="username"
                name="username"
                autoComplete="nickname"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={saving}
              />
            </div>

            {error && <p className="profile-form-error" role="alert">{error}</p>}

            <div className="profile-actions profile-editor-actions">
              <button type="button" className="profile-action glass-lens" onClick={onGoToMyProfile} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="profile-action glass-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
