import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, MapPin, CheckCircle, Navigation, Phone, Clock, ChevronRight, Map as MapIcon } from 'lucide-react';
import { Order } from '../types';
import { OrderLiveTracker } from './OrderLiveTracker';

interface DeliveryConsoleProps {
  onBack: () => void;
}

export const DeliveryConsole: React.FC<DeliveryConsoleProps> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('amarena_admin_token');
      const res = await axios.get('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Monitor only confirmed (to be delivered) or already shipped
      setOrders(res.data.filter((o: Order) => 
        o.status === 'confirmed' || o.status === 'shipped'
      ).filter((o: Order) => o.clientInfo.deliveryType === 'delivery'));
    } catch (err) {
      console.error("Error fetching delivery orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const updateLocation = async (orderId: string, lat: number, lng: number) => {
    try {
      const token = localStorage.getItem('amarena_admin_token');
      await axios.patch(`/api/admin/orders/${orderId}/location`, { lat, lng }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error updating location:", err);
    }
  };

  const startDelivery = (orderId: string) => {
    setActiveTrackingId(orderId);
    
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        updateLocation(orderId, pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // Also update status immediately
    const token = localStorage.getItem('amarena_admin_token');
    axios.patch(`/api/admin/orders/${orderId}`, { status: 'shipped' }, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(fetchOrders);
  };

  const completeDelivery = async (orderId: string) => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActiveTrackingId(null);

    try {
      const token = localStorage.getItem('amarena_admin_token');
      await axios.patch(`/api/admin/orders/${orderId}`, { status: 'delivered' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err) {
      console.error("Error completing delivery:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-stone-400">
        <Truck className="animate-bounce mb-4" size={48} />
        <p>Carregando entregas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-amarena-purple rounded-2xl text-white shadow-lg">
          <Truck size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-display font-bold text-stone-800 uppercase tracking-tight">Painel do Entregador</h2>
          <p className="text-stone-400 text-sm font-medium">Gerencie suas rotas e entregas em tempo real</p>
        </div>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-stone-50 rounded-[32px] p-12 text-center border border-dashed border-stone-200">
            <MapPin className="mx-auto text-stone-300 mb-4" size={40} />
            <p className="text-stone-500 font-medium italic">Nenhuma entrega pendente no momento.</p>
          </div>
        ) : (
          orders.map(order => (
            <motion.div 
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-[32px] overflow-hidden border-2 transition-all ${activeTrackingId === order.id ? 'border-primary ring-4 ring-primary/10 shadow-xl' : 'border-stone-100 shadow-sm'}`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">#{order.id.slice(-4).toUpperCase()}</span>
                        {order.status === 'shipped' && (
                          <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">
                            <Truck size={10} /> Em Trânsito
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-stone-800">{order.clientInfo.name}</h3>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-stone-400 font-bold mb-1 uppercase">Total</p>
                      <p className="text-xl font-display font-bold text-amarena-red">R$ {order.total.toFixed(2)}</p>
                   </div>
                </div>

                <div className="space-y-3 mb-6 bg-stone-50/50 p-4 rounded-2xl border border-stone-100">
                  <div className="flex gap-3 text-stone-600">
                    <MapPin className="text-primary flex-shrink-0" size={18} />
                    <p className="text-sm font-medium leading-tight">{order.clientInfo.address}</p>
                  </div>
                  <div className="flex gap-3 text-stone-600">
                    <Phone className="text-amarena-green flex-shrink-0" size={18} />
                    <p className="text-sm font-bold tracking-tight">{order.clientInfo.phone}</p>
                  </div>
                  <div className="flex gap-3 text-stone-600">
                    <Clock className="text-stone-400 flex-shrink-0" size={18} />
                    <p className="text-xs font-medium">Pedido feito em: {new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                {activeTrackingId === order.id && (
                  <div className="mb-6 animate-in fade-in zoom-in duration-500">
                    <OrderLiveTracker orderId={order.id} />
                  </div>
                )}

                <div className="flex gap-2">
                  {order.status === 'confirmed' ? (
                    <button 
                      onClick={() => startDelivery(order.id)}
                      className="flex-1 bg-primary text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                    >
                      <Navigation size={20} />
                      Sair para Entrega
                    </button>
                  ) : order.status === 'shipped' ? (
                    <div className="flex flex-col w-full gap-2">
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.clientInfo.address)}`, '_blank')}
                        className="w-full bg-stone-800 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-900 transition-all shadow-md"
                      >
                        <Navigation size={20} />
                        Abrir GPS
                      </button>
                      <button 
                        onClick={() => completeDelivery(order.id)}
                        className="w-full bg-amarena-green text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-amarena-green/90 transition-all shadow-lg active:scale-95"
                      >
                        <CheckCircle size={20} />
                        Finalizar Entrega
                      </button>
                    </div>
                  ) : null}
                  
                  <button 
                    onClick={() => {}} // Could be a details view
                    className="p-4 bg-stone-100 text-stone-500 rounded-2xl hover:bg-stone-200 transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
