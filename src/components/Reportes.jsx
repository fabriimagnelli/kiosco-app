import React, { useState, useEffect } from "react";

function Reportes() {
  const [ventas, setVentas] = useState([]);
  const [ticketExpandido, setTicketExpandido] = useState(null);

  // Cargar historial al iniciar
  useEffect(() => {
    // CORRECCIÓN: Agregado "/api" a la ruta
    fetch("http://localhost:3001/api/historial")
      .then((res) => res.json())
      .then((data) => {
        // Validación de seguridad: Si no es una lista, no romper la app
        if (Array.isArray(data)) {
            setVentas(data);
        } else {
            console.error("Error: El servidor no devolvió una lista de ventas", data);
            setVentas([]);
        }
      })
      .catch((error) => console.error("Error de conexión:", error));
  }, []);

  // --- LÓGICA DE AGRUPACIÓN ---
  // 1. Agrupar productos por Ticket ID
  const ventasPorTicket = ventas.reduce((acc, item) => {
    const id = item.ticket_id || "sin_id"; 
    if (!acc[id]) {
        acc[id] = {
            id: id,
            fecha: item.fecha,
            metodo: item.metodo_pago,
            total: 0,
            items: []
        };
    }
    acc[id].items.push(item);
    acc[id].total += item.precio_total;
    return acc;
  }, {});

  // 2. Convertir a lista y ordenar por fecha (más reciente arriba)
  const listaTickets = Object.values(ventasPorTicket).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // 3. Agrupar esos tickets por Día
  const ventasPorDia = listaTickets.reduce((acc, ticket) => {
    // Fecha formateada para Argentina
    const fechaObj = new Date(ticket.fecha);
    const fechaCorta = fechaObj.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
    
    if (!acc[fechaCorta]) acc[fechaCorta] = [];
    acc[fechaCorta].push(ticket);
    return acc;
  }, {});

  const getHora = (fechaStr) => {
    return new Date(fechaStr).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit', timeZone: "America/Argentina/Buenos_Aires" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] p-6 gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">📊 Historial de Ventas</h2>
        <p className="text-gray-500">Agrupado por Día y Comprobante</p>
      </div>

      <div className="bg-white rounded-lg shadow-md flex-1 overflow-y-auto p-4 border border-gray-200">
        
        {Object.keys(ventasPorDia).length === 0 ? (
            <p className="text-center text-gray-400 mt-10">No hay ventas registradas aún.</p>
        ) : (
            Object.keys(ventasPorDia).map((fecha) => (
                <div key={fecha} className="mb-8">
                    {/* CABECERA DEL DÍA */}
                    <div className="flex items-center gap-4 mb-4 sticky top-0 bg-white z-10 py-2 border-b-2 border-indigo-100">
                        <span className="bg-indigo-100 text-indigo-800 px-4 py-1 rounded-full font-bold text-sm">
                            📅 {fecha}
                        </span>
                        <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    {/* LISTA DE TICKETS */}
                    <div className="flex flex-col gap-3">
                        {ventasPorDia[fecha].map((ticket) => (
                            <div key={ticket.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                
                                {/* RESUMEN DEL TICKET (Click para abrir) */}
                                <div 
                                    onClick={() => setTicketExpandido(ticketExpandido === ticket.id ? null : ticket.id)}
                                    className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-200 text-gray-600 font-bold px-2 py-1 rounded text-xs">
                                            🕒 {getHora(ticket.fecha)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-700">Ticket #{ticket.id.slice(-6)}</p>
                                            <p className="text-xs text-gray-500">{ticket.items.length} productos • {ticket.metodo}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <span className="text-xl font-bold text-green-700">$ {ticket.total}</span>
                                        <span className="text-gray-400 text-sm transform transition-transform">
                                            {ticketExpandido === ticket.id ? "▲" : "▼"}
                                        </span>
                                    </div>
                                </div>

                                {/* DETALLE DESPLEGABLE */}
                                {ticketExpandido === ticket.id && (
                                    <div className="bg-white p-4 border-t border-gray-100">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-gray-400 border-b">
                                                    <th className="text-left pb-2 font-normal">Producto</th>
                                                    <th className="text-right pb-2 font-normal">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ticket.items.map((item, index) => (
                                                    <tr key={index} className="border-b last:border-0 border-gray-50">
                                                        <td className="py-2 text-gray-700">{item.producto}</td>
                                                        <td className="py-2 text-right font-bold text-gray-600">$ {item.precio_total}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}

export default Reportes;