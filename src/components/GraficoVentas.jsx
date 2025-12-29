import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GraficoVentas = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Pedimos los datos al backend
    fetch('http://localhost:3001/reportes/ventas_semana')
      .then(res => res.json())
      .then(resultados => {
        // Transformamos los datos para que el gráfico los entienda
        // Convertimos "2023-11-25" -> "Sáb" (Sábado)
        const datosFormateados = resultados.map(item => {
            // Truco para evitar problemas de zona horaria: agregamos "T00:00"
            const fechaObj = new Date(item.fecha_dia + 'T00:00:00'); 
            const nombreDia = new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(fechaObj);
            
            return {
                nombre: nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1), // Capitalizar: "lun" -> "Lun"
                ventas: item.total
            };
        });
        setData(datosFormateados);
      })
      .catch(err => console.error("Error cargando gráfico:", err));
  }, []);

  if (data.length === 0) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 h-96 flex items-center justify-center text-slate-400">
            Cargando datos... o no hubo ventas esta semana.
        </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 h-96 animate-fade-in">
      <h3 className="text-lg font-bold text-slate-700 mb-4">Ventas de la Semana</h3>
      <div className="w-full h-full pb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
                dataKey="nombre" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}} 
                dy={10}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}} 
                tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
                cursor={{fill: '#f1f5f9'}}
                formatter={(value) => [`$${value}`, "Ventas"]}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
            />
            <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GraficoVentas;