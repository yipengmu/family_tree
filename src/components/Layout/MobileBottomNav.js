import React from 'react';
import { ApartmentOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import './MobileBottomNav.css';

const items = [
  { key: 'tree', label: '家谱', icon: <ApartmentOutlined /> },
  { key: 'create', label: '续谱', icon: <EditOutlined />, primary: true },
  { key: 'mine', label: '我的', icon: <UserOutlined /> },
];

const MobileBottomNav = ({ activeItem = 'tree', onMenuClick }) => {
  const normalizedActive = activeItem === 'settings' ? 'mine' : activeItem;

  return (
    <nav className="mobile-bottom-nav" aria-label="主要导航">
      {items.map((item) => {
        const active = normalizedActive === item.key;
        return (
          <button
            key={item.key}
            type="button"
            className={`mobile-bottom-item ${item.primary ? 'primary' : ''} ${active ? 'active' : ''}`}
            onClick={() => onMenuClick?.(item.key)}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className="mobile-bottom-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
