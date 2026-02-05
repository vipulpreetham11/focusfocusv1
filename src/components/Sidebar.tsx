"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/", icon: "🏠" },
    { label: "Tasks", href: "/tasks", icon: "✅" },
    { label: "Timetable", href: "/timetable", icon: "📅" },
    { label: "Weekly View", href: "/weekly", icon: "📊" },
    { label: "Exam Mode", href: "/exam", icon: "🎓" },
    { label: "Settings", href: "/settings", icon: "⚙️" },
];

interface SidebarProps {
    isMobileOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();

    const handleNavClick = () => {
        // Close sidebar on mobile after navigation
        if (onClose) {
            onClose();
        }
    };

    return (
        <>
            {/* Overlay - visible only on mobile when sidebar is open */}
            <div
                className={`${styles.overlay} ${isMobileOpen ? styles.visible : ""}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isMobileOpen ? styles.mobileOpen : ""}`}>
                <div className={styles.logo}>
                    <span>FocusFlow</span>
                </div>

                <nav className={styles.nav}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                                onClick={handleNavClick}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.footer}>
                    <p>FocusFlow v0.1.0</p>
                </div>
            </aside>
        </>
    );
}
