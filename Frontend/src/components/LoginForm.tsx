import { useState } from 'react';
import styles from '../styles/Form.module.css';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormProps {
  onLoginSuccess?: (userId: number) => void;
}

// LoginResponse is not used in mock

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (identifier === "admin" && password === "admin") {
        login({ id: 1, name: 'แอดมินระบบ', role: 'admin' }, 'mock-token-admin');
        if (onLoginSuccess) onLoginSuccess(1);
      } else if (identifier === "user" && password === "user") {
        login({ id: 2, name: 'เจ้าหน้าที่ทั่วไป', role: 'user' }, 'mock-token-user');
        if (onLoginSuccess) onLoginSuccess(2);
      } else {
        throw new Error("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (ลอง admin/admin หรือ user/user)");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.waveWrapper} aria-hidden="true">
        <svg
          className={`${styles.waveSvg} ${styles.waveBack}`}
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#1e4fa3"
            d="M0,192L48,181.3C96,171,192,149,288,160C384,171,480,213,576,229.3C672,245,768,235,864,213.3C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L0,320Z M1440,192L1488,181.3C1536,171,1632,149,1728,160C1824,171,1920,213,2016,229.3C2112,245,2208,235,2304,213.3C2400,192,2496,160,2592,154.7C2688,149,2784,171,2832,181.3L2880,192L2880,320L1440,320Z"
          />
        </svg>
        <svg
          className={`${styles.waveSvg} ${styles.waveMid}`}
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#2563eb"
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,208C672,213,768,203,864,192C960,181,1056,171,1152,181.3C1248,192,1344,224,1392,240L1440,256L1440,320L0,320Z M1440,224L1488,213.3C1536,203,1632,181,1728,181.3C1824,181,1920,203,2016,208C2112,213,2208,203,2304,192C2400,181,2496,171,2592,181.3C2688,192,2784,224,2832,240L2880,256L2880,320L1440,320Z"
          />
        </svg>
        <svg
          className={`${styles.waveSvg} ${styles.waveFront}`}
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#427AB5"
            d="M0,256L48,250.7C96,245,192,235,288,224C384,213,480,203,576,213.3C672,224,768,256,864,261.3C960,267,1056,245,1152,229.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L0,320Z M1440,256L1488,250.7C1536,245,1632,235,1728,224C1824,213,1920,203,2016,213.3C2112,224,2208,256,2304,261.3C2400,267,2496,245,2592,229.3C2688,213,2784,203,2832,197.3L2880,192L2880,320L1440,320Z"
          />
        </svg>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.brandPanel}>
          <div className={styles.brandContainer}>
            <div className={styles.brandLogo}>
              <img
                src="/logo.png"
                alt="Water Flow Logo"
                className={styles.brandLogoImg}
              />
            </div>
            <h1 className={styles.brandTitle}>Water Flow</h1>
          </div>
        </div>

        <div className={styles.signInPanel}>
          <div className={styles.formCard}>
            <h2 className={styles.signinTitle}>Sign in</h2>

            <form onSubmit={handleSubmit} className={styles.formContent}>
              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.fieldsContainer}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Email</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      className={styles.input}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Email"
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="password"
                      className={styles.input}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.actionsContainer}>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={isLoading}
                >
                  {isLoading ? "Checking..." : "Sign in"}
                </button>
                <button type="button" className={styles.forgotPassword}>
                  Forgot your password?
                </button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>
                * ทดสอบระบบ: ใช้ admin/admin หรือ user/user
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}