import { useState } from "react";

interface Props {
  currentName: string;
  currentAvatar: number;
  onSave: (name: string, avatarIndex: number) => void;
  onCancel: () => void;
}

export default function ProfileCreation({
  currentName,
  currentAvatar,
  onSave,
  onCancel
}: Props) {
  const [name, setName] = useState(currentName);
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);

  // מספר האווטרים שיש בתיקייה
  const AVATAR_COUNT = 30;

  const avatars = Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <h2 style={styles.title}>עריכת פרופיל</h2>

        <label style={styles.label}>כינוי</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label style={styles.label}>אווטאר</label>

        <div style={styles.avatarGrid}>
          {avatars.map((i) => (
            <img
              key={i}
              src={`/avatars/avatar-${i}.png`}
              style={{
                ...styles.avatar,
                border:
                  selectedAvatar === i
                    ? "3px solid #4CAF50"
                    : "2px solid transparent"
              }}
              onClick={() => setSelectedAvatar(i)}
            />
          ))}
        </div>

        <div style={styles.buttons}>
          <button
            style={styles.saveButton}
            onClick={() => onSave(name, selectedAvatar)}
          >
            שמור שינויים
          </button>
          <button style={styles.cancelButton} onClick={onCancel}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

// סגנונות בסיסיים
const styles: Record<string, any> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  container: {
    background: "white",
    padding: "20px",
    width: "500px",
    borderRadius: "10px",
    textAlign: "center"
  },
  title: {
    marginBottom: "20px"
  },
  label: {
    display: "block",
    textAlign: "right",
    marginTop: "10px",
    fontWeight: "bold"
  },
  input: {
    width: "100%",
    padding: "8px",
    marginTop: "5px",
    borderRadius: "5px",
    border: "1px solid #ccc"
  },
  avatarGrid: {
    marginTop: "10px",
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: "10px"
  },
  avatar: {
    width: "60px",
    height: "60px",
    cursor: "pointer",
    borderRadius: "8px",
    objectFit: "cover"
  },
  buttons: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "space-between"
  },
  saveButton: {
    background: "#4CAF50",
    color: "white",
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer"
  },
  cancelButton: {
    background: "#aaa",
    color: "white",
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer"
  }
};
