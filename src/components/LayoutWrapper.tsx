"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import styles from "./LayoutWrapper.module.css";

interface LayoutWrapperProps {
    children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
    const pathname = usePathname();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [pathname]);

    const toggleSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
    const closeSidebar = () => setIsMobileSidebarOpen(false);

    return (
        <>
            <MobileHeader
                onToggleSidebar={toggleSidebar}
                isSidebarOpen={isMobileSidebarOpen}
            />
            <div className={styles.layoutContainer}>
                <Sidebar
                    isMobileOpen={isMobileSidebarOpen}
                    onClose={closeSidebar}
                />
                <div className={styles.mainContent}>
                    <div className="page-content">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}
