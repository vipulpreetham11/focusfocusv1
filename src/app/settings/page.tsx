"use client";

import { useSettings } from "@/context/SettingsContext";
import styles from "./page.module.css";
import { useState, useEffect } from "react";

export default function SettingsPage() {
    const { name, setName, theme, setTheme } = useSettings();
    const [localName, setLocalName] = useState(name);
    const [showSaved, setShowSaved] = useState(false);

    // Sync local state if context changes (e.g. initial load)
    useEffect(() => {
        setLocalName(name);
    }, [name]);

    const handleNameSave = () => {
        if (localName.trim() !== name) {
            setName(localName);
            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 2000);
        }
    };

    return (
        <main className={styles.container}>
            <h1 className={styles.title}>Settings</h1>
            <p className={styles.description}>Manage your preferences and configurations.</p>

            <div className={styles.section}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Your Name</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Enter your name"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Theme</label>
                    <div className={styles.themeToggle}>
                        <button
                            className={`${styles.themeButton} ${theme === "light" ? styles.themeButtonActive : ""}`}
                            onClick={() => setTheme("light")}
                        >
                            ☀️ Light
                        </button>
                        <button
                            className={`${styles.themeButton} ${theme === "dark" ? styles.themeButtonActive : ""}`}
                            onClick={() => setTheme("dark")}
                        >
                            🌙 Dark
                        </button>
                    </div>
                </div>

                {showSaved && <p className={styles.saveMessage}>✓ Settings saved</p>}
            </div>
        </main>
    );
}
