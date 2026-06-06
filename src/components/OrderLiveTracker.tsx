import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { motion } from 'motion/react';
import { Truck, MapPin, Loader2, Navigation, AlertTriangle, IceCream } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
// Store location (Center of Passos - MG)
const STORE_LOCATION = { lat: -20.7196, lng: -46.6111 }; 

interface OrderLiveTrackerProps {
  orderId: string;
}

const RoutePolyline = ({ destination, origin }: { destination: string | google.maps.LatLngLiteral, origin: google.maps.LatLngLiteral }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !destination) return;

    // Clear previous route
    polylinesRef.current.forEach(p => p.setMap(null));

    routesLib.Route.computeRoutes({
      origin: origin,
      destination: destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: '#ef4444', // amarena-red
            strokeWeight: 5,
            strokeOpacity: 0.8
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;
        if (routes[0].viewport) map.fitBounds(routes[0].viewport);
      }
    }).catch(err => console.error("Route calculation failed", err));

    return () => polylinesRef.current.forEach(p => p.setMap(null));
  }, [routesLib, map, destination, origin]);

  return null;
};

export const OrderLiveTracker: React.FC<OrderLiveTrackerProps> = ({ orderId }) => {
  const [order, setOrder] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderAndLocation = async () => {
    try {
      const res = await axios.get(`/api/orders/${orderId}/track`); 
      setOrder(res.data);
      if (res.data.deliveryLocation) {
        setDriverLocation({ lat: res.data.deliveryLocation.lat, lng: res.data.deliveryLocation.lng });
      } else {
        // Fallback to store location if no tracker yet
        setDriverLocation(STORE_LOCATION);
      }
    } catch (err) {
      console.error("Error fetching order tracking info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderAndLocation();
    const interval = setInterval(fetchOrderAndLocation, 8000); // 8s refresh to be safe with quotas
    return () => clearInterval(interval);
  }, [orderId]);

  if (!API_KEY) {
    return (
      <div className="bg-stone-50 rounded-3xl p-8 text-center border-2 border-stone-100 mt-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amarena-purple via-amarena-red to-amarena-green opacity-20" />
        <MapPin className="mx-auto text-stone-300 mb-4" size={40} />
        <h4 className="text-stone-800 font-bold mb-1">Acompanhamento em Tempo Real</h4>
        <p className="text-stone-500 text-sm mb-4">Para ver seu pedido no mapa, é necessário configurar a chave do Google Maps.</p>
        
        <div className="text-left bg-white p-4 rounded-2xl border border-stone-100 shadow-sm inline-block max-w-xs">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-500" /> Instruções de Configuração
          </p>
          <ol className="text-[10px] space-y-2 text-stone-600 font-medium">
            <li>1. Acesse o <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener" className="text-blue-500 underline">Console do Google</a></li>
            <li>2. Gere sua <strong>API Key</strong></li>
            <li>3. No <strong>AI Studio</strong>, vá em <strong>Configurações (⚙️)</strong></li>
            <li>4. Adicione o segredo: <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
          </ol>
        </div>
      </div>
    );
  }

  if (loading && !driverLocation) {
    return (
      <div className="bg-stone-50 h-72 rounded-[40px] flex flex-col items-center justify-center text-stone-400 mt-6 animate-pulse border-4 border-white shadow-xl">
        <Loader2 className="animate-spin mb-3 text-amarena-red" size={32} />
        <p className="text-xs font-black uppercase tracking-[0.2em]">Conectando à Satélite...</p>
      </div>
    );
  }

  if (!driverLocation || !order) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 overflow-hidden rounded-[40px] border-8 border-white shadow-premium relative bg-stone-100"
    >
      <div className="h-96 w-full">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={driverLocation}
            defaultZoom={15}
            center={driverLocation}
            mapId="AMARENA_TRACKER_V2"
            disableDefaultUI
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Driver Marker */}
            <AdvancedMarker position={driverLocation}>
              <div className="relative">
                <div className="absolute -inset-4 bg-amarena-red/20 rounded-full animate-ping" />
                <div className="relative p-2.5 bg-amarena-red rounded-full shadow-lg border-2 border-white z-10 transition-transform active:scale-110">
                  <Truck size={22} className="text-white" />
                </div>
              </div>
            </AdvancedMarker>

            {/* Store Marker */}
            <AdvancedMarker position={STORE_LOCATION}>
               <div className="p-2 bg-white rounded-full shadow-md border-2 border-amarena-purple">
                  <IceCream size={16} className="text-amarena-purple" />
               </div>
            </AdvancedMarker>

            {order.clientInfo?.address && (
              <RoutePolyline 
                origin={STORE_LOCATION}
                destination={order.clientInfo.address} 
              />
            )}
          </Map>
        </APIProvider>
      </div>
      
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl border border-white flex items-center gap-3 self-start scale-90 origin-top-left">
          <div className="w-2 h-2 bg-amarena-green rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase text-stone-800 tracking-widest">Localização Atualizada</span>
        </div>
      </div>

      <div className="bg-white p-6 border-t border-stone-100 relative">
        <div className="absolute -top-12 right-8 p-4 bg-amarena-purple text-white rounded-3xl shadow-2xl flex items-center justify-center">
           <Navigation size={28} className="animate-pulse" />
        </div>
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-amarena-red/5 rounded-3xl flex items-center justify-center">
              <Truck size={28} className="text-amarena-red" />
           </div>
           <div>
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-1">Status da Entrega</p>
              <p className="text-base font-bold text-stone-800 leading-tight">
                {order.status === 'shipped' ? 'Seu pedido está em trânsito!' : 'Aguardando início do trajeto.'}
              </p>
              <p className="text-xs text-stone-400 mt-1">Estimativa baseada no trânsito atual.</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
