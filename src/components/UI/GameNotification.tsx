import React, { useEffect, useState } from 'react';
import './GameNotification.css';

export interface GameNotificationData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface GameNotificationProps {
  notification: GameNotificationData;
  onClose: (id: string) => void;
}

export const GameNotification: React.FC<GameNotificationProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Анимация появления
    setTimeout(() => setIsVisible(true), 10);
    
    // Автоматическое закрытие
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(notification.id), 300);
    }, notification.duration || 3000);

    return () => clearTimeout(timer);
  }, [notification, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(notification.id), 300);
  };

  const icons = {
    success: '✅',
    error: '⚠️',
    warning: '💡',
    info: 'ℹ️'
  };

  return (
    <div className={`game-notification ${notification.type} ${isVisible ? 'visible' : ''}`}>
      <div className="notification-icon">{icons[notification.type]}</div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        <div className="notification-message">{notification.message}</div>
      </div>
      <button className="notification-close" onClick={handleClose}>×</button>
    </div>
  );
};

// Менеджер уведомлений
export const NotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<GameNotificationData[]>([]);

  useEffect(() => {
    // Слушаем кастомные события для показа уведомлений
    const handleNotification = (event: CustomEvent<Omit<GameNotificationData, 'id'>>) => {
      const notification: GameNotificationData = {
        ...event.detail,
        id: `notification-${Date.now()}-${Math.random()}`
      };
      setNotifications(prev => [...prev, notification]);
    };

    window.addEventListener('gameNotification' as any, handleNotification);
    return () => window.removeEventListener('gameNotification' as any, handleNotification);
  }, []);

  const handleClose = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="notifications-container">
      {notifications.map(notification => (
        <GameNotification
          key={notification.id}
          notification={notification}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};

// Хелпер для показа уведомлений
export const showNotification = (
  title: string,
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  duration?: number
) => {
  const event = new CustomEvent('gameNotification', {
    detail: { title, message, type, duration }
  });
  window.dispatchEvent(event);
};