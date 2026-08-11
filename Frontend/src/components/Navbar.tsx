import { useState, useRef, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import Station from "../pages/Station";
import styles from "../styles/NavBar.module.css";
import SettingsPage from "../pages/SettingsPage";
import { MOCK_ALERTS, type AlertLog } from "../data/mockData";

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
      </button>
    </div>
  );
};

// ---- Notification Dropdown ----
const NotificationDropdown: React.FC<{ 
  onClose: () => void;
  alerts: AlertLog[];
  setAlerts: React.Dispatch<React.SetStateAction<AlertLog[]>>;
}> = ({ onClose, alerts, setAlerts }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleMarkAllRead = () => {
    setAlerts(alerts.map(a => ({ ...a, isRead: true })));
  };

  const getAlertIcon = (type: string) => {
    if (type === 'critical') return <i className="bi bi-x-circle-fill" style={{ color: 'var(--color-status-critical)' }}></i>;
    return <i className="bi bi-exclamation-triangle-fill" style={{ color: 'var(--color-status-warning)' }}></i>;
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} น.`;
  };

  return (
    <div className={styles.dropdown} ref={ref} style={{ width: '320px', padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border-line)' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>การแจ้งเตือน</h4>
        <button 
          onClick={handleMarkAllRead}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-brand-secondary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
        >
          อ่านแล้วทั้งหมด
        </button>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {alerts.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            ไม่มีการแจ้งเตือน
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id} 
              className={`${styles.notificationItem} ${alert.isRead ? styles.notificationItemRead : styles.notificationItemUnread}`}
              onClick={() => {
                if (!alert.isRead) {
                  setAlerts(alerts.map(a => a.id === alert.id ? { ...a, isRead: true } : a));
                }
              }}
              title={alert.isRead ? "" : "(คลิกเพื่อทำเครื่องหมายว่าอ่านแล้ว)"}
            >
              <div style={{ marginTop: '2px', fontSize: '16px' }}>
                {getAlertIcon(alert.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: alert.isRead ? 400 : 600, color: 'var(--color-text-primary)' }}>
                  {alert.stationName}
                </div>
                <div style={{ fontSize: '12px', color: alert.isRead ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {alert.message}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
                  {formatTime(alert.time)}
                </div>
              </div>
              {!alert.isRead && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-brand-secondary)', marginTop: '6px' }}></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ---- MenuBar ----
const MenuBar = () => {
  const location     = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showUser,   setShowUser]   = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<AlertLog[]>(MOCK_ALERTS);
  
  // Checking unread alerts
  const hasAlert = alerts.some(a => !a.isRead);

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
          {/* Bell icon */}
          <div className={styles.bellWrap} style={{ position: 'relative' }}>
            <button 
              className={styles.iconBtn} 
              title="การแจ้งเตือน" 
              aria-label="การแจ้งเตือน"
              onClick={() => setShowNotifications(v => !v)}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            {hasAlert && <span className={styles.alertDot} />}
            {showNotifications && <NotificationDropdown onClose={() => setShowNotifications(false)} alerts={alerts} setAlerts={setAlerts} />}
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
  return (
    <div className={styles.layoutContainer}>
      <MenuBar />
      <div className={styles.contentArea}>
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/station"  element={<Station />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default Layout;