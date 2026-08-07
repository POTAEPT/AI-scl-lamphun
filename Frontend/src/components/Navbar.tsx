import { useState, useRef, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import Station from "../pages/Station";
import styles from "../styles/NavBar.module.css";
import MapGIS from "./MapGIS";
import SettingsPage from "../pages/SettingsPage";

// ---- Nav Items config ----
const NAV_ITEMS = [
  {
    path: "/",
    label: "แดชบอร์ด",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: "/map",
    label: "แผนที่ GIS",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    path: "/station",
    label: "ข้อมูลสถานี",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    path: "/settings",
    label: "การตั้งค่า",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
];

// ---- Search Overlay ----
const SearchOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className={styles.searchOverlay} onClick={onClose}>
      <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchInputWrap}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.searchModalIcon}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="ค้นหาสถานี, ระดับน้ำ..."
            className={styles.searchModalInput}
          />
          <kbd className={styles.searchEsc} onClick={onClose}>Esc</kbd>
        </div>
      </div>
    </div>
  );
};

// ---- User Dropdown ----
const UserDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleLogout = () => {
    if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className={styles.dropdown} ref={ref}>
      {/* Profile */}
      <div className={styles.dropdownProfile}>
        <div className={styles.dropdownAvatar}>จน</div>
        <div>
          <div className={styles.dropdownName}>เจ้าหน้าที่เทศบาล</div>
          <div className={styles.dropdownRole}>ผู้ดูแลระบบ</div>
        </div>
      </div>

      <div className={styles.dropdownDivider} />

      <button className={styles.dropdownItem} onClick={handleLogout}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        ออกจากระบบ
      </button>
    </div>
  );
};

// ---- MenuBar ----
const MenuBar = () => {
  const location     = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showUser,   setShowUser]   = useState(false);
  const [hasAlert,   setHasAlert]   = useState(true); // TODO: มาจาก alertCounts จริงๆ

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <>
      <nav className={styles.navbarContainer}>
        {/* 1. Logo */}
        <div className={styles.logoGroup}>
          <h1 className={styles.logoText}>Water Flow</h1>
        </div>

        {/* 2. Menu */}
        <div className={styles.menuGroup}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${isActive(item.path) ? styles.active : ""}`}
            >
              {item.icon}
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* 3. Right Actions */}
        <div className={styles.rightGroup}>
          {/* Search icon */}
          <button
            className={styles.iconBtn}
            onClick={() => setShowSearch(true)}
            title="ค้นหา (ตัวย่อ: /)"
            aria-label="ค้นหา"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {/* Bell icon */}
          <div className={styles.bellWrap}>
            <button className={styles.iconBtn} title="การแจ้งเตือน" aria-label="การแจ้งเตือน">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            {hasAlert && <span className={styles.alertDot} />}
          </div>

          {/* User pill */}
          <div className={styles.userWrap}>
            <button
              className={styles.userBtn}
              onClick={() => setShowUser((v) => !v)}
              aria-label="เมนูผู้ใช้"
            >
              <div className={styles.avatar}>จน</div>
              <span className={styles.userName}>เจ้าหน้าที่</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`${styles.chevron} ${showUser ? styles.chevronUp : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {showUser && <UserDropdown onClose={() => setShowUser(false)} />}
          </div>
        </div>
      </nav>

      {/* Search Overlay */}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
    </>
  );
};

// ---- Layout ----
const Layout = () => {
  const location = useLocation();
  const isMap    = location.pathname === "/map";

  return (
    <div className={styles.layoutContainer}>
      <MenuBar />
      <div className={isMap ? styles.contentAreaFullHeight : styles.contentArea}>
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/map"      element={<MapGIS />} />
          <Route path="/station"  element={<Station />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default Layout;