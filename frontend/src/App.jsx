
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdvertisementScanner from "./pages/AdvertisementScanner";
import InvestigationDashboard from "./pages/InvestigationDashboard";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<AdvertisementScanner />}
      />

      <Route
        path="/investigation"
        element={<InvestigationDashboard />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;
