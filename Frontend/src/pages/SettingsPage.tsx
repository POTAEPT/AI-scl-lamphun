import { useState, useEffect, useCallback } from 'react';
import { DeviceService } from '../service/deviceService';
import styles from '../styles/SettingsPage.module.css';

// ---- Types ----
interface SettingsStation {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  waterLevel: string;
  warningLevel: number;   // มาจาก API (devices.warningLevel)
  criticalLevel: number;  // warningLevel * 1.1
  signal: 'online' | 'offline';
  battery: number;
}

type SettingsTab = 'stations' | 'alerts' | 'account';

// ---- Sub: Sidebar ----
const Sidebar: React.FC<{ activeTab: SettingsTab; onChange: (t: SettingsTab) => void }> = ({
  activeTab,
  onChange,
}) => {
  const items: { id: SettingsTab; icon: string; label: string; sub: string }[] = [
    { id: 'stations', icon: 'bi-broadcast-pin',  label: 'จัดการสถานี',    sub: 'เพิ่ม / แก้ไข / ลบ' },
    { id: 'alerts',   icon: 'bi-bell-fill',       label: 'การแจ้งเตือน',   sub: 'ตั้งค่าระดับเตือน' },
    { id: 'account',  icon: 'bi-person-circle',   label: 'บัญชีผู้ใช้',    sub: 'ข้อมูลและรหัสผ่าน' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <i className="bi bi-gear-wide-connected" style={{ fontSize: 22, color: 'var(--color-text-onBrand)' }} />
        <span className={styles.sidebarTitle}>การตั้งค่า</span>
      </div>
      <nav className={styles.sidebarNav}>
        {items.map((item) => (
          <button
            key={item.id}
            className={`${styles.sidebarItem} ${activeTab === item.id ? styles.sidebarItemActive : ''}`}
            onClick={() => onChange(item.id)}
          >
            <i className={`bi ${item.icon} ${styles.sidebarIcon}`} />
            <div className={styles.sidebarItemText}>
              <span className={styles.sidebarItemLabel}>{item.label}</span>
              <span className={styles.sidebarItemSub}>{item.sub}</span>
            </div>
            {activeTab === item.id && <i className="bi bi-chevron-right" style={{ fontSize: 12, color: 'var(--color-text-onBrand)', marginLeft: 'auto' }} />}
          </button>
        ))}
      </nav>
    </aside>
  );
};

// ---- Sub: Toast Notification ----
const Toast: React.FC<{ message: string; type: 'success' | 'error' }> = ({ message, type }) => (
  <div className={`${styles.toast} ${type === 'success' ? styles.toastSuccess : styles.toastError}`}>
    <i className={`bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
    {message}
  </div>
);

// ---- Sub: Add Station Modal ----
const AddStationModal: React.FC<{
  onClose: () => void;
  onSuccess: (name: string) => void;
}> = ({ onClose, onSuccess }) => {
  const [name,    setName]    = useState('');
  const [kpiKey,  setKpiKey]  = useState('');
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({ name: false, kpiKey: false });

  const handleSubmit = async () => {
    const e = { name: !name.trim(), kpiKey: !kpiKey.trim() };
    setErrors(e);
    if (e.name || e.kpiKey) return;
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800)); // TODO: เรียก API จริง
      onSuccess(name.trim());
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>เพิ่มสถานีใหม่</span>
          <button className={styles.modalClose} onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ชื่อสถานี</label>
            <input
              className={`${styles.formInput} ${errors.name ? styles.formInputError : ''}`}
              placeholder="เช่น ลำน้ำปิง สาขา 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <span className={styles.formError}>กรุณาระบุชื่อสถานี</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>KPI Key (Device ID)</label>
            <input
              className={`${styles.formInput} ${errors.kpiKey ? styles.formInputError : ''}`}
              placeholder="เช่น DEV-20250801"
              value={kpiKey}
              onChange={(e) => setKpiKey(e.target.value)}
            />
            {errors.kpiKey && <span className={styles.formError}>กรุณาระบุ KPI Key</span>}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>ยกเลิก</button>
          <button className={styles.btnPrimary} onClick={handleSubmit} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Tab: จัดการสถานี ----
const StationsTab: React.FC<{
  stations: SettingsStation[];
  isLoading: boolean;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}> = ({ stations, isLoading, onShowToast }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddSuccess = (name: string) => {
    setShowAddModal(false);
    onShowToast(`เพิ่มสถานี "${name}" สำเร็จ`, 'success');
  };

  const statusColor = (s: SettingsStation['status']) =>
    s === 'critical' ? 'var(--color-status-critical)' :
    s === 'warning'  ? 'var(--color-status-warning)'  :
    s === 'offline'  ? '#64748b' : 'var(--color-status-normal)';

  const statusLabel = (s: SettingsStation['status']) =>
    s === 'critical' ? 'วิกฤต' : s === 'warning' ? 'เฝ้าระวัง' : s === 'offline' ? 'ออฟไลน์' : 'ปกติ';

  return (
    <section className={styles.tabSection}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>จัดการสถานี</h2>
          <p className={styles.tabDesc}>สถานีทั้งหมด {stations.length} สถานี</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus-lg" /> เพิ่มสถานี
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className={styles.loadingState}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: 24 }} />
          <span>กำลังโหลดข้อมูลสถานี...</span>
        </div>
      ) : stations.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="bi bi-broadcast-pin" style={{ fontSize: 40, opacity: 0.3 }} />
          <span>ยังไม่มีสถานี กดปุ่ม "เพิ่มสถานี" เพื่อเริ่มต้น</span>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ชื่อสถานี</th>
                <th>สัญญาณ</th>
                <th>แบตเตอรี่</th>
                <th>ระดับน้ำ (ม.)</th>
                <th>ระดับเตือน (ม.)</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className={styles.stationNameCell}>
                      <span className={styles.stationDot} style={{ background: statusColor(s.status) }} />
                      <span className={styles.stationName}>{s.name}</span>
                    </div>
                  </td>
                  <td className={styles.centerCell}>
                    <i
                      className={`bi ${s.signal === 'online' ? 'bi-reception-4' : 'bi-reception-1'}`}
                      style={{ color: s.signal === 'online' ? 'var(--color-status-normal)' : '#64748b', fontSize: 16 }}
                    />
                  </td>
                  <td className={styles.centerCell}>
                    <i
                      className={`bi ${s.battery > 20 ? 'bi-battery-full' : 'bi-battery-empty'}`}
                      style={{ color: s.battery > 20 ? 'var(--color-status-normal)' : 'var(--color-status-critical)', fontSize: 16 }}
                    />
                    <span className={styles.batteryPct}>{s.battery}%</span>
                  </td>
                  <td className={styles.centerCell} style={{
                    fontFamily: 'var(--font-data)',
                    fontWeight: 700,
                    color: statusColor(s.status),
                  }}>
                    {s.waterLevel || '-'}
                  </td>
                  <td className={styles.centerCell} style={{ fontFamily: 'var(--font-data)', color: 'var(--color-status-warning)' }}>
                    {s.warningLevel > 0 ? s.warningLevel.toFixed(2) : '-'}
                  </td>
                  <td className={styles.centerCell}>
                    <span className={styles.statusBadge} style={{
                      background: `${statusColor(s.status)}22`,
                      color: statusColor(s.status),
                    }}>
                      {statusLabel(s.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddStationModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
      )}
    </section>
  );
};

// ---- Tab: การแจ้งเตือน ----
const AlertsTab: React.FC<{
  stations: SettingsStation[];
  isLoading: boolean;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}> = ({ stations, isLoading, onShowToast }) => {
  // local state: warningLevel ต่อสถานี (ก่อน save)
  const [levels, setLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    const init: Record<string, number> = {};
    stations.forEach(s => { init[s.id] = s.warningLevel; });
    setLevels(init);
  }, [stations]);

  const handleSave = async (stationId: string, name: string) => {
    try {
      // TODO: เรียก PATCH /api/v2/stations/:id { warningLevel: levels[stationId] }
      await new Promise(r => setTimeout(r, 500));
      onShowToast(`บันทึกระดับเตือนของ "${name}" สำเร็จ`, 'success');
    } catch {
      onShowToast('บันทึกล้มเหลว กรุณาลองใหม่', 'error');
    }
  };

  if (isLoading) return (
    <section className={styles.tabSection}>
      <div className={styles.loadingState}><i className="bi bi-arrow-repeat" /><span>กำลังโหลด...</span></div>
    </section>
  );

  return (
    <section className={styles.tabSection}>
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>การแจ้งเตือน</h2>
          <p className={styles.tabDesc}>ตั้งค่าระดับน้ำที่ต้องการแจ้งเตือนแต่ละสถานี</p>
        </div>
      </div>

      {stations.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="bi bi-bell-slash" style={{ fontSize: 40, opacity: 0.3 }} />
          <span>ไม่มีสถานีให้ตั้งค่า</span>
        </div>
      ) : (
        <div className={styles.alertCardList}>
          {stations.map((s) => {
            const currentLevel = levels[s.id] ?? s.warningLevel;
            const criticalLevel = parseFloat((currentLevel * 1.1).toFixed(2));
            const maxRange = Math.max(currentLevel * 1.5, 10);

            return (
              <div key={s.id} className={styles.alertCard}>
                {/* Card Header */}
                <div className={styles.alertCardHeader}>
                  <div className={styles.alertCardTitle}>
                    <i className="bi bi-geo-alt-fill" style={{ color: 'var(--color-status-normal)', fontSize: 14 }} />
                    <span>{s.name}</span>
                  </div>
                  <span className={styles.alertCardWater}>
                    ระดับน้ำปัจจุบัน: <strong style={{ color: 'var(--color-status-normal)', fontFamily: 'var(--font-data)' }}>{s.waterLevel || '-'} ม.</strong>
                  </span>
                </div>

                {/* Slider + ค่า */}
                <div className={styles.sliderRow}>
                  <div className={styles.sliderGroup}>
                    <label className={styles.sliderLabel}>
                      <i className="bi bi-exclamation-triangle-fill" style={{ color: 'var(--color-status-warning)' }} />
                      ระดับเฝ้าระวัง
                    </label>
                    <div className={styles.sliderWrapper}>
                      <input
                        type="range"
                        min={0}
                        max={maxRange}
                        step={0.1}
                        value={currentLevel}
                        className={styles.sliderWarning}
                        onChange={(e) =>
                          setLevels(prev => ({ ...prev, [s.id]: parseFloat(e.target.value) }))
                        }
                      />
                      <span className={styles.sliderValue} style={{ color: 'var(--color-status-warning)' }}>
                        {currentLevel.toFixed(2)} ม.
                      </span>
                    </div>
                  </div>

                  <div className={styles.sliderGroup}>
                    <label className={styles.sliderLabel}>
                      <i className="bi bi-x-octagon-fill" style={{ color: 'var(--color-status-critical)' }} />
                      ระดับวิกฤต <span style={{ fontSize: 11, opacity: 0.6 }}>(อัตโนมัติ +10%)</span>
                    </label>
                    <div className={styles.sliderWrapper}>
                      <input
                        type="range"
                        min={0}
                        max={maxRange}
                        step={0.1}
                        value={criticalLevel}
                        className={styles.sliderCritical}
                        readOnly
                        style={{ opacity: 0.55, cursor: 'not-allowed' }}
                      />
                      <span className={styles.sliderValue} style={{ color: 'var(--color-status-critical)' }}>
                        {criticalLevel.toFixed(2)} ม.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className={styles.alertCardFooter}>
                  <button
                    className={styles.btnPrimarySmall}
                    onClick={() => handleSave(s.id, s.name)}
                  >
                    บันทึกค่าเตือน
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ---- Tab: บัญชีผู้ใช้ ----
const AccountTab: React.FC = () => {
  const handleLogout = () => {
    if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <section className={styles.tabSection}>
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>บัญชีผู้ใช้</h2>
          <p className={styles.tabDesc}>ข้อมูลบัญชีและการจัดการสิทธิ์</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className={styles.accountCard}>
        <div className={styles.accountAvatar}>
          <i className="bi bi-person-fill" style={{ fontSize: 32, color: 'var(--color-text-onBrand)' }} />
        </div>
        <div className={styles.accountInfo}>
          <div className={styles.accountName}>เจ้าหน้าที่เทศบาล</div>
          <div className={styles.accountRole}>
            <i className="bi bi-shield-check-fill" style={{ color: 'var(--color-status-normal)', fontSize: 12 }} />
            ผู้ดูแลระบบ
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className={styles.accountRows}>
        {[
          { icon: 'bi-building', label: 'หน่วยงาน',       value: 'กองช่างสาธารณูปโภค' },
          { icon: 'bi-telephone', label: 'เบอร์ติดต่อ',    value: '053-XXX-XXXX' },
          { icon: 'bi-envelope',  label: 'อีเมล',          value: 'admin@municipality.go.th' },
          { icon: 'bi-clock',     label: 'เข้าสู่ระบบล่าสุด', value: new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }) },
        ].map(({ icon, label, value }) => (
          <div key={label} className={styles.accountRow}>
            <i className={`bi ${icon}`} style={{ color: 'var(--color-text-secondary)', fontSize: 16, width: 20 }} />
            <span className={styles.accountRowLabel}>{label}</span>
            <span className={styles.accountRowValue}>{value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.accountActions}>
        <button className={styles.btnSecondary} onClick={handleLogout}>
          <i className="bi bi-box-arrow-right" />
          ออกจากระบบ
        </button>
      </div>
    </section>
  );
};

// ---- Main Page ----
const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('stations');
  const [stations,  setStations]  = useState<SettingsStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const latestData = await DeviceService.getLatestStations();

        const map = new Map<string, SettingsStation>();
        for (const s of latestData) {
          if (!map.has(s.stationId)) {
            const wl = parseFloat(s.monitorValue) || 0;
            const warningLevel = 4.5; // TODO: มาจาก s.warningLevel เมื่อ backend ส่งมา
            const criticalLevel = parseFloat((warningLevel * 1.1).toFixed(2));
            const status: SettingsStation['status'] =
              wl >= criticalLevel ? 'critical' :
              wl >= warningLevel  ? 'warning'  :
              s.signal === 'offline' ? 'offline' : 'normal';

            map.set(s.stationId, {
              id:            s.stationId,
              name:          s.stationName || 'Unknown',
              latitude:      s.latitude,
              longitude:     s.longitude,
              status,
              waterLevel:    wl > 0 ? wl.toFixed(3) : '-',
              warningLevel,
              criticalLevel,
              signal:        s.signal,
              battery:       s.battery,
            });
          }
        }

        setStations(Array.from(map.values()));
      } catch (e) {
        console.error('Settings fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className={styles.layout}>
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onChange={setActiveTab} />

        {/* Content */}
        <main className={styles.content}>
          {activeTab === 'stations' && (
            <StationsTab stations={stations} isLoading={isLoading} onShowToast={showToast} />
          )}
          {activeTab === 'alerts' && (
            <AlertsTab stations={stations} isLoading={isLoading} onShowToast={showToast} />
          )}
          {activeTab === 'account' && <AccountTab />}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;