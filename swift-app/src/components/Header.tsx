interface Props {
  activeTab: "downloads" | "library" | "settings";
  onTabChange: (tab: "downloads" | "library" | "settings") => void;
}

export default function Header({ activeTab, onTabChange }: Props) {
  return (
    <nav className="header-nav">
      <button
        className={`nav-btn ${activeTab === "downloads" ? "active" : ""}`}
        onClick={() => onTabChange("downloads")}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path d="M10 3a1 1 0 0 1 1 1v6.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 10.586V4a1 1 0 0 1 1-1z" />
          <path d="M3 15a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z" />
        </svg>
        Downloads
      </button>
      <button
        className={`nav-btn ${activeTab === "library" ? "active" : ""}`}
        onClick={() => onTabChange("library")}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path d="M4 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm2 0v12h8V4H6z" />
        </svg>
        Library
      </button>
      <button
        className={`nav-btn ${activeTab === "settings" ? "active" : ""}`}
        onClick={() => onTabChange("settings")}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" clipRule="evenodd" />
        </svg>
        Settings
      </button>
    </nav>
  );
}
