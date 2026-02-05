"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface SettingsContextType {
    name: string;
    setName: (name: string) => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [name, setName] = useState("");
    const [theme, setTheme] = useState<Theme>("light");
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        const storedName = localStorage.getItem("focusflow_name");
        const storedTheme = localStorage.getItem("focusflow_theme") as Theme;

        if (storedName) setName(storedName);

        // Check system preference if no stored theme
        if (storedTheme) {
            setTheme(storedTheme);
        } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
        }

        setIsLoaded(true);
    }, []);

    // Save name to localStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("focusflow_name", name);
        }
    }, [name, isLoaded]);

    // Save theme and apply to document
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("focusflow_theme", theme);
            document.documentElement.setAttribute("data-theme", theme);
        }
    }, [theme, isLoaded]);

    return (
        <SettingsContext.Provider value={{ name, setName, theme, setTheme }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
