"use client";

import styles from "./MobileHeader.module.css";

interface MobileHeaderProps {
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export function MobileHeader({ onToggleSidebar, isSidebarOpen }: MobileHeaderProps) {
    return (
        <header className={styles.mobileHeader}>
            <span className={styles.title}>FocusFlow</span>
            <button
                className={styles.hamburgerBtn}
                onClick={onToggleSidebar}
                aria-label="Toggle Menu"
                aria-expanded={isSidebarOpen}
            >
                ☰
            </button>
        </header>
    );
}
