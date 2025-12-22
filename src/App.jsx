import React from "react";
// IMPORTANTE: Agregamos BrowserRouter aquí
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Ventas from "./components/Ventas";
import Productos from "./components/Productos";
import Reportes from "./components/Reportes";
import Cigarrillos from "./components/Cigarrillos";
import Gastos from "./components/Gastos";
import Proveedores from "./components/Proveedores";
import Deudores from "./components/Deudores";
import Cierre from "./components/Cierre";
import Balance from "./components/Balance";
import Apertura from "./components/Apertura";
import Stock from "./components/Stock";
import Login from "./components/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Inicio from "./components/Inicio";

// Componente que decide qué mostrar
function Layout() {
  const { user } = useAuth();

  // SI NO HAY USUARIO --> MUESTRA LOGIN
  if (!user) {
    return <Login />;
  }

  // SI HAY USUARIO --> MUESTRA LA APP COMPLETA
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/cigarrillos" element={<Cigarrillos />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/deudores" element={<Deudores />} />
          <Route path="/cierre" element={<Cierre />} />
          <Route path="/balance" element={<Balance />} />
          <Route path="/apertura" element={<Apertura />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    // EL ROUTER DEBE ENVOLVER TODO EL CONTEXTO
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;