import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'motion/react';
import { Truck, Loader2, Navigation, MapPin } from 'lucide-react';

// Store location (Center of Passos - MG example)
const STORE_LOCATION: [number, number] = [-20.7196, -46.6111];

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers using HTML/CSS for a futuristic look
const truckIcon = new L.DivIcon({
  html: `<div style="background-color: #ef4444; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(239,68,68,0.8); border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const storeIcon = new L.DivIcon({
  html: `<div style="background-color: #f97316; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(249,115,22,0.8); border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface OrderLiveTrackerProps {
  orderId: string;
}

export const OrderLiveTracker: React.FC<OrderLiveTrackerProps> = ({ orderId }) => {
  const [order, setOrder] = useState<any>(null);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderAndLocation = async () => {
    try {
      const res = await axios.get(`/api/orders/${orderId}/track`); 
      setOrder(res.data);
      if (res.data.deliveryLocation) {
        setLocation([res.data.deliveryLocation.lat, res.data.deliveryLocation.lng]);
      }
    } catch (err) {
      console.error("Error fetching order tracking info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderAndLocation();
    const interval = setInterval(fetchOrderAndLocation, 5000); // 5s refresh
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading && !location) {
    return (
      <div className="bg-stone-50 h-64 rounded-3xl flex flex-col items-center justify-center text-stone-400 mt-6 animate-pulse border border-stone-100">
        <Loader2 className="animate-spin mb-2" size={24} />
        <p className="text-xs font-bold uppercase tracking-widest">Localizando entregador...</p>
      </div>
    );
  }

  if (!location || !order) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 overflow-hidden rounded-[40px] border-4 border-stone-800 shadow-2xl relative bg-stone-900"
    >
      <div className="h-80 w-full relative z-0">
        <MapContainer 
          center={location} 
          zoom={15} 
          style={{ height: '100%', width: '100%', background: '#1c1c1c' }}
          zoomControl={false}
        >
          {/* Futuristic Dark Theme Map Tiles from CartoDB */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {/* Store Location */}
          <Marker position={STORE_LOCATION} icon={storeIcon}>
            <Popup className="text-xs font-bold font-brand">Amarena (Origem)</Popup>
          </Marker>

          {/* Delivery Person Location */}
          <Marker position={location} icon={truckIcon}>
            <Popup className="text-xs font-bold font-brand">Entregador</Popup>
          </Marker>

          {/* Futuristic glowing line from store to driver */}
          <Polyline 
            positions={[STORE_LOCATION, location]} 
            pathOptions={{ color: '#ef4444', weight: 4, dashArray: '10, 15', opacity: 0.8 }} 
          />
        </MapContainer>
        
        {/* Futuristic Radar Sweep Overlay */}
        <div className="absolute inset-0 pointer-events-none z-[1000] overflow-hidden mix-blend-screen opacity-30">
          <div className="w-[200%] h-[200%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(239,68,68,0.3)_360deg)] animate-spin" style={{ animationDuration: '4s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-amarena-red/40 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-amarena-red/20 rounded-full" />
        </div>
      </div>
      
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 pointer-events-none z-[2000]">
        <div className="bg-stone-900/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-amarena-red/30 flex items-center gap-3 self-start">
          <div className="w-2 h-2 bg-amarena-red rounded-full animate-ping shadow-[0_0_8px_rgba(239,68,68,1)]" />
          <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Rastreamento ao Vivo</span>
        </div>
      </div>

      <div className="bg-stone-900 p-5 border-t border-stone-800 relative z-[2000]">
        <div className="absolute -top-10 right-6 p-4 bg-amarena-red text-white rounded-2xl shadow-[0_10px_25px_rgba(239,68,68,0.5)] border border-red-400/20">
           <Navigation size={24} className="animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
           <div className="p-3 bg-stone-800 rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-stone-700">
              <Truck size={20} className="text-amarena-red" />
           </div>
           <div>
              <p className="text-[10px] font-black text-amarena-red uppercase tracking-[0.2em] mb-0.5">Sistema de Rastreio Ativo</p>
              <p className="text-sm font-bold text-stone-300">Entregador a caminho. Acompanhe o radar em tempo real.</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
