import React from 'react';

interface AlertCardProps {
    criticalCount: number;
    warningCount:  number;
}

const AlertCard: React.FC<AlertCardProps> = ({ criticalCount, warningCount }) => {
    const hasCritical = criticalCount > 0;
    const hasWarning  = warningCount  > 0;
    const hasAlert    = hasCritical || hasWarning;

    // ปกติ
    if (!hasAlert) {
        return (
            <div style={{
                flex: 1,
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 8,
                padding: '20px 24px',
                background: 'var(--color-bg-surface)',
                borderRadius: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                border: '1px solid var(--color-border-line)',
                borderTop: '4px solid var(--color-status-normal)',
                boxSizing: 'border-box' as const,
            }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    สถานะระบบ
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-check-circle-fill" style={{ fontSize: 22, color: 'var(--color-status-normal)' }} />
                    <span style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--color-status-normal)',
                    }}>ปกติทุกสถานี</span>
                </div>
            </div>
        );
    }

    // มีแจ้งเตือน
    const accentColor = hasCritical ? 'var(--color-status-critical)' : 'var(--color-status-warning)';
    const bgColor     = hasCritical ? 'rgba(239,68,68,0.09)' : 'rgba(255,174,0,0.08)';

    return (
        <div style={{
            flex: 1,
            minHeight: 110,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 10,
            padding: '18px 24px',
            background: bgColor,
            borderRadius: 10,
            boxShadow: hasCritical ? '0 2px 12px rgba(239,68,68,0.2)' : '0 2px 12px rgba(255,174,0,0.15)',
            border: `1px solid ${hasCritical ? 'rgba(239,68,68,0.25)' : 'rgba(255,174,0,0.25)'}`,
            borderTop: `4px solid ${accentColor}`,
            boxSizing: 'border-box' as const,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i
                    className="bi bi-exclamation-triangle-fill"
                    style={{
                        fontSize: 18,
                        color: accentColor,
                        animation: hasCritical ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    }}
                />
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    แจ้งเตือน
                </span>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                {hasCritical && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: 28, fontWeight: 700, color: 'var(--color-status-critical)', lineHeight: 1 }}>
                            {criticalCount}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>สถานีวิกฤต</span>
                    </div>
                )}
                {hasWarning && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: 28, fontWeight: 700, color: 'var(--color-status-warning)', lineHeight: 1 }}>
                            {warningCount}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>สถานีเฝ้าระวัง</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertCard;