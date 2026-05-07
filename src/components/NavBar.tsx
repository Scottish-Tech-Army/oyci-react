import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";
import logo from "../assets/OYCI-Logo.png";

export default function NavBar({
    userName,
    role,
    onLogout,
}: {
    userName: string;
    role: string;
    onLogout: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close menu on route change
    useEffect(() => {
        setMenuOpen(false);
        setProfileOpen(false);
    }, [location]);

    // Shadow on scroll
    useEffect(() => {
        function handleScroll() {
            setScrolled(window.scrollY > 8);
        }
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const getInitials = (name?: string) => {
        if (!name) return "?";
        return name
            .trim()
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    return (
        <header className={`nav ${scrolled ? "navScrolled" : ""}`}>
            {/* Logo */}
            <div
                className="navBrand"
                onClick={() => navigate("/dashboard")}
                role="button"
                tabIndex={0}
                aria-label="Go to dashboard"
            >
                <img src={logo} alt="OYCI" className="navLogo" />
            </div>

            <div className="navTitle" role="banner" aria-label="Staff Management System">
                <span className="navTitleText">STAFF & EVENT MANGEMENT</span>
            </div>

            {/* Hamburger */}
            <button
                className={`hamburger ${menuOpen ? "open" : ""}`}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <span />
                <span />
                <span />
            </button>

            {/* Nav links */}
            <nav className={`navLinks ${menuOpen ? "open" : ""}`}>
                <NavLink to="/dashboard" className="navLink" end>Dashboard</NavLink>

                {/* Admin-only links */}
                {role === "Admin" && (
                    <>
                        <NavLink to="/events" className="navLink">Manage Events</NavLink>
                        <NavLink to="/staff" className="navLink">Manage Staff</NavLink>
                        <NavLink to="/leave" className="navLink">Manage Absence</NavLink>
                        <NavLink to="/calendar" className="navLink">Calendar</NavLink>
                        <NavLink to="/report" className="navLink">Reports</NavLink>
                    </>
                )}

                {/* Staff-only links */}
                {role === "Staff" && (
                    <>
                        <NavLink to="/calendar" className="navLink">Calendar</NavLink>
                        <NavLink to="/leave" className="navLink">My Absence</NavLink>
                    </>
                )}

                {/* User */}
                <div className="navUserSection" ref={dropdownRef}>
                    <button
                        className="navUserBtn"
                        onClick={() => setProfileOpen(!profileOpen)}
                        aria-label="Open profile menu"
                        aria-expanded={profileOpen}
                    >
                        <div className={`navAvatar ${profileOpen ? "avatarActive" : ""}`}>
                            {getInitials(userName)}
                        </div>
                    </button>

                    <div className={`navDropdown ${profileOpen ? "open" : ""}`}>
                        <div className="navUserNameRole">
                            {userName} <span>({role})</span>
                        </div>
                        <button onClick={() => navigate("/profile")}>👤 Profile</button>
                        <button className="danger" onClick={onLogout}>🚪 Log out</button>
                    </div>
                </div>
            </nav>
        </header>
    );
}