import { useState, useEffect, useCallback } from 'react';
import { DeviceService } from '../service/deviceService';
import { useAuth } from '../contexts/AuthContext';
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

interface UserData {
  id: number;
  name: string;
  role: 'admin' | 'user';
  email: string;
  lastLogin: string;
}

const INITIAL_MOCK_USERS: UserData[] = [
  { id: 1, name: 'แอดมินระบบ', role: 'admin', email: 'admin@scl.com', lastLogin: 'วันนี้ 10:30 น.' },
  { id: 2, name: 'เจ้าหน้าที่ทั่วไป', role: 'user', email: 'user@scl.com', lastLogin: 'วันนี้ 09:00 น.' },
  { id: 3, name: 'สมชาย ใจดี', role: 'user', email: 'somchai@scl.com', lastLogin: 'เมื่อวาน' },
];

// ---- Sub: Sidebar ----
const Sidebar: React.FC<{ activeTab: SettingsTab; onChange: (t: SettingsTab) => void }> = ({
  activeTab,
  onChange,
}) => {
  const { user } = useAuth();
  
  const items: { id: SettingsTab; icon: string; label: string; sub: string }[] = [];
  
  if (user?.role === 'admin') {
    items.push({ id: 'stations', icon: 'bi-broadcast-pin',  label: 'จัดการสถานี',    sub: 'เพิ่ม / แก้ไข / ตั้งค่าระดับเตือน' });
    items.push({ id: 'account',  icon: 'bi-people',          label: 'จัดการผู้ใช้งาน',  sub: 'เพิ่ม / ลด / กำหนดสิทธิ์' });
  } else {
    items.push({ id: 'account',  icon: 'bi-person-circle',   label: 'โปรไฟล์ของฉัน',    sub: 'ข้อมูลบัญชี' });
  }

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



// ---- Tab: บัญชีผู้ใช้ / จัดการผู้ใช้งาน ----
const AccountTab = () => {
  const { user, logout } = useAuth();

  // States สำหรับจัดการรายชื่อผู้ใช้
  const [users, setUsers] = useState<UserData[]>(INITIAL_MOCK_USERS);

  // States สำหรับ Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  // State สำหรับ Modal ยืนยันการลบ (แทนการใช้ browser confirm)
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  // State สำหรับ Toast แจ้งผล (ใช้ร่วมกับ Toast Component ที่มีอยู่แล้ว)
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form States
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');

  // Helper: แสดง Toast แล้วซ่อนอัตโนมัติใน 3 วินาที
  const showLocalToast = (message: string, type: 'success' | 'error') => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  // ---- ฟังก์ชันการลบ: เปิด Modal ยืนยันแทน browser confirm ----
  const handleDelete = (id: number) => {
    const targetUser = users.find(u => u.id === id);
    if (targetUser) {
      setDeleteTarget(targetUser);
    }
  };

  // ---- ยืนยันการลบจริงๆ (เรียกจาก Modal ยืนยัน) ----
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setUsers(users.filter(u => u.id !== deleteTarget.id));
    setDeleteTarget(null);
    showLocalToast(`ลบบัญชี "${deleteTarget.name}" เรียบร้อยแล้ว`, 'success');
  };

  // ---- เปิดฟอร์มแก้ไข ----
  const handleOpenEdit = (u: UserData) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setShowEditModal(true);
  };

  // ---- ฟังก์ชันบันทึกข้อมูลแก้ไข ----
  const handleSaveEdit = () => {
    if (!formName.trim() || !formEmail.trim()) {
      showLocalToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    setUsers(users.map(u =>
      u.id === editingUser?.id
        ? { ...u, name: formName, email: formEmail, role: formRole }
        : u
    ));

    setShowEditModal(false);
    setEditingUser(null);
    showLocalToast('อัปเดตข้อมูลสำเร็จ', 'success');
  };

  // ---- เปิดฟอร์มเพิ่ม ----
  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('user');
    setShowAddModal(true);
  };

  // ---- ฟังก์ชันเพิ่มผู้ใช้ใหม่ ----
  const handleAddUser = () => {
    if (!formName.trim() || !formEmail.trim()) {
      showLocalToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    const newUser: UserData = {
      id: Date.now(), // ใช้ timestamp เป็น id จำลอง
      name: formName,
      email: formEmail,
      role: formRole,
      lastLogin: '-', // ผู้ใช้ใหม่ยังไม่เคยเข้าระบบ
    };

    setUsers([...users, newUser]);
    setShowAddModal(false);
    showLocalToast(`เพิ่มบัญชี "${formName}" เรียบร้อยแล้ว`, 'success');
  };

  if (user?.role !== 'admin') {
    return (
      <section className={styles.tabSection}>
        <div className={styles.tabHeader}>
          <div>
            <h2 className={styles.tabTitle}>โปรไฟล์ของฉัน</h2>
            <p className={styles.tabDesc}>ข้อมูลบัญชีของคุณ</p>
          </div>
        </div>

        <div className={styles.accountCard}>
          <div className={styles.accountAvatar}>
            <i className="bi bi-person-fill" style={{ fontSize: 32, color: 'var(--color-text-onBrand)' }} />
          </div>
          <div className={styles.accountInfo}>
            <div className={styles.accountName}>{user?.name}</div>
            <div className={styles.accountRole}>
              <i className="bi bi-person-badge" style={{ color: 'var(--color-text-secondary)', fontSize: 12 }} />
              เจ้าหน้าที่ทั่วไป
            </div>
          </div>
        </div>

        <div className={styles.accountRows}>
          {[
            { icon: 'bi-building', label: 'หน่วยงาน',       value: 'เทศบาล' },
            { icon: 'bi-envelope',  label: 'อีเมล',          value: 'user@scl.com' },
          ].map(({ icon, label, value }) => (
            <div key={label} className={styles.accountRow}>
              <i className={`bi ${icon}`} style={{ color: 'var(--color-text-secondary)', fontSize: 16, width: 20 }} />
              <span className={styles.accountRowLabel}>{label}</span>
              <span className={styles.accountRowValue}>{value}</span>
            </div>
          ))}
        </div>

        <div className={styles.accountActions}>
          <button className={styles.btnSecondary} onClick={logout}>
            <i className="bi bi-box-arrow-right" />
            ออกจากระบบ
          </button>
        </div>
      </section>
    );
  }

  // Admin View
  return (
    <section className={styles.tabSection}>
      <div className={styles.tabHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className={styles.tabTitle}>จัดการผู้ใช้งานระบบ</h2>
          <p className={styles.tabDesc}>ทั้งหมด {users.length} บัญชี</p>
        </div>
        <button className={styles.btnPrimary} onClick={handleOpenAdd} style={{ padding: '8px 16px', fontSize: '13px' }}>
          <i className="bi bi-person-plus-fill" style={{ marginRight: '6px' }} />
          เพิ่มผู้ใช้งาน
        </button>
      </div>

      <div style={{ marginTop: '24px', overflowX: 'auto', background: 'var(--color-bg-surface)', borderRadius: '12px', border: '1px solid var(--color-border-line)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-line)', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>ชื่อ - นามสกุล</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>อีเมล</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>สิทธิ์การใช้งาน</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>เข้าสู่ระบบล่าสุด</th>
              <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600 }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-line)' }}>
                <td style={{ padding: '16px', color: '#fff', fontWeight: 500 }}>
                  <i className="bi bi-person-circle" style={{ marginRight: '8px', color: u.role === 'admin' ? '#f59e0b' : '#94a3b8' }}></i>
                  {u.name}
                  {u.id === user?.id && <span style={{ marginLeft: '8px', fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>คุณ</span>}
                </td>
                <td style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '100px', 
                    fontSize: '12px', 
                    fontWeight: 600,
                    background: u.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                    color: u.role === 'admin' ? '#f59e0b' : '#94a3b8'
                  }}>
                    {u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่ทั่วไป'}
                  </span>
                </td>
                <td style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>{u.lastLogin}</td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button onClick={() => handleOpenEdit(u)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px 8px' }} title="แก้ไข">
                    <i className="bi bi-pencil-square" />
                  </button>
                  <button onClick={() => handleDelete(u.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px 8px', opacity: u.id === user?.id ? 0.3 : 1 }} title="ลบ" disabled={u.id === user?.id}>
                    <i className="bi bi-trash3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Add User Modal --- */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>เพิ่มผู้ใช้งานใหม่</span>
              <button className={styles.modalClose} onClick={() => setShowAddModal(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>ชื่อ - นามสกุล</label>
                <input className={styles.formInput} placeholder="กรอกชื่อ" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>อีเมล</label>
                <input className={styles.formInput} placeholder="example@email.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>สิทธิ์การใช้งาน</label>
                <select className={styles.formInput} value={formRole} onChange={e => setFormRole(e.target.value as 'admin'|'user')}>
                  <option value="user">เจ้าหน้าที่ทั่วไป</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowAddModal(false)}>ยกเลิก</button>
              <button className={styles.btnPrimary} onClick={handleAddUser}>บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Edit User Modal --- */}
      {showEditModal && editingUser && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>แก้ไขข้อมูลผู้ใช้งาน</span>
              <button className={styles.modalClose} onClick={() => setShowEditModal(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>ชื่อ - นามสกุล</label>
                <input className={styles.formInput} value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>อีเมล</label>
                <input className={styles.formInput} value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>สิทธิ์การใช้งาน</label>
                <select className={styles.formInput} value={formRole} onChange={e => setFormRole(e.target.value as 'admin'|'user')} disabled={editingUser.id === user?.id}>
                  <option value="user">เจ้าหน้าที่ทั่วไป</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowEditModal(false)}>ยกเลิก</button>
              <button className={styles.btnPrimary} onClick={handleSaveEdit}>อัปเดตข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal (แทน browser confirm) --- */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>ยืนยันการลบบัญชี</span>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--color-text-primary)', margin: 0 }}>
                คุณต้องการลบบัญชี <strong>"{deleteTarget.name}"</strong> ออกจากระบบใช่หรือไม่?
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                การกระทำนี้ไม่สามารถยกเลิกได้
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setDeleteTarget(null)}>ยกเลิก</button>
              <button
                className={styles.btnPrimary}
                style={{ background: 'var(--color-status-critical)' }}
                onClick={handleConfirmDelete}
              >
                <i className="bi bi-trash3" style={{ marginRight: '6px' }} />
                ลบบัญชี
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Local Toast สำหรับ AccountTab --- */}
      {localToast && <Toast message={localToast.message} type={localToast.type} />}
    </section>
  );
};


// ---- Main Page ----
const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>(user?.role === 'admin' ? 'stations' : 'account');
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