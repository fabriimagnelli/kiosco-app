import React, { useState } from "react";

function Calculadora() {
  const [costo, setCosto] = useState("");
  const [tieneIva, setTieneIva] = useState(true); // Por defecto Sí, según tu documento
  const [margen, setMargen] = useState(30); // Un margen estándar por defecto

  // Cálculos Automáticos
  const costoNumero = parseFloat(costo) || 0;
  const montoIva = tieneIva ? costoNumero * 0.21 : 0;
  const subtotalConIva = costoNumero + montoIva;
  
  const montoGanancia = subtotalConIva * (parseFloat(margen) / 100);
  const precioFinal = subtotalConIva + montoGanancia;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">🧮 Calculadora de Precios</h2>

      <div className="flex gap-8">
        
        {/* IZQUIERDA: FORMULARIO */}
        <div className="w-1/2 bg-white p-8 rounded-lg shadow-md">
          
          {/* 1. COSTO DEL PRODUCTO */}
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Costo del Producto ($)</label>
            <input
              type="number"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="Ej: 1000"
              className="w-full p-3 border border-gray-300 rounded text-xl"
              autoFocus
            />
          </div>

          {/* 2. IVA (SWITCH) */}
          <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded border">
            <span className="font-medium text-gray-700">Incluir IVA (21%)</span>
            <input
              type="checkbox"
              checked={tieneIva}
              onChange={(e) => setTieneIva(e.target.checked)}
              className="w-6 h-6 text-blue-600 cursor-pointer"
            />
          </div>

          {/* 3. PORCENTAJE DE GANANCIA */}
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Porcentaje de Ganancia (%)</label>
            <div className="flex items-center gap-2">
                <input
                type="number"
                value={margen}
                onChange={(e) => setMargen(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded text-xl"
                />
                <span className="text-xl font-bold text-gray-500">%</span>
            </div>
            
            {/* Botones rápidos de porcentaje */}
            <div className="flex gap-2 mt-2">
                {[30, 50, 80, 100].map(val => (
                    <button 
                        key={val}
                        onClick={() => setMargen(val)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm py-1 px-3 rounded"
                    >
                        {val}%
                    </button>
                ))}
            </div>
          </div>

        </div>

        {/* DERECHA: RESULTADO EN TIEMPO REAL */}
        <div className="w-1/2 bg-gray-800 text-white p-8 rounded-lg shadow-md flex flex-col justify-center space-y-6">
            
            <div className="flex justify-between border-b border-gray-600 pb-2">
                <span className="text-gray-400">Costo Base:</span>
                <span className="font-medium">${costoNumero.toFixed(2)}</span>
            </div>

            <div className="flex justify-between border-b border-gray-600 pb-2">
                <span className="text-gray-400">IVA (21%):</span>
                <span className="font-medium text-yellow-400">+ ${montoIva.toFixed(2)}</span>
            </div>

            <div className="flex justify-between border-b border-gray-600 pb-2">
                <span className="text-gray-400">Tu Ganancia ({margen}%):</span>
                <span className="font-medium text-green-400">+ ${montoGanancia.toFixed(2)}</span>
            </div>

            <div className="pt-4 text-center">
                <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Precio de Venta Sugerido</p>
                <p className="text-6xl font-bold text-white">${Math.ceil(precioFinal)}</p>
                <p className="text-xs text-gray-500 mt-2">*Redondeado hacia arriba</p>
            </div>

        </div>

      </div>
    </div>
  );
}

export default Calculadora;