import React from 'react';
import { useNotification } from '../hooks/useNotification';
import type { Notification } from '../contexts/notificationContext';

const ErrorIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SuccessIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const InfoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const NotificationToast: React.FC<{ notification: Notification; onDismiss: (id: number) => void }> = ({ notification, onDismiss }) => {
    const { id, message, type } = notification;

    const typeClasses = {
        success: 'from-green-500/80 to-teal-500/80 border-green-400/50 text-green-100',
        error: 'from-red-500/80 to-rose-500/80 border-red-400/50 text-red-100',
        info: 'from-blue-500/80 to-indigo-500/80 border-blue-400/50 text-blue-100',
    };

    const icons = {
        success: <SuccessIcon />,
        error: <ErrorIcon />,
        info: <InfoIcon />,
    };

    return (
        <div 
            className={`glass-panel w-full p-4 flex items-start gap-4 animate-fade-in-up bg-gradient-to-br ${typeClasses[type]}`}
            style={{
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)'
            }}
        >
            <div className="flex-shrink-0">{icons[type]}</div>
            <p className="flex-grow text-sm font-medium">{message}</p>
            <button onClick={() => onDismiss(id)} className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors">
                <CloseIcon />
            </button>
        </div>
    );
};

const NotificationContainer: React.FC = () => {
    const { notifications, removeNotification } = useNotification();

    if (notifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-5 right-5 z-[100] w-full max-w-sm space-y-3">
            {notifications.map(notification => (
                <NotificationToast
                    key={notification.id}
                    notification={notification}
                    onDismiss={removeNotification}
                />
            ))}
        </div>
    );
};

export default NotificationContainer;
