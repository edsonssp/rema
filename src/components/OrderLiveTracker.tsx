import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { motion } from 'motion/react';
import { Truck, MapPin, Loader2, Navigation } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
// Store location (Center of Passos - MG example)
const STORE_LOCATION = { lat: -20.7196, lng: -46.6111 }; 

interface OrderLiveTrackerProps {
  orderId: string;
}

const Directions = ({ destination, driverLocation }: { destination: string, driverLocation: { lat: number, lng: number } }) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ 
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#ef4444', // amarena-red
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !destination) return;

    directionsService.route({
      origin: STORE_LOCATION,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING
    }).then(response => {
      directionsRenderer.setDirections(response);
    }).catch(err => console.error("Directions request failed", err));
  }, [directionsService, directionsRenderer, destination]);

  return null;
};

export const OrderLiveTracker: React.FC<OrderLiveTrackerProps> = ({ orderId }) => {
  const [order, setOrder] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderAndLocation = async () => {
    try {
      const res = await axios.get(`/api/orders/${orderId}/track`); 
      setOrder(res.data);
      if (res.data.deliveryLocation) {
        setLocation({ lat: res.data.deliveryLocation.lat, lng: res.data.deliveryLocation.lng });
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

  if (!API_KEY) {
    return (
      <div className="bg-stone-50 rounded-3xl p-6 text-center border-2 border-stone-100 mt-6">
        <Truck className="mx-auto text-stone-300 mb-2" size={32} />
        <p className="text-stone-500 font-bold text-sm">Rastreamento em tempo real disponível em breve.</p>
        <p className="text-stone-400 text-[10px] uppercase tracking-widest mt-1">Configurando Google Maps</p>
      </div>
    );
  }

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
      className="mt-6 overflow-hidden rounded-[40px] border-8 border-white shadow-premium relative bg-stone-100"
    >
      <div className="h-80 w-full">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={location}
            defaultZoom={15}
            center={location}
            mapId="AMARENA_TRACKER"
            disableDefaultUI
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <AdvancedMarker position={location}>
              <div className="p-2 bg-amarena-red rounded-full shadow-lg border-2 border-white ring-4 ring-amarena-red/20 z-10">
                <Truck size={24} className="text-white" />
              </div>
            </AdvancedMarker>

            {order.clientInfo?.address && (
              <Directions 
                destination={order.clientInfo.address} 
                driverLocation={location} 
              />
            )}
          </Map>
        </APIProvider>
      </div>
      
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white flex items-center gap-2 self-start">
          <div className="w-2.5 h-2.5 bg-amarena-green rounded-full animate-ping" />
          <span className="text-[10px] font-black uppercase text-stone-800 tracking-widest">Entregador em Rota</span>
        </div>
      </div>

      <div className="bg-white p-5 border-t border-stone-100 relative">
        <div className="absolute -top-10 right-6 p-4 bg-amarena-red text-white rounded-2xl shadow-xl">
           <Navigation size={24} />
        </div>
        <div className="flex items-center gap-4">
           <div className="p-3 bg-stone-50 rounded-2xl">
              <Truck size={20} className="text-amarena-red" />
           </div>
           <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">Status da Entrega</p>
              <p className="text-sm font-bold text-stone-800">Seu pedido está chegando! Acompanhe o trajeto.</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
