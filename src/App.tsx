import React from "react";
import './App.css'
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import CalendarPage from "./pages/Calendar";

function Home() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Home</h1>
      <p>Welcome!</p>
      <Link to="/calendar">Go to Calendar</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 12, display: "flex", gap: 12, borderBottom: "1px solid #e5e7eb" }}>
        <Link to="/">Home</Link>
        <Link to="/calendar">Calendar</Link>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Routes>
    </BrowserRouter>
  );
}
