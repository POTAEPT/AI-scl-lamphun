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

type SettingsTab = 'stations' | 'account';

// ---- Sub: Sidebar ----
const Sidebar: React.FC<{ activeTab: SettingsTab; onChange: (t: SettingsTab) => void }> = ({
  activeTab,
  onChange,
}) => {
  const items: { id: SettingsTab; icon: string; label: string; sub: string }[] = [
    { id: 'stations', icon: 'bi-broadcast-pin',  label: 'จัดการสถานี',    sub: 'เพิ่ม / แก้ไข / ตั้งค่าระดับเตือน' },
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
  setStations: React.Dispatch<React.SetStateAction<SettingsStation[]>>;
  isLoading: boolean;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}> = ({ stations, setStations, isLoading, onShowToast }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleAddSuccess = (name: string) => {
    setShowAddModal(false);
    onShowToast(`เพิ่มสถานี "${name}" สำเร็จ`, 'success');
  };

  const handleSaveLevel = async (stationId: string) => {
    try {
      const savedLevelsStr = localStorage.getItem('mock_warning_levels');
      const savedLevels = savedLevelsStr ? JSON.parse(savedLevelsStr) : {};
      const val = parseFloat(editValue);
      if (isNaN(val) || val <= 0) {
        onShowToast('ค่าระดับเตือนไม่ถูกต้อง', 'error');
        return;
      }
      savedLevels[stationId] = val;
      localStorage.setItem('mock_warning_levels', JSON.stringify(savedLevels));
      setEditingId(null);
      
      // อัปเดตสถานะในตารางทันทีโดยไม่ต้องรีเฟรชหน้า
      setStations(prev => prev.map(s => {
        if (s.id === stationId) {
          const wl = parseFloat(s.waterLevel) || 0;
          const criticalLevel = parseFloat((val * 1.1).toFixed(2));
          const status = wl >= criticalLevel ? 'critical' : wl >= val ? 'warning' : s.signal === 'offline' ? 'offline' : 'normal';
          return { ...s, warningLevel: val, criticalLevel, status };
        }
        return s;
      }));

      onShowToast(`บันทึกระดับเตือนสำเร็จ`, 'success');
    } catch {
      onShowToast('บันทึกล้มเหลว', 'error');
    }
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
      {stations.length === 0 && !isLoading ? (
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
                <th>ตั้งระดับเตือน (ม.)</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} style={{ pointerEvents: 'none' }}>
                    <td><div className="skeleton skeleton-text" style={{ width: '120px', margin: 0 }}></div></td>
                    <td className={styles.centerCell}><div className="skeleton skeleton-circle" style={{ width: 20, height: 20, margin: '0 auto' }}></div></td>
                    <td className={styles.centerCell}><div className="skeleton skeleton-circle" style={{ width: 20, height: 20, margin: '0 auto' }}></div></td>
                    <td className={styles.centerCell}><div className="skeleton skeleton-text" style={{ width: '40px', margin: '0 auto' }}></div></td>
                    <td className={styles.centerCell}><div className="skeleton skeleton-text" style={{ width: '60px', margin: '0 auto' }}></div></td>
                    <td className={styles.centerCell}><div className="skeleton skeleton-text" style={{ width: '40px', margin: '0 auto' }}></div></td>
                  </tr>
                ))
              ) : stations.map((s) => (
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
                    {editingId === s.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <input 
                          type="number"
                          style={{ width: '60px', background: 'var(--color-bg-panel)', color: 'white', border: '1px solid #475569', borderRadius: '4px', textAlign: 'center', fontSize: '13px', padding: '2px' }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveLevel(s.id)}
                          autoFocus
                        />
                        <button style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', padding: 0 }} onClick={() => handleSaveLevel(s.id)} title="บันทึก">
                          <i className="bi bi-check2-circle" style={{ fontSize: '18px' }}></i>
                        </button>
                        <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }} onClick={() => setEditingId(null)} title="ยกเลิก">
                          <i className="bi bi-x-circle" style={{ fontSize: '18px' }}></i>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span>{s.warningLevel > 0 ? s.warningLevel.toFixed(2) : '-'}</span>
                        <i 
                          className="bi bi-pencil-square" 
                          style={{ cursor: 'pointer', opacity: 0.5, fontSize: '14px', transition: '0.2s' }} 
                          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}
                          onClick={() => { setEditingId(s.id); setEditValue(s.warningLevel.toString()); }}
                          title="แก้ไขระดับเตือน"
                        ></i>
                      </div>
                    )}
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
            const savedLevelsStr = localStorage.getItem('mock_warning_levels');
            const savedLevels = savedLevelsStr ? JSON.parse(savedLevelsStr) : {};
            const warningLevel = savedLevels[s.stationId] ?? 4.5; // TODO: มาจาก s.warningLevel เมื่อ backend ส่งมา
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
            <StationsTab stations={stations} setStations={setStations} isLoading={isLoading} onShowToast={showToast} />
          )}

          {activeTab === 'account' && <AccountTab />}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;