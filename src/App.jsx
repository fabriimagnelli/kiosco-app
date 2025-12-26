import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login, { RutaProtegida } from "./components/Login"; 
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
import Cigarrillos from "./components/Cigarrillos"; // RESTAURADO
import "./App.css";

const Layout = () => (
  <div className="fixed inset-0 flex bg-slate-100 font-sans overflow-hidden">
    <div className="flex-shrink-0 h-full">
      <Sidebar />
    </div>
    <div className="flex-1 flex flex-col h-full min-w-0 relative">
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
          
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
               <Route path="/" element={<Inicio />} />
               <Route path="ventas" element={<Ventas />} />
               <Route path="inventario" element={<Productos />} />
               <Route path="cigarrillos" element={<Cigarrillos />} /> {/* RUTA RESTAURADA */}
               <Route path="movimientos" element={<Gastos />} />
               <Route path="lista-proveedores" element={<Proveedores />} />
               <Route path="stock" element={<Stock />} />
               <Route path="cierre" element={<Cierre />} />
               <Route path="reportes" element={<Reportes />} />
               <Route path="deudores" element={<Deudores />} />
               <Route path="balance" element={<Balance />} />
               <Route path="calculadora" element={<Calculadora />} />
               <Route path="apertura" element={<Apertura />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;