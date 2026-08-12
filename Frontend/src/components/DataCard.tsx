import React from 'react';
import styles from '../styles/DataCard.module.css'

interface DataCardProps {
  title: string;          // ชื่อหัวข้อการ์ด
  value: string | number; // ค่าข้อมูล
  unit: string;           // หน่วย
  theme?: 'orange' | 'blue' | 'red' | 'gray'; // เลือกธีมสี (Default = orange)
  subtitle?: string;      // คำอธิบายเพิ่มเติมใต้ตัวเลข
}

const DataCard: React.FC<DataCardProps> = ({ 
  title, 
  value, 
  unit, 
  theme = 'orange',
  subtitle
}) => {
  
  // Logic เลือก Class สีตาม Theme ที่ส่งเข้ามา
  const borderClass = theme === 'orange' ? styles.themeOrange 
                    : theme === 'red' ? styles.themeRed 
                    : theme === 'gray' ? styles.themeGray 
                    : styles.themeBlue;
                    
  const textClass = theme === 'orange' ? styles.textOrange 
                  : theme === 'red' ? styles.textRed 
                  : theme === 'gray' ? styles.textGray 
                  : styles.textBlue;

  return (
    <div className={`${styles.cardContainer} ${borderClass}`}>
      
      {/* ส่วนหัวข้อ */}
      <div className={styles.title}>{title}</div>
      
      {/* ส่วนตัวเลขและหน่วย */}
      <div className={styles.valueGroup}>
        <span className={`${styles.value} ${textClass}`}>
          {value}
        </span>
        <span className={styles.unit}>
          {unit}
        </span>
      </div>

      {/* ส่วนคำอธิบายเพิ่มเติม */}
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      
    </div>
  );
};

export default DataCard;