import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RutaProtegida from "./components/Login"; // Asegúrate de que este import sea correcto según tu estructura
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Inicio from "./components/Inicio";
import Ventas from "./components/Ventas";
import Productos from "./components/Productos";
import Gastos from "./components/Gastos";
import Stock from "./components/Stock";
import Cierre from "./components/Cierre";
import Reportes from "./components/Reportes";
import Deudores from "./components/Deudores";
import Proveedores from "./components/Proveedores";
import Balance from "./components/Balance";
import Calculadora from "./components/Calculadora";
import Apertura from "./components/Apertura";
import "./App.css";

// Layout para las páginas internas (con Sidebar)
const Layout = () => (
  <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
    <Sidebar />
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-4">
        <Outlet />
      </main>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rutas protegidas */}
          <Route element={<Layout />}>
             <Route path="/" element={<Inicio />} />
             <Route path="ventas" element={<Ventas />} />
             
             {/* --- CAMBIOS DE NOMBRE AQUÍ --- */}
             <Route path="inventario" element={<Productos />} />       {/* Antes: productos */}
             <Route path="movimientos" element={<Gastos />} />          {/* Antes: gastos */}
             <Route path="lista-proveedores" element={<Proveedores />} /> {/* Antes: proveedores */}
             
             <Route path="stock" element={<Stock />} />
             <Route path="cierre" element={<Cierre />} />
             <Route path="reportes" element={<Reportes />} />
             <Route path="deudores" element={<Deudores />} />
             <Route path="balance" element={<Balance />} />
             <Route path="calculadora" element={<Calculadora />} />
             <Route path="apertura" element={<Apertura />} />
          </Route>
          
          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;