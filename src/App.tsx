import React, { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  IceCream, 
  X, 
  ShoppingBag, 
  ShoppingCart,
  MessageCircle, 
  Settings,
  Trash2,
  Edit,
  Check,
  Copy,
  CreditCard,
  QrCode,
  Printer,
  LayoutDashboard,
  Package,
  History,
  RefreshCcw,
  LogOut,
  ChevronLeft,
  MapPin,
  Instagram,
  CupSoda,
  Soup,
  Upload,
  Sliders
} from 'lucide-react';
import axios from 'axios';

// --- Types ---
interface Product {
  id: string;
  name: string;
  category: 'acai' | 'sorvete' | 'milkshake' | 'picole' | 'promos' | 'potes' | 'addon';
  price: number;
  description: string;
  image?: string;
  active?: boolean;
}

interface Order {
  id: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  deliveryFee?: number;
  clientInfo?: {
    name: string;
    phone: string;
    address: string;
  };
}

// --- Custom Icons ---
const AcaiBowlIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Base Bowl */}
    <path d="M4 12c0 4.418 3.582 8 8 8s8-3.582 8-8" fill="currentColor" fillOpacity="0.2" />
    <path d="M3 11h18" />
    <path d="M4 11c0 4.418 3.582 8 8 8s8-3.582 8-8" />
    <path d="M8 19h8" />
    {/* Creamy Acai / Ice Cream Top */}
    <path d="M6 11c0-2 1.5-3.5 3-4s2-2 4-2 2.5 1.5 4 2 3 2 3 4" fill="currentColor" fillOpacity="0.3" />
    {/* Fruits/Toppings (strawberries/banana slices) */}
    <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="12" cy="6" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
    <path d="M12 7.5v3.5" />
  </svg>
);

const PopsicleBittenIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 14V6c0-3.3-2.7-6-6-6S5 2.7 5 6v8c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2Z" />
    <path d="M11 16v4" />
    <path d="M17 6a3 3 0 0 0-3-3" />
  </svg>
);

// --- Components ---

const Logo = ({ className = "" }: { className?: string; light?: boolean }) => (
  <div className={`flex items-center gap-4 ${className} group cursor-default select-none`}>
    <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 bg-white rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.2)] overflow-hidden border-[4px] border-white transform -rotate-6 transition-all group-hover:rotate-0 group-hover:scale-105 z-10">
       <div className="relative w-full h-full flex items-center justify-center">
          {/* Official Brand Logo Image */}
          <img 
            src="/Logo.png"
            alt="Amarena Official Logo" 
            className="w-full h-full object-contain p-2"
          />
          {/* Clearer glossy overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
       </div>
    </div>
    <div className="flex-1 text-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
       <h1 className="font-brand text-4xl md:text-5xl leading-none tracking-tight text-white mb-1">Amarena</h1>
       <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] w-4 bg-white/30" />
          <p className="text-amarena-green font-black text-[10px] tracking-[0.4em] uppercase">SORVETES</p>
          <div className="h-[1px] w-4 bg-white/30" />
       </div>
       <p className="text-white/50 text-[9px] font-bold tracking-widest uppercase mt-2">Passos — MG</p>
    </div>
  </div>
);

/* REMOVED MESSY BASE64 */
const LogoOldPart1 = () => null;
/*
            src="data:image/jpeg;base64,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|
            alt="Amarena Official Logo" 
            className="w-full h-full object-contain"
          />
  </div>
);

*/ const LogoOld = null;

// Modern Ticket Visual Component
const ModernTicket = ({ order, onDismiss }: { order: Order; onDismiss: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: 20 }}
    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto py-10"
    onClick={onDismiss}
  >
    <div 
      className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl relative"
      onClick={e => e.stopPropagation()}
    >
      {/* Decorative Ticket Top */}
      <div className="bg-amarena-red h-24 flex items-center justify-center relative">
        <button 
          onClick={onDismiss}
          className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all flex items-center gap-1 pr-3"
        >
          <ChevronLeft size={18} />
          <span className="text-[10px] uppercase font-black tracking-widest">Voltar</span>
        </button>

        <div className="absolute -bottom-4 left-0 right-0 flex justify-around px-4">
           {Array.from({ length: 8 }).map((_, i) => (
             <div key={i} className="w-8 h-8 bg-white rounded-full -mb-4 shadow-inner" />
           ))}
        </div>
        <div className="text-white text-center">
           <h3 className="font-brand text-3xl">Amarena</h3>
           <p className="text-[10px] tracking-[0.3em] font-black opacity-80 uppercase">Recibo Digital</p>
        </div>
      </div>

      <div className="p-8 pt-10 text-stone-800">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Senha do Pedido</p>
            <h4 className="text-4xl font-brand text-amarena-purple">#{order.id.slice(-4).toUpperCase()}</h4>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Data</p>
            <p className="text-sm font-bold">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
            <p className="text-[10px] font-medium text-stone-400">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest border-b border-stone-100 pb-2">Itens</p>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-stone-100 rounded-lg text-xs font-bold text-stone-600">{item.quantity}x</span>
                <span className="font-bold text-sm text-stone-700">{item.name}</span>
              </div>
              <span className="font-bold text-sm text-stone-900 text-right">R$ {(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="bg-stone-50 rounded-3xl p-4 space-y-2 mb-8">
          <div className="flex justify-between text-xs font-bold text-stone-400">
            <span>Subtotal</span>
            <span>R$ {(order.total - (order.deliveryFee || 0)).toFixed(2)}</span>
          </div>
          {order.deliveryFee && order.deliveryFee > 0 && (
            <div className="flex justify-between text-xs font-bold text-stone-400">
              <span>Entrega</span>
              <span>R$ {order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-brand text-amarena-red pt-2 border-t border-stone-200/50">
            <span>Total</span>
            <span>R$ {order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2 py-4 border-y border-dashed border-stone-200">
             <QrCode className="text-stone-300" size={32} />
             <div className="text-left">
                <p className="text-[9px] font-black text-stone-400 uppercase leading-none">Status Autêntico</p>
                <p className="text-xs font-bold text-green-500 uppercase">{
                  order.status === 'pending' ? 'Pedido Recebido' :
                  order.status === 'preparing' ? 'Em Preparação' :
                  order.status === 'shipped' ? 'Saiu para Entrega' :
                  'Pedido Concluído'
                }</p>
             </div>
          </div>
          
          <Button onClick={onDismiss} variant="orange" className="w-full rounded-2xl py-4 mt-2">
            Fechar Ticket
          </Button>
        </div>
      </div>
      
      {/* Decorative Bottom Circles */}
      <div className="absolute -bottom-4 left-0 right-0 flex justify-around px-4">
         {Array.from({ length: 8 }).map((_, i) => (
           <div key={i} className="w-8 h-8 bg-stone-900 rounded-full shadow-inner opacity-10" />
         ))}
      </div>
    </div>
  </motion.div>
);

const OrderHistory = ({ clientPhone, setCurrentScreen, setCart, setViewingTicket }: { clientPhone: string, setCurrentScreen: (screen: any) => void, setCart: (items: { name: string; price: number; quantity: number }[]) => void, setViewingTicket: (order: Order | null) => void }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (clientPhone) {
      setLoadingHistory(true); // eslint-disable-line react-hooks/set-state-in-effect
      axios.get(`/api/orders/user/${clientPhone}`)
        .then(res => setOrders(res.data))
        .catch(err => console.error("Error fetching history:", err))
        .finally(() => setLoadingHistory(false));
    }
  }, [clientPhone]);

  const repeatOrder = (order: Order) => {
    setCart(order.items);
    setCurrentScreen('checkout');
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending': return 20;
      case 'preparing': return 50;
      case 'shipped': return 85;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Recebido';
      case 'preparing': return 'Preparando';
      case 'shipped': return 'Em Trânsito';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="bg-amarena-orange p-6 text-white flex items-center gap-4 sticky top-0 z-50 shadow-lg">
        <button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-white/20 rounded-xl transition-all">
          <ChevronLeft />
        </button>
        <h2 className="text-xl font-bold tracking-tight">Meus Pedidos</h2>
      </div>
      
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {loadingHistory ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-amarena-orange border-t-transparent rounded-full animate-spin" />
            <p className="text-stone-400 font-medium">Buscando seus pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] shadow-sm border border-stone-100 p-10">
            <History size={48} className="mx-auto text-stone-200 mb-4" />
            <p className="text-stone-500 font-bold">Você ainda não fez nenhum pedido.</p>
            <p className="text-stone-300 text-sm mt-2">Que tal pedir um sorvete agora?</p>
            <Button onClick={() => setCurrentScreen('home')} className="mt-6 w-full" variant="orange">
               Ver Cardápio
            </Button>
          </div>
        ) : (
          orders.map(order => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={order.id} 
              className="bg-white rounded-[32px] overflow-hidden shadow-premium border border-stone-100"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-stone-800 text-lg uppercase">Senha #{order.id.slice(-4).toUpperCase()}</p>
                      <span className="text-[10px] bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full font-bold">ID: {order.id.slice(-6)}</span>
                    </div>
                    <p className="text-xs text-stone-400 font-medium">{new Date(order.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-600' :
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                     {getStatusLabel(order.status)}
                  </div>
                </div>

                {/* Status Tracker */}
                {order.status !== 'cancelled' && (
                  <div className="mb-8">
                    <div className="flex justify-between mb-2 px-1">
                       <span className={`text-[9px] font-bold uppercase tracking-widest ${order.status === 'pending' || order.status === 'preparing' || order.status === 'shipped' || order.status === 'completed' ? 'text-amarena-green' : 'text-stone-300'}`}>Pedido</span>
                       <span className={`text-[9px] font-bold uppercase tracking-widest ${order.status === 'preparing' || order.status === 'shipped' || order.status === 'completed' ? 'text-amarena-green' : 'text-stone-300'}`}>Preparo</span>
                       <span className={`text-[9px] font-bold uppercase tracking-widest ${order.status === 'shipped' || order.status === 'completed' ? 'text-amarena-green' : 'text-stone-300'}`}>Entrega</span>
                       <span className={`text-[9px] font-bold uppercase tracking-widest ${order.status === 'completed' ? 'text-amarena-green' : 'text-stone-300'}`}>Fim</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden relative">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${getStatusProgress(order.status)}%` }}
                        className="h-full bg-amarena-green"
                       />
                       <div className="absolute top-0 left-0 w-full h-full flex justify-between px-0.5 items-center">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-2 h-2 rounded-full border-2 border-stone-100 ${getStatusProgress(order.status) >= (i * 33) ? 'bg-amarena-green' : 'bg-stone-300'}`} />
                          ))}
                       </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <p className="font-black text-amarena-red text-xl">R$ {order.total.toFixed(2)}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => repeatOrder(order)}
                      className="text-amarena-green font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 bg-amarena-green/5 px-4 py-2.5 rounded-full hover:bg-amarena-green/10 transition-all"
                    >
                      <RefreshCcw size={12} strokeWidth={3} /> Repetir
                    </button>
                    <button 
                      onClick={() => setViewingTicket(order)}
                      className="text-amarena-orange font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 bg-amarena-orange/5 px-4 py-2.5 rounded-full hover:bg-amarena-orange/10 transition-all"
                    >
                      Ver Detalhes <ChevronLeft className="rotate-180" size={12} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const Awning = () => (
  <div className="absolute bottom-0 left-0 right-0 flex translate-y-[50%] z-20 overflow-hidden pointer-events-none">
    {Array.from({ length: 15 }).map((_, i) => (
      <div 
        key={i} 
        className={`flex-1 h-8 rounded-b-full shadow-sm ${i % 2 === 0 ? 'bg-awning-mint' : 'bg-awning-cream'}`}
      />
    ))}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', loading = false, disabled = false }: { children: React.ReactNode, onClick?: () => void, variant?: string, className?: string, loading?: boolean, disabled?: boolean }) => {
  const variants: Record<string, string> = {
    primary: 'bg-amarena-red text-white hover:bg-amarena-red/90',
    secondary: 'bg-amarena-green text-white hover:bg-amarena-green/90',
    purple: 'bg-amarena-purple text-white hover:bg-amarena-purple/90',
    orange: 'bg-amarena-orange text-white hover:bg-amarena-orange/90',
    outline: 'border-2 border-stone-200 text-stone-600 hover:bg-stone-50',
    ghost: 'text-stone-400 hover:text-amarena-red transition-colors'
  };

  return (
    <button 
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-6 py-3 rounded-2xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${className} ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

// Ticket component for printing
const OrderTicket = ({ order }: { order: Order | null }) => {
  if (!order) return null;
  return (
    <div className="print-only p-8 text-black font-mono w-[80mm] mx-auto bg-white">
      <div className="text-center border-b border-black pb-4 mb-4">
        <h2 className="text-xl font-bold uppercase">Amarena Sorvetes</h2>
        <p className="text-xs uppercase">Passos - MG</p>
        <p className="text-xs mt-1">--------------------------------</p>
      </div>
      <div className="mb-4">
        <p className="text-sm font-bold uppercase">Pedido: #{order.id.slice(-6)}</p>
        <p className="text-xs uppercase">Data: {new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        {order.clientInfo && (
          <div className="mt-2 pt-2 border-t border-black">
             <p className="text-xs font-bold uppercase">{order.clientInfo.name}</p>
             <p className="text-xs uppercase">{order.clientInfo.address}</p>
             <p className="text-xs uppercase">Tel: {order.clientInfo.phone}</p>
          </div>
        )}
        <p className="text-xs mt-1">--------------------------------</p>
      </div>
      <div className="mb-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-xs items-start mb-1">
            <span className="flex-1 uppercase">{item.quantity}x {item.name}</span>
            <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-black pt-4">
        {order.deliveryFee && order.deliveryFee > 0 && (
          <div className="flex justify-between text-xs mb-2">
            <span className="uppercase">Taxa de Entrega</span>
            <span>R$ {order.deliveryFee.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm">
          <span className="uppercase">Total</span>
          <span>R$ {order.total.toFixed(2)}</span>
        </div>
        <p className="text-xs mt-1 uppercase">Pagamento: {order.paymentMethod}</p>
      </div>
      <div className="text-center mt-8 text-[10px] uppercase">
        <p>Obrigado pela preferência!</p>
        <p>Amarena Sorvetes</p>
      </div>
    </div>
  );
};

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center"
    >
      <div className="w-48 h-48 mb-8 relative">
        <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain animate-pulse" />
        <div className="absolute inset-0 bg-white/20 blur-xl animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
              className="w-3 h-3 bg-amarena-red rounded-full"
            />
          ))}
        </div>
        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-stone-300 mt-4">Amarena Premium</p>
      </div>
    </motion.div>
  </div>
);

// --- App ---

type AppSettings = {
  isStoreOpen?: boolean;
  acai?: Record<string, number>;
  milkshake?: Record<string, number>;
  potePersonalizado?: Record<string, number>;
  acaiAddons?: string[];
  milkshakeAddons?: string[];
  deliveryFee?: number;
  activePromotionTitle?: string;
  activePromotionBody?: string;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'sorvete' | 'picole' | 'potes' | 'acai' | 'promos' | 'milkshake' | 'potePersonalizado' | 'whatsapp' | 'admin' | 'checkout' | 'success' | 'history'>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [adminSection, setAdminSection] = useState<'dashboard' | 'products' | 'orders' | 'addons' | 'settings'>('dashboard');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(!!localStorage.getItem('amarena_admin_token'));
  
  // Promotion State
  const [promoTitle, setPromoTitle] = useState('');
  const [promoBody, setPromoBody] = useState('');
  
  // New States for UX
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  
  // Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // Checkout State
  const [cart, setCart] = useState<{ name: string, price: number, quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'delivery_payment' | null>('delivery_payment');
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    const registerToken = async () => {
        // Only ask if we haven't successfully registered or been denied in this session
        if (localStorage.getItem('push_registered') === 'true') return;
        
        try {
            const token = await getToken(messaging, { vapidKey: 'BM-X5aQ-p0Q-l0x9mS9E5S_e4B0jKx6kH-F-H9mS1Q8-D-H0r_hIu-X74K-iU9O-B3C5uQ8W8G7vL2n7Qy8' });
            if (token) {
                await axios.post('/api/push-token', { token });
                localStorage.setItem('push_registered', 'true');
            }
        } catch (error) {
            console.error('Error registering for push notifications:', error);
            // If the user denied, we store that we tried so we don't spam errors
            if ((error as any).code === 'messaging/permission-blocked') {
                localStorage.setItem('push_registered', 'denied');
            }
        }
    };
    
    // Small delay to let the app load first
    const timer = setTimeout(registerToken, 2000);
    return () => clearTimeout(timer);
  }, []);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [viewingTicket, setViewingTicket] = useState<Order | null>(null);

  // Milkshake State
  const [selectedMilkshakeSize, setSelectedMilkshakeSize] = useState<string | null>(null);
  const [milkshakeFlavorInput, setMilkshakeFlavorInput] = useState('');
  const [milkshakeAddons, setMilkshakeAddons] = useState<string[]>([]);
  const [milkshakeCategory, setMilkshakeCategory] = useState<'milkshake'>('milkshake');

  // Açaí selection state
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selections, setSelections] = useState<string[]>([]);
  
  // Pote Personalizado selection state
  const [selectedTubSize, setSelectedTubSize] = useState<string | null>(null);
  const [tubFlavors, setTubFlavors] = useState(['', '', '']);
  
  // Load initial data from localStorage
  const savedClientInfo = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('amarena_client_info') || '{}') : {};

  // Checkout detail state
  const [clientName, setClientName] = useState(savedClientInfo.name || '');
  const [clientPhone, setClientPhone] = useState(savedClientInfo.phone || '');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState(savedClientInfo.address || '');
  const [addressNumber, setAddressNumber] = useState(savedClientInfo.number || '');
  const [apartment, setApartment] = useState(savedClientInfo.apartment || '');
  const [neighborhood, setNeighborhood] = useState(savedClientInfo.neighborhood || '');

  const saveClientData = () => {
    const info = { name: clientName, phone: clientPhone, address, number: addressNumber, neighborhood, apartment };
    localStorage.setItem('amarena_client_info', JSON.stringify(info));
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2000);
  };

  const addToCart = (item: { name: string, price: number, quantity: number }) => {
    if (settings?.isStoreOpen === false) {
      alert("Desculpe, a loja está fechada no momento e não estamos aceitando pedidos.");
      return;
    }
    setCart(prev => [...prev, item]);
    showToast(`${item.name} adicionado!`);
  };

  // Admin Hold State
  const [adminHoldProgress, setAdminHoldProgress] = useState(0);
  const holdTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Product Management State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const productCategories = ['acai', 'sorvete', 'milkshake', 'picole', 'promos', 'potes', 'potePersonalizado', 'addon'] as const;

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleImageUpload = async (file: File) => {
    try {
      const resized = await resizeImage(file);
      setEditingProduct(prev => ({ ...prev, image: resized }));
    } catch (err) {
      console.error("Erro no processamento da imagem", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/admin/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('amarena_admin_token')}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!isMounted) return;
      try {
        const promises = [fetchProducts(), fetchSettings()];
        if (isAdminLoggedIn) {
          promises.push(fetchOrders());
        }
        await Promise.all(promises);
      } finally {
        setTimeout(() => setIsInitialLoading(false), 800); // Small delay for smooth transition
      }
    };
    load();

    // Auto-refresh data to keep the store front and admin panel synced
    const intervalId = setInterval(() => {
      fetchProducts();
      if (isAdminLoggedIn) fetchOrders();
    }, 30000); // Every 30 seconds

    return () => { 
      isMounted = false; 
      clearInterval(intervalId);
    };
  }, [isAdminLoggedIn]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post('/api/admin/login', { username: adminUser, password: adminPass });
      localStorage.setItem('amarena_admin_token', res.data.token);
      setIsAdminLoggedIn(true);
    } catch {
      alert("Credenciais incorretas!");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('amarena_admin_token');
    setIsAdminLoggedIn(false);
    setCurrentScreen('home');
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('amarena_admin_token');
      
      let response;
      if (editingProduct?.id) {
        response = await axios.put(`/api/products/${editingProduct.id}`, editingProduct, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.post('/api/products', editingProduct, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (response.status === 200 || response.status === 201) {
        setEditingProduct(null);
        fetchProducts();
        alert("Produto salvo com sucesso!");
      } else {
        throw new Error(`Erro do servidor: ${response.status} - ${JSON.stringify(response.data)}`);
      }
    } catch (err: unknown) {
      console.error("DEBUG ERR:", err);
      const errorMessage = (err instanceof Error) ? err.message : "Erro desconhecido ao salvar produto.";
      alert(`Erro detalhado: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Deseja realmente excluir este produto?")) return;
    try {
      const token = localStorage.getItem('amarena_admin_token');
      await axios.delete(`/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir produto.");
    }
  };

  const startAdminHold = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setAdminHoldProgress(0);
    const startTime = Date.now();
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 2000) * 100, 100);
      setAdminHoldProgress(progress);
      if (progress >= 100) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        setCurrentScreen('admin');
        setAdminHoldProgress(0);
      }
    }, 50);
  };

  const cancelAdminHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setAdminHoldProgress(0);
  };

  const handlePrint = (order: Order) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
      // After print, user often wants to refresh or move back to orders
      setPrintOrder(null);
    }, 100);
  };

  const menuItems = [
    { id: 'sorvete', label: 'Sorvetes', icon: <IceCream />, color: 'bg-amarena-red' },
    { id: 'acai', label: 'Açaí', icon: <Soup />, color: 'bg-amarena-purple' },
    { id: 'picole', label: 'Picolés', icon: <IceCream />, color: 'bg-amarena-red' },
    { id: 'promos', label: 'Promoções', icon: <ShoppingBag />, color: 'bg-amarena-red' },
    { id: 'milkshake', label: 'Milkshake', icon: <CupSoda />, color: 'bg-amarena-red' },
    { id: 'potePersonalizado', label: 'Monte seu Pote', icon: <IceCream />, color: 'bg-amarena-orange' },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle />, color: 'bg-amarena-green' },
    { id: 'history', label: 'Meus Pedidos', icon: <History />, color: 'bg-stone-500' },
  ];

  const acaiSizes = [
    { id: '300', label: '300ml', price: settings?.acai?.['300'] || 25.90, rules: '3 verdes + 1 laranjas', icon: <CupSoda /> },
    { id: '400', label: '400ml', price: settings?.acai?.['400'] || 30.90, rules: '3 verdes + 1 laranjas', icon: <CupSoda /> },
    { id: '500', label: '500ml', price: settings?.acai?.['500'] || 36.90, rules: '3 verdes + 1 laranjas', icon: <CupSoda /> },
    { id: '700', label: '700ml', price: settings?.acai?.['700'] || 44.90, rules: '3 verdes + 1 laranjas', icon: <CupSoda /> },
    { id: 'M500', label: 'M (500ml)', price: settings?.acai?.['M500'] || 39.90, rules: '3 verdes + 2 laranjas', icon: <Soup /> },
    { id: 'G800', label: 'G (800ml)', price: settings?.acai?.['G800'] || 48.90, rules: '3 verdes + 2 laranjas', icon: <Soup /> },
  ];

  const acaiOptions = {
    laranjas: ['Bolacha oreo triturada', 'Bombom Ouro branco', 'Bombom Sonho de valsa', 'Castanha de caju', 'Cereja', 'Disquete', 'Gotas de Chocolate'],
    verdes: ['Banana', 'Beijinho cremoso', 'Cobertura de Chocolate', 'Cobertura de Morango', 'Granola', 'Leite condensado', 'Leite em Pó']
  };

  const paidAddons = [
    { name: 'Creme de ninho', price: 4.50 },
    { name: 'Creme de Pistache', price: 5.00 },
    { name: 'Kinder Bueno', price: 5.50 },
    { name: 'Creme de Valsa', price: 5.50 },
    { name: 'Kit Kat', price: 5.00 },
    { name: 'Nutella', price: 5.00 }
  ];

  const milkshakeSizes = [
    { id: '300', label: '300ml', price: settings?.milkshake?.['300'] || 20.90 },
    { id: '400', label: '400ml', price: settings?.milkshake?.['400'] || 25.90 },
    { id: '500', label: '500ml', price: settings?.milkshake?.['500'] || 28.90 },
  ];

  /* REMOVED: sundaeSizes */

  const milkshakeOptions = [
    { name: 'Chantilly', price: 2.00 },
    { name: 'Creme de Ninho', price: 4.00 },
    { name: 'Nutella', price: 5.00 },
    { name: 'Ovomaltine', price: 3.50 }
  ];

  const tubSizes = [
    { id: '1L', label: '1 Litro', price: settings?.potePersonalizado?.['1L'] || 40.0 },
    { id: '1.5L', label: '1,5 Litros', price: settings?.potePersonalizado?.['1.5L'] || 50.0 },
    { id: '2L', label: '2 Litros', price: settings?.potePersonalizado?.['2L'] || 60.60 },
  ];

  const renderScreen = () => {
    switch(currentScreen) {
      case 'home':
        return (
          <div className="flex flex-col items-center no-print bg-[#fff9f5] min-h-screen">
      {/* Header */}
      <header className="relative w-full bg-amarena-dark-red pt-8 pb-12 px-6 shadow-[0_10px_30px_rgba(150,18,29,0.3)] mb-8 overflow-visible border-b border-white/5">
        <div className="flex items-start max-w-lg mx-auto relative z-30 w-full">
          <Logo />
          <button 
            onClick={() => setCurrentScreen('checkout')}
            className="absolute bottom-1 right-0 bg-amarena-dark-red p-4 rounded-full text-white hover:bg-amarena-red transition-all shadow-[0_8px_20px_rgba(0,0,0,0.3)] border-[3px] border-white/20 active:scale-90 z-50 flex items-center justify-center transform hover:-translate-y-1"
          >
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amarena-green text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-amarena-dark-red shadow-lg animate-bounce">
                {cart.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Luxury Gloss Reflection Overlay */}
        <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-tr from-white/5 via-white/10 to-transparent pointer-events-none opacity-40" />
        
        {/* Toldo/Awning effect */}
        <Awning />
      </header>
            
            {/* Store Closed Notice */}
            {settings?.isStoreOpen === false && (
              <div className="w-full px-5 max-w-lg mb-6 sticky top-2 z-[60]">
                 <div className="bg-amarena-red text-white p-4 rounded-2xl shadow-xl flex items-center gap-4 animate-bounce">
                    <div className="bg-white/20 p-2 rounded-xl">
                       <X size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase tracking-widest leading-none mb-1">Loja Fechada</p>
                      <p className="text-[10px] opacity-90">Não estamos aceitando pedidos no momento.</p>
                    </div>
                 </div>
              </div>
            )}

            {/* Search Bar - Home */}
            <div className="w-full px-5 max-w-lg mb-6 sticky top-2 z-40">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-amarena-red transition-colors">
                  <Sliders size={18} />
                </div>
                <input 
                  type="text"
                  placeholder="O que você deseja hoje?"
                  className="w-full pl-12 pr-12 py-4 bg-white rounded-2xl shadow-sm border border-stone-100 focus:outline-none focus:ring-2 focus:ring-amarena-red/20 focus:border-amarena-red transition-all font-medium text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-amarena-red transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            
            {searchQuery.trim() ? (
              <div className="w-full px-5 max-w-lg space-y-4 mb-10 overflow-visible">
                <div className="flex justify-between items-center px-2 mb-2">
                  <h3 className="text-xl font-display font-bold text-stone-800 uppercase tracking-tight">Resultados</h3>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{products.filter(p => (p.active ?? true) && p.name.toLowerCase().includes(searchQuery.toLowerCase())).length} itens</span>
                </div>
                {products
                  .filter(p => (p.active ?? true) && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase())))
                  .length === 0 ? (
                    <div className="py-12 text-center text-stone-400 bg-white rounded-[32px] border border-dashed border-stone-200">
                      <Package size={40} className="mx-auto mb-3 opacity-10" />
                      Nenhum produto encontrado.
                    </div>
                  ) : (
                    products
                      .filter(p => (p.active ?? true) && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase())))
                      .map(product => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={product.id} 
                          className="bg-white p-4 rounded-[32px] shadow-sm border border-stone-100 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-stone-50 rounded-[20px] overflow-hidden flex-shrink-0 border border-stone-50">
                                {product.image ? (
                                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-200">
                                    <IceCream size={24} />
                                  </div>
                                )}
                            </div>
                            <div>
                              <h4 className="font-bold text-stone-800 text-sm leading-tight">{product.name}</h4>
                              <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest mt-1 opacity-60">{product.category}</p>
                              <p className="text-amarena-red font-black text-sm mt-1">R$ {product.price.toFixed(2)}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => addToCart({ name: product.name, price: product.price, quantity: 1 })}
                            className="bg-amarena-red p-4 rounded-2xl text-white shadow-xl shadow-amarena-red/10 active:scale-90 transition-all"
                          >
                            <ShoppingCart size={18} />
                          </button>
                        </motion.div>
                      ))
                  )
                }
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 w-full px-5 max-w-lg">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (item.id === 'whatsapp') {
                        window.open('https://wa.me/553599999999', '_blank'); // Replace with real number
                        return;
                      }
                      setCurrentScreen(item.id as typeof currentScreen);
                    }}
                    className={`${item.color} p-3 rounded-[20px] shadow-md flex flex-col items-center justify-center gap-1 text-white transition-shadow hover:shadow-lg`}
                  >
                    <div className="bg-white/20 p-2 rounded-xl">
                      {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                    </div>
                    <span className="font-bold text-[11px] tracking-tight text-center">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            )}

            <div className="w-full px-5 pb-10 mt-10 space-y-3">
               <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4">
                  <div className="bg-red-100 p-3 rounded-2xl text-amarena-red"><MapPin size={20} /></div>
                  <div>
                    <p className="font-bold text-stone-800 text-sm">Rua Dois de Novembro</p>
                    <p className="text-xs text-stone-400">Centro - Passos, MG</p>
                  </div>
               </div>
               <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-2xl text-amarena-green"><MessageCircle size={20} /></div>
                  <p className="font-bold text-stone-800 text-sm">Fale conosco no WhatsApp</p>
               </div>
               <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4">
                  <div className="bg-pink-100 p-3 rounded-2xl text-pink-500"><Instagram size={20} /></div>
                  <p className="font-bold text-stone-800 text-sm">@amarena.passos</p>
               </div>
            </div>

            <div className="relative mt-10 mb-10 overflow-hidden rounded-full">
              {adminHoldProgress > 0 && (
                <div 
                  className="absolute inset-0 bg-amarena-red/10 transition-all duration-75"
                  style={{ width: `${adminHoldProgress}%` }}
                />
              )}
              <button 
                onMouseDown={startAdminHold}
                onMouseUp={cancelAdminHold}
                onMouseLeave={cancelAdminHold}
                onTouchStart={startAdminHold}
                onTouchEnd={cancelAdminHold}
                className="relative px-4 py-2 text-stone-200 text-[10px] font-medium uppercase tracking-[0.2em] transition-colors active:text-amarena-red/40 select-none"
              >
                © 2025 Amarena Sorvetes • Passos/MG
              </button>
            </div>
          </div>
        );

      case 'sorvete':
      case 'picole':
      case 'promos':
        return (
          <div className="px-6 py-10 animate-in fade-in slide-in-from-right-4 no-print">
            <div className="flex justify-between items-center mb-10">
              <button 
                onClick={() => setCurrentScreen('home')} 
                className="p-4 bg-white/50 backdrop-blur-md rounded-2xl text-stone-800 shadow-sm transition-all active:scale-95 border border-stone-100"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-3xl font-display font-bold text-stone-800 uppercase tracking-tight">
                {menuItems.find(m => m.id === currentScreen)?.label}
              </h2>
              <div className="relative">
                <button 
                  onClick={() => setCurrentScreen('checkout')}
                  className="bg-amarena-red p-4 rounded-2xl text-white shadow-lg shadow-amarena-red/20 active:scale-95 transition-all"
                >
                  <ShoppingCart size={24} />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-amarena-green text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {settings?.isStoreOpen === false && (
              <div className="bg-amarena-red text-white p-4 rounded-2xl shadow-lg mb-8 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                <X size={20} className="flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm uppercase tracking-widest leading-none mb-1">Loja Fechada</p>
                  <p className="text-[10px] opacity-90">Não estamos aceitando pedidos no momento.</p>
                </div>
              </div>
            )}

              <div className="grid grid-cols-1 gap-5">
                {settings?.activePromotionTitle && (
                  <div className="bg-amarena-orange text-white p-6 rounded-[32px] shadow-lg mb-4">
                    <h3 className="font-bold text-lg mb-1">{settings.activePromotionTitle}</h3>
                    <p className="text-sm opacity-90">{settings.activePromotionBody}</p>
                  </div>
                )}
                {products.filter(p => {
                  const matchesCategory = currentScreen === 'sorvete' 
                    ? (p.category === 'sorvete' || p.category === 'potes')
                    : (p.category === currentScreen);
                  const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesCategory && (p.active ?? true) && matchesSearch;
                }).length === 0 ? (
                  <div className="py-20 text-center text-stone-400 bg-white/50 rounded-[40px] border border-dashed border-stone-200">
                    <Package size={48} className="mx-auto mb-4 opacity-10" />
                    Nenhum produto encontrado.
                  </div>
                ) : (
                  products.filter(p => {
                    const matchesCategory = currentScreen === 'sorvete' 
                      ? (p.category === 'sorvete' || p.category === 'potes')
                      : (p.category === currentScreen);
                    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesCategory && (p.active ?? true) && matchesSearch;
                  }).map(product => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={product.id} 
                    className="bg-white p-5 rounded-[32px] shadow-sm border border-stone-100 flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-stone-50 rounded-[24px] overflow-hidden flex-shrink-0 border border-stone-50">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            alt={product.name} 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-200">
                            <IceCream size={32} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 text-lg leading-tight mb-1">{product.name}</h3>
                        <p className="text-amarena-red font-black text-xl">R$ {product.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button 
                      variant="primary" 
                      className="w-14 h-14 !p-0 rounded-2xl shadow-xl shadow-amarena-red/20 active:scale-90"
                      onClick={() => {
                        addToCart({ name: product.name, price: product.price, quantity: 1 });
                      }}
                    >
                      <ShoppingCart size={24} />
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        );

      case 'milkshake': {
        const currentSizes = milkshakeSizes;
        const currentOptions = milkshakeOptions.map(o => ({ name: o.name, price: o.price }));

        return (
          <div className="animate-in fade-in duration-500 no-print flex flex-col min-h-screen bg-white">
            <div className="bg-amarena-purple p-6 text-white flex flex-col gap-4 sticky top-0 z-50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setCurrentScreen('home'); setSelectedMilkshakeSize(null); setMilkshakeFlavorInput(''); setMilkshakeAddons([]); }}
                  className="hover:bg-white/20 p-2 rounded-xl"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold tracking-tight text-center flex-1 pr-10">
                  {milkshakeCategory === 'milkshake' ? 'Milkshake' : 'Sundae'}
                </h2>
              </div>
              
              {settings?.isStoreOpen === false && (
                <div className="bg-white/10 text-white p-3 rounded-xl border border-white/20 flex items-center gap-3">
                  <X size={16} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Loja Fechada no momento</p>
                </div>
              )}

              {/* Category Toggle */}
              <div className="flex bg-white/20 p-1 rounded-2xl">
                 <button 
                  onClick={() => { setMilkshakeCategory('milkshake'); setSelectedMilkshakeSize(null); setMilkshakeAddons([]); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-white text-amarena-purple shadow-sm`}
                 >
                   Milkshake
                 </button>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-8 pb-20">
              {/* Size Selection */}
              <div>
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 pl-1">Escolha o Tamanho</h3>
                <div className="grid grid-cols-2 gap-4">
                  {currentSizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedMilkshakeSize(size.id)}
                      className={`bg-white border-2 p-6 rounded-3xl text-center shadow-sm transition-all flex flex-col items-center gap-2 ${
                        selectedMilkshakeSize === size.id ? 'border-amarena-purple shadow-md' : 'border-stone-100'
                      }`}
                    >
                      <div className={`p-4 rounded-2xl ${selectedMilkshakeSize === size.id ? 'bg-amarena-purple text-white' : 'bg-stone-50 text-amarena-purple'}`}>
                        {milkshakeCategory === 'milkshake' ? <CupSoda size={32} /> : <Soup size={32} />}
                      </div>
                      <p className="font-bold text-xl text-stone-700">{size.label}</p>
                      <p className={`font-black text-lg ${selectedMilkshakeSize === size.id ? 'text-amarena-purple' : 'text-amarena-purple/60'}`}>
                        R$ {size.price.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flavor Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-500 uppercase tracking-widest pl-1">Digite o Sabor</label>
                <input 
                  type="text"
                  placeholder="Ex: Chocolate, Morango..."
                  value={milkshakeFlavorInput}
                  onChange={(e) => setMilkshakeFlavorInput(e.target.value)}
                  className="w-full p-5 rounded-2xl bg-stone-50 border-2 border-stone-100 focus:border-amarena-purple outline-none font-bold text-stone-800 transition-all"
                />
              </div>

              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-stone-800">Adicionais (opcional)</h3>
                  <p className="text-xs text-stone-400 font-medium">Valores cobrados a parte</p>
                </div>
                
                <div className="space-y-3">
                  {currentOptions.map(opt => {
                    const isSelected = milkshakeAddons.includes(opt.name);
                    return (
                      <button
                        key={opt.name}
                        onClick={() => setMilkshakeAddons(prev => isSelected ? prev.filter(i => i !== opt.name) : [...prev, opt.name])}
                        className={`w-full p-5 rounded-2xl border-2 flex justify-between items-center transition-all bg-white ${
                          isSelected ? 'border-amarena-purple shadow-sm' : 'border-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-amarena-purple bg-amarena-purple' : 'border-stone-200'}`}>
                              {isSelected && <Check size={14} className="text-white" />}
                           </div>
                           <span className="font-bold text-stone-700">{opt.name}</span>
                        </div>
                        {opt.price > 0 && <span className="font-black text-amarena-purple">+ R$ {opt.price.toFixed(2)}</span>}
                        {opt.price === 0 && <span className="text-[10px] font-bold text-amarena-green uppercase tracking-widest">Grátis</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="p-6 bg-white border-t border-stone-100 z-50">
              {(() => {
                const sizePrice = currentSizes.find(s => s.id === selectedMilkshakeSize)?.price || 0;
                const addonsPrice = milkshakeAddons.reduce((acc, name) => acc + (currentOptions.find(o => o.name === name)?.price || 0), 0);
                const total = sizePrice > 0 ? sizePrice + addonsPrice : 0;
                const canFinish = selectedMilkshakeSize && milkshakeFlavorInput.trim().length > 0;

                return (
                  <>
                    <div className="flex justify-between items-center mb-4">
                       <p className="text-xl font-bold text-amarena-purple">Total:</p>
                       <p className="text-3xl font-display font-black text-amarena-purple">R$ {total.toFixed(2)}</p>
                    </div>

                    <Button 
                      variant={canFinish ? "purple" : "outline"}
                      disabled={!canFinish}
                      className={`w-full py-5 text-lg uppercase font-black tracking-widest ${!canFinish ? 'opacity-30' : 'shadow-xl shadow-amarena-purple/20'}`}
                      onClick={() => {
                        const sizeObj = currentSizes.find(s => s.id === selectedMilkshakeSize);
                        setCart(prev => [...prev, {
                          name: `${milkshakeCategory === 'milkshake' ? 'Milkshake' : 'Sundae'} ${sizeObj?.label} - ${milkshakeFlavorInput} ${milkshakeAddons.length > 0 ? `(+ ${milkshakeAddons.join(', ')})` : ''}`,
                          price: total,
                          quantity: 1
                        }]);
                        setCurrentScreen('home');
                        setSelectedMilkshakeSize(null);
                        setMilkshakeFlavorInput('');
                        setMilkshakeAddons([]);
                      }}
                    >
                      <ShoppingCart size={20} className="mr-2" />
                      Adicionar ao Carrinho
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        );
      }

      case 'potePersonalizado': {
        return (
          <div className="animate-in fade-in duration-500 no-print flex flex-col min-h-screen bg-white">
            <div className="bg-amarena-orange p-6 text-white flex items-center gap-4 sticky top-0 z-50">
              <button 
                onClick={() => { setCurrentScreen('home'); setSelectedTubSize(null); setTubFlavors(['', '', '']); }}
                className="hover:bg-white/20 p-2 rounded-xl"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold tracking-tight">Monte seu Pote</h2>
            </div>
            
            <div className="flex-1 p-6 space-y-8 pb-20">
              {/* Size Selection */}
              <div>
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 pl-1">Escolha o Tamanho</h3>
                <div className="grid grid-cols-3 gap-2">
                  {tubSizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedTubSize(size.id)}
                      className={`bg-white border-2 p-4 rounded-3xl text-center shadow-sm transition-all flex flex-col items-center gap-2 ${
                        selectedTubSize === size.id ? 'border-amarena-orange shadow-md' : 'border-stone-100'
                      }`}
                    >
                      <p className="font-bold text-sm text-stone-700">{size.label}</p>
                      <p className={`font-black text-sm ${selectedTubSize === size.id ? 'text-amarena-orange' : 'text-amarena-orange/60'}`}>
                        R$ {size.price.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flavor Inputs */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-stone-500 uppercase tracking-widest pl-1">Escolha até 3 sabores</label>
                {tubFlavors.map((flavor, idx) => (
                  <input 
                    key={idx}
                    type="text"
                    placeholder={`Sabor ${idx + 1}`}
                    value={flavor}
                    onChange={(e) => {
                      const newFlavors = [...tubFlavors];
                      newFlavors[idx] = e.target.value;
                      setTubFlavors(newFlavors);
                    }}
                    className="w-full p-5 rounded-2xl bg-stone-50 border border-stone-100 focus:border-amarena-orange outline-none font-bold text-stone-800 transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Total / Add to Cart */}
            <div className="p-6 bg-white border-t border-stone-100 z-50">
              {(() => {
                const total = tubSizes.find(s => s.id === selectedTubSize)?.price || 0;
                const flavoredCount = tubFlavors.filter(f => f.trim().length > 0).length;
                const canFinish = selectedTubSize && flavoredCount > 0;

                return (
                  <>
                    <div className="flex justify-between items-center mb-4">
                       <p className="text-xl font-bold text-amarena-orange">Total:</p>
                       <p className="text-3xl font-display font-black text-amarena-orange">R$ {total.toFixed(2)}</p>
                    </div>

                    <Button 
                      variant={canFinish ? "orange" : "outline"}
                      disabled={!canFinish}
                      className={`w-full py-5 text-lg uppercase font-black tracking-widest ${!canFinish ? 'opacity-30' : 'shadow-xl shadow-amarena-orange/20'}`}
                      onClick={() => {
                        const sizeObj = tubSizes.find(s => s.id === selectedTubSize);
                        addToCart({
                          name: `Pote Personalizado ${sizeObj?.label} (${tubFlavors.filter(f => f.trim().length > 0).join(', ')})`,
                          price: total,
                          quantity: 1
                        });
                        setCurrentScreen('home');
                        setSelectedTubSize(null);
                        setTubFlavors(['', '', '']);
                      }}
                    >
                      <ShoppingCart size={20} className="mr-2" />
                      Adicionar ao Carrinho
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        );
      }

      case 'acai':
        return (
          <div className="animate-in fade-in duration-500 no-print flex flex-col min-h-screen bg-white">
            <div className="bg-amarena-purple p-6 text-white flex items-center gap-4 sticky top-0 z-50">
              <button 
                onClick={() => { setCurrentScreen('home'); setSelectedSize(null); }}
                className="hover:bg-white/20 p-2 rounded-xl"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold tracking-tight">Açaí</h2>
            </div>
            
            {settings?.isStoreOpen === false && (
              <div className="mx-6 mt-6 bg-amarena-red/5 p-4 rounded-2xl border border-amarena-red/10 flex items-center gap-4">
                <div className="bg-amarena-red text-white p-2 rounded-xl">
                  <X size={16} />
                </div>
                <div>
                  <p className="text-amarena-red font-bold text-xs uppercase tracking-widest leading-none mb-1">Loja Fechada</p>
                  <p className="text-[9px] text-stone-500 font-medium">Não estamos aceitando pedidos agora.</p>
                </div>
              </div>
            )}

            {!selectedSize ? (
              <div className="px-6 py-8 space-y-6 flex-1">
                <h3 className="text-lg font-bold text-stone-800">Escolha o Tamanho</h3>
                <div className="grid grid-cols-2 gap-4">
                  {acaiSizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className="bg-cream border-2 border-stone-50 p-6 rounded-[32px] text-center shadow-sm hover:border-amarena-purple transition-all active:scale-95 flex flex-col items-center gap-2"
                    >
                      <div className="text-amarena-purple mb-1">
                        {React.cloneElement(size.icon as React.ReactElement, { size: 32 })}
                      </div>
                      <p className="font-bold text-xl text-stone-700">{size.label}</p>
                      <p className="text-amarena-purple font-black text-lg">R$ {size.price.toFixed(2)}</p>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wide">{size.rules}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                 <div className="bg-amarena-purple/5 p-4 flex justify-between items-center border-b border-amarena-purple/10">
                    <div className="flex items-center gap-3">
                      <div className="bg-amarena-purple text-white p-2 rounded-xl">
                        {React.cloneElement(acaiSizes.find(s => s.id === selectedSize)?.icon as React.ReactElement, { size: 20 })}
                      </div>
                      <div>
                        <h4 className="font-bold text-amarena-purple">Açaí {acaiSizes.find(s => s.id === selectedSize)?.label}</h4>
                        <p className="text-[10px] text-amarena-purple/60 font-bold uppercase tracking-widest">
                           {acaiSizes.find(s => s.id === selectedSize)?.rules}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedSize(null); setSelections([]); }} className="text-amarena-purple text-xs font-bold uppercase hover:underline">Trocar</button>
                 </div>

                 <div className="flex-1 p-4 space-y-8 pb-20">
                    {(() => {
                      const maxVerdes = 3;
                      const maxLaranjas = (selectedSize === 'M500' || selectedSize === 'G800') ? 2 : 1;
                      
                      const countLaranjas = selections.filter(s => acaiOptions.laranjas.includes(s)).length;
                      const countVerdes = selections.filter(s => acaiOptions.verdes.includes(s)).length;

                      return (
                        <div className="grid grid-cols-2 gap-4">
                           {/* Laranjas */}
                           <div>
                              <div className="bg-amarena-orange text-white p-3 rounded-t-2xl text-center text-[10px] font-black tracking-widest uppercase">
                                 Laranjas ({countLaranjas}/{maxLaranjas})
                              </div>
                              <div className="bg-amarena-orange/5 p-2 rounded-b-2xl space-y-2 border-x border-b border-amarena-orange/20">
                                 {acaiOptions.laranjas.map(opt => {
                                   const isSelected = selections.includes(opt);
                                   return (
                                     <button 
                                       key={opt}
                                       onClick={() => {
                                         if (!isSelected && countLaranjas >= maxLaranjas) return;
                                         setSelections(prev => isSelected ? prev.filter(i => i !== opt) : [...prev, opt]);
                                       }}
                                       className={`w-full p-3 rounded-xl text-[10px] font-bold text-left transition-all ${
                                         isSelected ? 'bg-amarena-orange text-white shadow-md' : 'bg-white text-amarena-orange border border-amarena-orange/30'
                                       } ${!isSelected && countLaranjas >= maxLaranjas ? 'opacity-30' : ''}`}
                                     >
                                       {opt}
                                     </button>
                                   );
                                 })}
                              </div>
                           </div>

                           {/* Verdes */}
                           <div>
                              <div className="bg-amarena-green text-white p-3 rounded-t-2xl text-center text-[10px] font-black tracking-widest uppercase">
                                 Verdes ({countVerdes}/{maxVerdes})
                              </div>
                              <div className="bg-amarena-green/5 p-2 rounded-b-2xl space-y-2 border-x border-b border-amarena-green/20">
                                 {acaiOptions.verdes.map(opt => {
                                   const isSelected = selections.includes(opt);
                                   return (
                                     <button 
                                       key={opt}
                                       onClick={() => {
                                         if (!isSelected && countVerdes >= maxVerdes) return;
                                         setSelections(prev => isSelected ? prev.filter(i => i !== opt) : [...prev, opt]);
                                       }}
                                       className={`w-full p-3 rounded-xl text-[10px] font-bold text-left transition-all ${
                                         isSelected ? 'bg-amarena-green text-white shadow-md' : 'bg-white text-amarena-green border border-amarena-green/30'
                                       } ${!isSelected && countVerdes >= maxVerdes ? 'opacity-30' : ''}`}
                                     >
                                       {opt}
                                     </button>
                                   );
                                 })}
                              </div>
                           </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-4">
                       <h4 className="font-bold text-stone-800 border-l-4 border-amarena-purple pl-3 text-sm">Adicionais à Parte (Pagos)</h4>
                       <div className="grid grid-cols-2 gap-3">
                          {paidAddons.map(addon => {
                            const isSelected = selections.includes(addon.name);
                            return (
                              <button 
                                 key={addon.name}
                                 onClick={() => setSelections(prev => isSelected ? prev.filter(i => i !== addon.name) : [...prev, addon.name])}
                                 className={`p-4 rounded-2xl border transition-all text-left ${
                                   isSelected ? 'bg-amarena-orange text-white border-amarena-orange shadow-md' : 'bg-orange-50/50 border-amarena-orange/20 text-amarena-dark'
                                 }`}
                              >
                                 <p className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-stone-800'}`}>{addon.name}</p>
                                 <p className={`font-black text-sm ${isSelected ? 'text-white/80' : 'text-amarena-orange'}`}>+R$ {addon.price.toFixed(2)}</p>
                              </button>
                            );
                          })}
                       </div>
                    </div>
                 </div>

                 {/* Selections Tracking */}
                 {(() => {
                   const sizeObj = acaiSizes.find(s => s.id === selectedSize);
                   const maxVerdes = 3;
                   const maxLaranjas = (selectedSize === 'M500' || selectedSize === 'G800') ? 2 : 1;
                   
                   const countLaranjas = selections.filter(s => acaiOptions.laranjas.includes(s)).length;
                   const countVerdes = selections.filter(s => acaiOptions.verdes.includes(s)).length;
                   
                   const selectedPaidAddons = selections.filter(s => paidAddons.find(a => a.name === s));
                   const paidTotal = selectedPaidAddons.reduce((acc, name) => acc + (paidAddons.find(a => a.name === name)?.price || 0), 0);
                   const finalPrice = (sizeObj?.price || 0) + paidTotal;

                   const faltamVerdes = Math.max(0, maxVerdes - countVerdes);
                   const faltamLaranjas = Math.max(0, maxLaranjas - countLaranjas);
                   const canFinish = faltamVerdes === 0 && faltamLaranjas === 0;

                   return (
                     <div className="p-6 bg-white border-t border-stone-100 z-50">
                        <div className="flex justify-between items-center mb-4">
                           <p className="font-bold text-stone-400 uppercase tracking-widest text-xs">Total:</p>
                           <p className="text-3xl font-display font-black text-amarena-purple">R$ {finalPrice.toFixed(2)}</p>
                        </div>
                        
                        {!canFinish ? (
                          <div className="bg-orange-50 p-3 rounded-2xl text-center mb-4 border border-amarena-orange/10">
                             <p className="text-[10px] font-bold text-amarena-orange uppercase tracking-widest">
                                {faltamVerdes > 0 && `Faltam ${faltamVerdes} opções VERDES `}
                                {faltamLaranjas > 0 && `${faltamVerdes > 0 ? '• ' : ''}Faltam ${faltamLaranjas} opções LARANJAS`}
                             </p>
                          </div>
                        ) : (
                          <div className="bg-green-50 p-3 rounded-2xl text-center mb-4 border border-amarena-green/10">
                             <p className="text-[10px] font-bold text-amarena-green uppercase tracking-widest">
                                Seleção Completa!
                             </p>
                          </div>
                        )}

                        <Button 
                          variant={canFinish ? "purple" : "outline"}
                          disabled={!canFinish}
                          className={`w-full py-5 text-lg uppercase font-black tracking-widest ${!canFinish ? 'opacity-50 cursor-not-allowed' : 'shadow-xl shadow-amarena-purple/20'}`}
                          onClick={() => {
                            if (sizeObj) {
                              addToCart({
                                name: `Açaí ${sizeObj.label} (${selections.join(', ')})`,
                                price: finalPrice,
                                quantity: 1
                              });
                              setCurrentScreen('home'); // Go back to home after adding
                            }
                          }}
                        >
                          Adicionar ao Carrinho
                        </Button>
                     </div>
                   );
                 })()}
              </div>
            )}
          </div>
        );

      case 'admin':
        if (!isAdminLoggedIn) {
          return (
            <div className="px-6 py-20 min-h-screen flex flex-col items-center justify-center animate-in fade-in zoom-in-95 no-print relative overflow-hidden">
              {/* Login Background Accents */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -ml-32 -mb-32" />

              <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-[48px] shadow-premium border border-amarena/5 relative z-10">
                <div className="flex flex-col items-center mb-8">
                  <Logo />
                  <div className="mt-8 bg-primary/5 px-4 py-2 rounded-full">
                    <p className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                       <Settings size={14} className="animate-spin-slow" /> Painel Interno
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-amarena/40 uppercase tracking-widest ml-1">Acesso do Operador</label>
                    <input 
                      type="text" 
                      value={adminUser}
                      onChange={e => setAdminUser(e.target.value)}
                      className="w-full p-5 bg-stone-50 border-none rounded-3xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-amarena" 
                      placeholder="Usuário"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-amarena/40 uppercase tracking-widest ml-1">Chave de Segurança</label>
                    <input 
                      type="password" 
                      value={adminPass}
                      onChange={e => setAdminPass(e.target.value)}
                      className="w-full p-5 bg-stone-50 border-none rounded-3xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-amarena" 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button loading={loading} className="w-full py-5 rounded-3xl text-lg shadow-xl shadow-amarena-red/20 mt-6">
                    Autenticar Operação
                  </Button>
                </form>
                
                <button 
                  onClick={() => setCurrentScreen('home')}
                  className="w-full text-center mt-8 text-amarena/30 text-xs font-bold uppercase tracking-widest hover:text-amarena-red transition-colors"
                >
                  Voltar ao Terminal Inicial
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="h-screen flex flex-col md:flex-row bg-stone-50 no-print">
            {/* Sidebar for PC optimization */}
            <aside className="w-full md:w-64 bg-white border-r border-stone-100 p-6 flex-shrink-0">
              <div className="flex items-center gap-3 mb-10">
                <div className="bg-amarena-red p-2 rounded-xl text-white">
                  <IceCream size={24} />
                </div>
                <h1 className="font-display font-bold text-xl text-stone-800">Amarena Admin</h1>
              </div>

              <nav className="space-y-2">
                <button 
                  onClick={() => setAdminSection('dashboard')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${adminSection === 'dashboard' ? 'bg-amarena-red text-white shadow-md shadow-amarena-red/20' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                  <LayoutDashboard size={20} />
                  <span className="font-semibold">Início</span>
                </button>
                <button 
                  onClick={() => setAdminSection('orders')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${adminSection === 'orders' ? 'bg-amarena-red text-white shadow-md shadow-amarena-red/20' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                  <History size={20} />
                  <span className="font-semibold">Pedidos</span>
                </button>
                <button 
                  onClick={() => setAdminSection('products')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${adminSection === 'products' ? 'bg-amarena-red text-white shadow-md shadow-amarena-red/20' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                  <Package size={20} />
                  <span className="font-semibold">Produtos</span>
                </button>
                <button 
                  onClick={() => setAdminSection('addons')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${adminSection === 'addons' ? 'bg-amarena-red text-white shadow-md shadow-amarena-red/20' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                  <Settings size={20} />
                  <span className="font-semibold">Adicionais</span>
                </button>
                <button 
                  onClick={() => setAdminSection('settings')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${adminSection === 'settings' ? 'bg-amarena-red text-white shadow-md shadow-amarena-red/20' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                  <Sliders size={20} />
                  <span className="font-semibold">Configurações</span>
                </button>
              </nav>

              <div className="mt-auto pt-10">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-semibold"
                >
                  <LogOut size={20} />
                  Sair
                </button>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-10">
              <div className="max-w-4xl mx-auto">
                {adminSection === 'dashboard' && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                       <h2 className="text-3xl font-display font-bold text-stone-800 uppercase tracking-tight">Painel de Controle</h2>
                       <button 
                         onClick={async () => {
                           const nextStatus = !(settings?.isStoreOpen ?? true);
                           const newSettings = { ...settings, isStoreOpen: nextStatus };
                           setSettings(newSettings);
                           try {
                             await axios.put('/api/settings', newSettings, {
                               headers: { Authorization: `Bearer ${localStorage.getItem('amarena_admin_token')}` }
                             });
                           } catch (err) {
                             console.error("Error updating store status:", err);
                             alert("Erro ao atualizar status da loja");
                           }
                         }}
                         className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all ${
                           (settings?.isStoreOpen ?? true) 
                             ? 'bg-amarena-green/10 text-amarena-green border-2 border-amarena-green/20 hover:bg-amarena-green/20' 
                             : 'bg-amarena-red/10 text-amarena-red border-2 border-amarena-red/20 hover:bg-amarena-red/20'
                         }`}
                       >
                         <div className={`w-3 h-3 rounded-full animate-pulse ${ (settings?.isStoreOpen ?? true) ? 'bg-amarena-green' : 'bg-amarena-red' }`} />
                         { (settings?.isStoreOpen ?? true) ? 'LOJA ABERTA' : 'LOJA FECHADA' }
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <button 
                        onClick={() => setAdminSection('orders')}
                        className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100 flex flex-col items-center text-center hover:shadow-lg hover:border-amarena-red/10 transition-all group"
                      >
                        <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-1 group-hover:text-amarena-red transition-colors">Pedidos Pendentes</p>
                        <p className="text-5xl font-display font-bold text-amarena-red">{orders.filter(o => o.status === 'pending').length}</p>
                      </button>
                      <button 
                        onClick={() => setAdminSection('products')}
                        className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100 flex flex-col items-center text-center hover:shadow-lg hover:border-amarena-green/10 transition-all group"
                      >
                        <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-1 group-hover:text-amarena-green transition-colors">Total de Produtos</p>
                        <p className="text-5xl font-display font-bold text-amarena-green">{products.length}</p>
                      </button>
                      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100 flex flex-col items-center text-center">
                        <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-1">Total Hoje</p>
                        <p className="text-5xl font-display font-bold text-amarena-purple">R$ {orders.filter(o => new Date(o.createdAt).getDate() === new Date().getDate()).reduce((acc, curr) => acc + curr.total, 0).toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {adminSection === 'orders' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-3xl font-display font-bold text-stone-800 uppercase tracking-tight">Gerenciar Pedidos</h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');
                            if (activeOrders.length === 0) return alert("Não há pedidos ativos para limpar.");
                            if (!confirm("Isso irá marcar TODOS os pedidos pendentes como 'Cancelados' para limpar sua tela. Deseja continuar?")) return;
                            
                            setLoading(true);
                            try {
                              for (const order of activeOrders) {
                                await axios.patch(`/api/admin/orders/${order.id}`, { status: 'cancelled' }, {
                                  headers: { Authorization: `Bearer ${localStorage.getItem('amarena_admin_token')}` }
                                });
                              }
                              fetchOrders();
                              alert("Pedidos limpos com sucesso!");
                            } catch (err) {
                              alert("Erro ao limpar alguns pedidos.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-bold text-xs"
                        >
                          <Trash2 size={16} /> Limpar Pedidos de Teste
                        </button>
                        <button onClick={fetchOrders} className="p-2 bg-stone-100 rounded-xl text-stone-500 hover:bg-stone-200 transition-colors">
                          <History size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {orders.filter(o => o.status !== 'cancelled').length === 0 ? (
                        <div className="py-20 text-center text-stone-400 bg-white rounded-3xl border border-dashed border-stone-200">Nenhum pedido recebido ainda.</div>
                      ) : (
                        orders.filter(o => o.status !== 'cancelled').map(order => (
                          <div key={order.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                  order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                                  order.status === 'preparing' ? 'bg-blue-100 text-blue-600' :
                                  order.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                                  'bg-green-100 text-green-600'
                                }`}>
                                  {order.status === 'pending' ? 'Pendente' : 
                                   order.status === 'preparing' ? 'Preparando' :
                                   order.status === 'shipped' ? 'Em Entrega' :
                                   'Finalizado'}
                                </span>
                                <span className="text-stone-400 text-xs font-medium">#{order.id.slice(-6)} • {new Date(order.createdAt).toLocaleTimeString('pt-BR')}</span>
                              </div>
                              <div className="space-y-1">
                                {order.items.map((it, idx) => (
                                  <p key={idx} className="text-stone-800 font-bold text-lg">{it.quantity}x {it.name}</p>
                                ))}
                              </div>
                              <p className="text-stone-400 text-sm mt-1 uppercase tracking-wider font-semibold">
                                {order.paymentMethod === 'card' ? 'Cartão Online' :
                                 order.paymentMethod === 'pix' || order.paymentMethod === 'PIX Manual' ? 'PIX' :
                                 order.paymentMethod === 'delivery_payment' ? 'Pagar na Entrega' :
                                 order.paymentMethod} • R$ {order.total.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {/* Flow: Pending -> Preparing -> Shipped -> Completed */}
                              {order.status === 'pending' && (
                                <button 
                                  onClick={async () => {
                                    await axios.patch(`/api/admin/orders/${order.id}`, { status: 'preparing' }, {
                                      headers: { Authorization: `Bearer ${localStorage.getItem('amarena_admin_token')}` }
                                    });
                                    fetchOrders();
                                  }}
                                  className="flex-1 md:flex-none p-4 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-all font-bold flex items-center justify-center gap-2"
                                >
                                  <Package size={20} /> Preparar
                                </button>
                              )}
                              {order.status === 'preparing' && (
                                <button 
                                  onClick={async () => {
                                    await axios.patch(`/api/admin/orders/${order.id}`, { status: 'shipped' }, {
                                      headers: { Authorization: `Bearer ${localStorage.getItem('amarena_admin_token')}` }
                                    });
                                    fetchOrders();
                                  }}
                                  className="flex-1 md:flex-none p-4 bg-purple-500 text-white rounded-2xl hover:bg-purple-600 transition-all font-bold flex items-center justify-center gap-2"
                                >
                                  <MapPin size={20} /> Saiu para Entrega
                                </button>
                              )}
                              {(order.status === 'shipped' || order.status === 'preparing') && (
                                <button 
                                  onClick={async () => {
                                    await axios.patch(`/api/admin/orders/${order.id}`, { status: 'completed' }, {
                                      headers: { Authorization: `Bearer ${localStorage.getItem('amarena_admin_token')}` }
                                    });
                                    fetchOrders();
                                  }}
                                  className="flex-1 md:flex-none p-4 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all font-bold flex items-center justify-center gap-2"
                                >
                                  <Check size={20} /> Entregue
                                </button>
                              )}
                              {(order.status === 'pending' || order.status === 'preparing') && (
                                <button 
                                  onClick={async () => {
                                    if (!confirm("Deseja realmente cancelar este pedido?")) return;
                                    await axios.patch(`/api/admin/orders/${order.id}`, { status: 'cancelled' }, {
                                      headers: { Authorization: `Bearer ${localStorage.getItem('amarena_admin_token')}` }
                                    });
                                    fetchOrders();
                                  }}
                                  className="flex-1 md:flex-none p-4 bg-red-100 text-red-600 rounded-2xl hover:bg-red-200 transition-all font-bold flex items-center justify-center gap-2"
                                >
                                  <X size={20} /> Cancelar
                                </button>
                              )}
                              <button 
                                onClick={() => handlePrint(order)}
                                className="flex-1 md:flex-none p-4 bg-stone-800 text-white rounded-2xl hover:bg-black transition-all font-bold flex items-center justify-center gap-2"
                              >
                                <Printer size={20} /> Imprimir
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {adminSection === 'addons' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-display font-bold text-stone-800 uppercase tracking-tight">Gerenciar Adicionais</h2>
                        <button 
                          onClick={() => { setEditingProduct({ category: 'addon' }); setAdminSection('products'); }}
                          className="flex items-center gap-2 px-6 py-3 bg-amarena-red text-white rounded-2xl shadow-lg shadow-amarena-red/20 font-bold text-sm hover:translate-y-[-2px] transition-all"
                        >
                          <Plus size={18} /> Novo Adicional
                        </button>
                     </div>
                     <div className="bg-white rounded-[32px] border border-stone-100 overflow-x-auto shadow-sm">
                        <table className="w-full text-left">
                           <thead className="bg-stone-50 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                              <tr>
                                 <th className="px-6 py-4">Adicional</th>
                                 <th className="px-6 py-4">Preço</th>
                                 <th className="px-6 py-4 text-right whitespace-nowrap">Ações</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-stone-50">
                              {products.filter(p => p.category === 'addon').map(p => (
                                 <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-stone-800">{p.name}</td>
                                    <td className="px-6 py-4 font-bold text-stone-700">R$ {p.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap flex gap-2 justify-end">
                                       <button 
                                         onClick={() => { setEditingProduct(p); setAdminSection('products'); }}
                                         className="p-2 bg-stone-100 text-stone-500 hover:text-amarena-green rounded-lg transition-all"
                                       >
                                          <Edit size={16} />
                                       </button>
                                       <button 
                                         onClick={() => { /* Implement delete function */ }}
                                         className="p-2 bg-stone-100 text-stone-500 hover:text-red-500 rounded-lg transition-all"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
                )}
                {adminSection === 'settings' && (
                   <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <h2 className="text-3xl font-display font-bold text-stone-800 mb-8 uppercase tracking-tight">Configurações</h2>
                      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100">
                        <div className="mb-8 p-6 bg-stone-50 rounded-[24px] border border-stone-100 flex items-center justify-between">
                          <div>
                             <h3 className="font-bold text-stone-800">Status da Loja</h3>
                             <p className="text-xs text-stone-500">Controle se a loja está aceitando novos pedidos</p>
                          </div>
                          <button 
                            onClick={() => setSettings({...settings, isStoreOpen: !(settings?.isStoreOpen ?? true)})}
                            className={`px-6 py-2 rounded-full font-black text-[10px] tracking-widest transition-all ${
                              (settings?.isStoreOpen ?? true) ? 'bg-amarena-green text-white shadow-lg shadow-amarena-green/20' : 'bg-stone-200 text-stone-400'
                            }`}
                          >
                             {(settings?.isStoreOpen ?? true) ? 'ABERTA' : 'FECHADA'}
                          </button>
                        </div>

                        <h3 className="font-bold text-stone-800 mb-6">Preços de Açaí</h3>
                        <div className="grid grid-cols-2 gap-4">
                           {['300', '400', '500', '700', 'M500', 'G800'].map(id => (
                             <div key={id} className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{id}ml / {id === 'M500' ? 'M' : id === 'G800' ? 'G' : ''}</label>
                                <input 
                                  type="number"
                                  className="w-full p-3 bg-stone-50 rounded-xl outline-none"
                                  value={settings?.acai?.[id] || ''}
                                  onChange={e => setSettings({...settings, acai: {...settings?.acai, [id]: parseFloat(e.target.value)}})}
                                />
                             </div>
                           ))}
                        </div>

                        <h3 className="font-bold text-stone-800 mb-6 mt-8">Preços de Milkshake</h3>
                         <div className="grid grid-cols-2 gap-4">
                           {['300', '400', '500'].map(id => (
                             <div key={id} className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{id}ml</label>
                                <input 
                                  type="number"
                                  className="w-full p-3 bg-stone-50 rounded-xl outline-none"
                                  value={settings?.milkshake?.[id] || ''}
                                  onChange={e => setSettings({...settings, milkshake: {...settings?.milkshake, [id]: parseFloat(e.target.value)}})}
                                />
                             </div>
                           ))}
                        </div>

                        <h3 className="font-bold text-stone-800 mb-6 mt-8">Preços de Pote Personalizado</h3>
                         <div className="grid grid-cols-3 gap-4">
                           {['1L', '1.5L', '2L'].map(id => (
                             <div key={id} className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{id}</label>
                                <input 
                                  type="number"
                                  className="w-full p-3 bg-stone-50 rounded-xl outline-none"
                                  value={settings?.potePersonalizado?.[id] || ''}
                                  onChange={e => setSettings({...settings, potePersonalizado: {...settings?.potePersonalizado, [id]: parseFloat(e.target.value)}})}
                                />
                             </div>
                           ))}
                        </div>

                        {/* Promoção Persistente */}
                        <h3 className="font-bold text-stone-800 mb-6 mt-8 border-t pt-8">Promoção Persistente</h3>
                        <div className="space-y-4 mb-8">
                           <input type="text" placeholder="Título da Promoção (ex: Semana do Sorvete)" value={settings?.activePromotionTitle || ''} onChange={e => setSettings({...settings, activePromotionTitle: e.target.value})} className="w-full p-3 bg-stone-50 rounded-xl outline-none" />
                           <textarea placeholder="Descrição da Promoção" value={settings?.activePromotionBody || ''} onChange={e => setSettings({...settings, activePromotionBody: e.target.value})} className="w-full p-3 bg-stone-50 rounded-xl outline-none" />
                        </div>

                        {/* Notificações (Ephemeral) */}
                        <h3 className="font-bold text-stone-800 mb-6 mt-8 border-t pt-8">Enviar Push Agora</h3>
                        <div className="space-y-4">
                           <input type="text" placeholder="Título" value={promoTitle} onChange={e => setPromoTitle(e.target.value)} className="w-full p-3 bg-stone-50 rounded-xl outline-none" />
                           <textarea placeholder="Mensagem" value={promoBody} onChange={e => setPromoBody(e.target.value)} className="w-full p-3 bg-stone-50 rounded-xl outline-none" />
                           <button 
                             onClick={async () => {
                               try {
                                 await axios.post('/api/admin/push-notification', { title: promoTitle, body: promoBody }, {
                                    headers: { Authorization: `Bearer ${localStorage.getItem('amarena_admin_token')}` }
                                 });
                                 alert('Notificação enviada!');
                                 setPromoTitle('');
                                 setPromoBody('');
                               } catch (error) {
                                 console.error("Notificação error:", error);
                                 alert('Erro ao enviar notificação.');
                               }
                             }}
                             className="w-full p-4 bg-amarena-red text-white rounded-2xl font-bold hover:bg-amarena-dark-red transition-all"
                           >
                            Enviar Promoção para Usuários
                           </button>
                        </div>
                                                <h3 className="font-bold text-stone-800 mb-6 mt-8">Taxa de Entrega</h3>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Valor da Taxa de Entrega</label>
                          <input 
                            type="number"
                            className="w-full p-3 bg-stone-50 rounded-xl outline-none"
                            value={settings?.deliveryFee || ''}
                            onChange={e => setSettings({...settings, deliveryFee: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-6">
                          {(['acai', 'milkshake'] as const).map(cat => (
                            <div key={cat}>
                              <label className="text-xs font-bold text-stone-500 uppercase">{cat === 'acai' ? 'Açaí' : 'Milkshake'}</label>
                              <div className="mt-2 text-sm text-stone-600 bg-stone-50 p-4 rounded-xl">
                                Selecione os adicionais:
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {products.filter(p => p.category === 'addon').map(addon => (
                                    <label key={addon.id} className="flex items-center gap-2">
                                      <input 
                                        type="checkbox"
                                        checked={(settings?.[`${cat}Addons` as keyof AppSettings] as string[] || []).includes(addon.name)}
                                        onChange={e => {
                                          const prev = (settings?.[`${cat}Addons` as keyof AppSettings] as string[] || []);
                                          const next = e.target.checked 
                                            ? [...prev, addon.name]
                                            : prev.filter(n => n !== addon.name);
                                          setSettings({...settings, [`${cat}Addons`]: next});
                                        }}
                                      />
                                      {addon.name}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={async () => {
                            const token = localStorage.getItem('amarena_admin_token');
                            try {
                              await axios.put('/api/settings', settings, { 
                                headers: { Authorization: `Bearer ${token}` } 
                              });
                              alert('Configurações salvas com sucesso!');
                              await fetchSettings(); // Refresh UI
                            } catch (error) {
                              console.error("Save error:", error);
                              alert('Erro ao salvar configurações.');
                            }
                          }}
                          className="mt-6 w-full p-4 bg-amarena-red text-white font-bold rounded-xl"
                        >
                          Salvar Configurações
                        </button>
                      </div>
                   </div>
                )}
                {adminSection === 'products' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <h2 className="text-3xl font-display font-bold text-stone-800 mb-8 uppercase tracking-tight">Gerenciar Produtos</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                       <div className="lg:col-span-4 bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 h-fit sticky top-6">
                          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                             {editingProduct?.id ? <Edit size={20} className="text-amarena-red" /> : <Package size={20} className="text-amarena-red" />}
                             {editingProduct?.id ? 'Editar Produto' : 'Novo Produto'}
                          </h3>
                          <form onSubmit={handleProductSubmit} className="space-y-4">
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                               <input 
                                 type="text" 
                                 placeholder="Ex: Sorvete de Morango" 
                                 value={editingProduct?.name || ''}
                                 onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                                 className="w-full p-4 bg-stone-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                                 required
                               />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Categoria</label>
                                  <select 
                                    value={editingProduct?.category || 'sorvete'}
                                    onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value as Product['category'] }))}
                                    className="w-full p-4 bg-stone-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none"
                                  >
                                    {productCategories.map(cat => (
                                      <option key={cat} value={cat}>
                                        {cat === 'acai' ? 'Açaí' : 
                                         cat === 'picole' ? 'Picolé' :
                                         cat === 'promos' ? 'Promoções' :
                                         cat === 'sorvete' ? 'Sorvete' :
                                         cat === 'potes' ? 'Potes' :
                                         cat === 'milkshake' ? 'Milkshake' :
                                         cat === 'potePersonalizado' ? 'Monte seu Pote' :
                                         cat === 'addon' ? 'Adicional' :
                                         cat.charAt(0).toUpperCase() + cat.slice(1)}
                                      </option>
                                    ))}
                                  </select>
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="0,00" 
                                    value={editingProduct?.price || ''}
                                    onChange={e => setEditingProduct(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                                    className="w-full p-4 bg-stone-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                                    required
                                  />
                               </div>
                            </div>

                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Imagem do Produto (Upload ou Drag & Drop)</label>
                               <div 
                                 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                 onDragLeave={() => setIsDragging(false)}
                                 onDrop={(e) => {
                                   e.preventDefault();
                                   setIsDragging(false);
                                   const file = e.dataTransfer.files[0];
                                   if (file && file.type.startsWith('image/')) handleImageUpload(file);
                                 }}
                                 className={`relative group w-full h-40 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden ${isDragging ? 'border-amarena-red bg-amarena-red/5' : 'border-stone-200 bg-stone-50 hover:bg-stone-100'}`}
                               >
                                 {editingProduct?.image ? (
                                   <>
                                     <img src={editingProduct.image} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-20 transition-opacity" referrerPolicy="no-referrer" />
                                     <div className="relative flex flex-col items-center gap-1 z-10">
                                        <Check size={24} className="text-amarena-red bg-white rounded-full p-1" />
                                        <p className="text-[10px] font-bold text-stone-600">Imagem Carregada</p>
                                        <p className="text-[9px] text-stone-400">Solte outra para trocar</p>
                                     </div>
                                   </>
                                 ) : (
                                   <>
                                     <div className="p-3 bg-white rounded-xl shadow-sm text-stone-400 group-hover:text-amarena-red transition-colors">
                                        <Upload size={20} />
                                     </div>
                                     <div className="text-center">
                                       <p className="text-[10px] font-bold text-stone-500">Arraste a imagem aqui</p>
                                       <p className="text-[9px] text-stone-400">ou clique para selecionar</p>
                                     </div>
                                   </>
                                 )}
                                 <input 
                                   type="file" 
                                   accept="image/*"
                                   className="absolute inset-0 opacity-0 cursor-pointer"
                                   onChange={(e) => {
                                     const file = e.target.files?.[0];
                                     if (file) handleImageUpload(file);
                                   }}
                                 />
                               </div>
                             </div>

                             <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl">
                               <button
                                 type="button"
                                 onClick={() => setEditingProduct(prev => ({ ...prev, active: !(prev?.active ?? true) }))}
                                 className={`w-12 h-6 rounded-full transition-all relative ${ (editingProduct?.active ?? true) ? 'bg-amarena-green' : 'bg-stone-300' }`}
                               >
                                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${ (editingProduct?.active ?? true) ? 'left-7' : 'left-1' }`} />
                               </button>
                               <span className="text-xs font-bold text-stone-600 uppercase">
                                 { (editingProduct?.active ?? true) ? 'Produto Disponível' : 'Produto de Temporada (Oculto)' }
                               </span>
                             </div>

                             <div className="pt-2 flex gap-3">
                               <Button 
                                 loading={loading} 
                                 className="flex-1 h-14 shadow-[0_10px_25px_-5px_rgba(150,18,29,0.4)] text-base font-black tracking-wide"
                               >
                                  {editingProduct?.id ? 'Salvar Alterações' : 'Criar Produto'}
                               </Button>
                               {editingProduct && (
                                 <button 
                                   type="button"
                                   onClick={() => setEditingProduct(null)}
                                   className="w-14 h-14 bg-stone-100 text-stone-400 rounded-2xl hover:bg-stone-200 transition-all flex items-center justify-center shadow-inner"
                                 >
                                   <X size={24} />
                                 </button>
                               )}
                            </div>
                          </form>
                       </div>

                       <div className="lg:col-span-8 space-y-4">
                          <div className="bg-white rounded-[32px] border border-stone-100 overflow-x-auto shadow-sm">
                             <table className="w-full text-left">
                                <thead className="bg-stone-50 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                   <tr>
                                      <th className="px-6 py-4">Produto</th>
                                      <th className="px-6 py-4">Categoria</th>
                                      <th className="px-6 py-4">Preço</th>
                                       <th className="px-6 py-4">Status</th>
                                      <th className="px-4 py-4 text-right whitespace-nowrap">Ações</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                   {products.length === 0 ? (
                                     <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-stone-400 italic">Nenhum produto cadastrado.</td>
                                     </tr>
                                   ) : (
                                     products.map(p => (
                                       <tr key={p.id} className="hover:bg-stone-50/50 transition-colors group">
                                          <td className="px-6 py-4">
                                             <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                                                   {p.image ? (
                                                     <img src={p.image} className="w-full h-full object-cover" alt={p.name} referrerPolicy="no-referrer" />
                                                   ) : (
                                                     <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                        <Package size={16} />
                                                     </div>
                                                   )}
                                                </div>
                                                <span className="font-bold text-stone-800">{p.name}</span>
                                             </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                               {p.category === 'acai' ? 'Açaí' : 
                                                p.category === 'picole' ? 'Picolé' :
                                                p.category === 'promos' ? 'Promoções' :
                                                p.category === 'sorvete' ? 'Sorvete' :
                                                p.category === 'potes' ? 'Potes' :
                                                p.category === 'milkshake' ? 'Milkshake' :
                                                p.category === 'potePersonalizado' ? 'Monte seu Pote' :
                                                p.category === 'addon' ? 'Adicional' :
                                                (p.category?.charAt(0).toUpperCase() + p.category?.slice(1)) || 'Sem categoria'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 font-bold text-stone-700">R$ {p.price.toFixed(2)}</td>
                                           <td className="px-6 py-4">
                                              <button 
                                                onClick={() => {
                                                  const activeState = !(p.active ?? true);
                                                  const token = localStorage.getItem('amarena_admin_token');
                                                  axios.put(`/api/products/${p.id}`, { ...p, active: activeState }, {
                                                    headers: { Authorization: `Bearer ${token}` }
                                                  }).then(fetchProducts);
                                                }}
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm ${ (p.active ?? true) ? 'bg-green-50 text-amarena-green border-green-100 hover:bg-green-100' : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100' }`}
                                              >
                                                { (p.active ?? true) ? 'Disponível' : 'Indisponível' }
                                              </button>
                                           </td>
                                          <td className="px-4 py-4 text-right whitespace-nowrap">
                                             <div className="flex justify-end gap-1 transition-opacity">
                                                <button 
                                                  onClick={() => setEditingProduct(p)}
                                                  className="w-8 h-8 flex items-center justify-center bg-stone-100 text-stone-500 hover:text-amarena-green hover:bg-green-50 rounded-lg transition-all shadow-sm"
                                                >
                                                  <Edit size={14} />
                                                </button>
                                                <button 
                                                  onClick={() => handleDeleteProduct(p.id)}
                                                  className="w-8 h-8 flex items-center justify-center bg-stone-100 text-stone-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shadow-sm"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                             </div>
                                          </td>
                                       </tr>
                                     ))
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
               </div>
            </main>
          </div>
        );

      case 'checkout': {
        const deliveryFee = deliveryType === 'delivery' ? (settings?.deliveryFee || 0) : 0;
        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0) + deliveryFee;
        const pixKey = "45.057.040/0001-08";

        const finishOrder = async (method: string) => {
          if (!clientName || !clientPhone) {
            showToast("Preencha seu Nome e Telefone!");
            return;
          }

          if (deliveryType === 'delivery' && (!address || !addressNumber || !neighborhood)) {
            showToast("Preencha o endereço completo!");
            return;
          }
          
          saveClientData();

          try {
            setLoading(true);
            if (settings?.isStoreOpen === false) {
              alert("Desculpe, a loja fechou enquanto você montava seu pedido.");
              setLoading(false);
              return;
            }

            const res = await axios.post('/api/orders', {
              items: cart,
              total: total,
              deliveryFee: deliveryFee,
              paymentMethod: method,
              clientInfo: {
                name: clientName,
                phone: clientPhone,
                deliveryType,
                address: deliveryType === 'delivery' ? `${address}, ${addressNumber} ${apartment ? `- Apt ${apartment}` : ''} ${neighborhood ? `- Bairro ${neighborhood}` : ''}` : 'Retirada na Sorveteria'
              }
            });
            setLastOrderId(res.data.id);
            setCurrentScreen('success');
            setCart([]);
            setSelectedSize(null);
            setSelections([]);
          } catch (err: any) {
            console.error("Order error:", err);
            showToast("Erro ao enviar pedido. Tente novamente.");
          } finally {
            setLoading(false);
          }
        };

        const handleCardPayment = async () => {
          try {
            setLoading(true);
            const res = await axios.post('/api/payment/create-preference', {
              items: cart,
              external_reference: `Order_${Date.now()}`
            });
            window.location.href = res.data.init_point;
          } catch {
            console.error("Payment error");
            alert("Erro ao iniciar pagamento.");
          } finally {
            setLoading(false);
          }
        };

        return (
          <div className="px-6 py-10 animate-in fade-in zoom-in-95 duration-500 no-print">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-display font-bold text-stone-800 uppercase tracking-tight">Finalizar</h2>
              <button onClick={() => setCurrentScreen('home')} className="p-2 bg-stone-100 rounded-xl">
                <X />
              </button>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-stone-100 mb-8">
              <h3 className="font-bold text-stone-800 mb-4">Seus dados</h3>
              <div className="space-y-3">
                 <input type="text" placeholder="Nome Completo" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 outline-none" />
                 <input type="tel" placeholder="Telefone (Obrigatório)" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 outline-none" required />
                 
                 <div className="flex gap-2">
                    <button onClick={() => setDeliveryType('delivery')} className={`flex-1 p-3 rounded-2xl font-bold ${deliveryType === 'delivery' ? 'bg-primary text-white' : 'bg-stone-100 text-stone-500'}`}>Entrega</button>
                    <button onClick={() => setDeliveryType('pickup')} className={`flex-1 p-3 rounded-2xl font-bold ${deliveryType === 'pickup' ? 'bg-primary text-white' : 'bg-stone-100 text-stone-500'}`}>Retirar</button>
                 </div>
                 
                 {deliveryType === 'delivery' && (
                    <>
                       <input type="text" placeholder="Rua / Avenida" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 outline-none" />
                       <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Número" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 outline-none" />
                          <input type="text" placeholder="Apto (Opcional)" value={apartment} onChange={e => setApartment(e.target.value)} className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 outline-none" />
                       </div>
                       <input type="text" placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 outline-none" />
                    </>
                 )}
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-stone-100 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <ShoppingBag className="text-primary" />
                <h3 className="font-bold text-stone-800">Seu Pedido</h3>
              </div>
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0 grow">
                  <span className="text-stone-600 font-medium">{item.name}</span>
                  <span className="font-bold text-stone-800 whitespace-nowrap ml-4">R$ {item.price.toFixed(2)}</span>
                </div>
              ))}
              {deliveryFee > 0 && (
                <div className="flex justify-between items-center py-2">
                 <span className="text-stone-500 font-medium">Taxa de Entrega</span>
                 <span className="font-bold text-stone-800">R$ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="mt-4 pt-4 border-t-2 border-stone-100 flex justify-between items-center">
                 <span className="text-stone-400 font-bold uppercase text-[10px] tracking-widest">Total Geral</span>
                 <span className="text-2xl font-display font-bold text-primary">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <h3 className="text-xl font-display font-bold text-stone-800 mb-4 px-2">Pagamento</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-stone-100 bg-white'}`}
              >
                <div className={`p-3 rounded-2xl ${paymentMethod === 'card' ? 'bg-primary text-white' : 'bg-stone-100 text-stone-400'}`}>
                  <CreditCard size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-800">Cartão de Crédito</p>
                  <p className="text-xs text-stone-400">Via Mercado Pago</p>
                </div>
              </button>

              <button 
                onClick={() => setPaymentMethod('pix')}
                className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'pix' ? 'border-secondary bg-secondary/5' : 'border-stone-100 bg-white'}`}
              >
                <div className={`p-3 rounded-2xl ${paymentMethod === 'pix' ? 'bg-secondary text-white' : 'bg-stone-100 text-stone-400'}`}>
                  <QrCode size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-800">PIX (Chave CNPJ)</p>
                  <p className="text-xs text-stone-400">Transferência Manual</p>
                </div>
              </button>

              <button 
                onClick={() => setPaymentMethod('delivery_payment')}
                className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'delivery_payment' ? 'border-amarena-green bg-amarena-green/5' : 'border-stone-100 bg-white'}`}
              >
                <div className={`p-3 rounded-2xl ${paymentMethod === 'delivery_payment' ? 'bg-amarena-green text-white' : 'bg-stone-100 text-stone-400'}`}>
                  <CreditCard size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-800">Pagar na Entrega</p>
                  <p className="text-xs text-stone-400">Cartão ou Dinheiro</p>
                </div>
              </button>
            </div>

            <div className="mt-8">
              {paymentMethod === 'pix' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 border-2 border-secondary/20 mb-6 text-center">
                  <p className="text-stone-500 text-sm mb-3 font-medium">Chave PIX CNPJ:</p>
                  <div className="bg-stone-50 p-4 rounded-2xl font-mono font-bold text-stone-800 break-all mb-4 flex justify-between items-center text-xs">
                    {pixKey}
                    <button onClick={() => { navigator.clipboard.writeText(pixKey); setPixCopied(true); setTimeout(()=>setPixCopied(false), 2000); }} className="text-secondary p-2">
                      {pixCopied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-tight">Ao clicar em confirmar, seu pedido será enviado para nossa cozinha. O pagamento deve ser feito agora.</p>
                  <Button variant="secondary" loading={loading} className="w-full mt-6 py-4 text-lg" onClick={() => finishOrder('PIX Manual')}>Enviar Pedido via PIX</Button>
                </motion.div>
              )}

              {paymentMethod === 'card' && (
                <Button loading={loading} onClick={handleCardPayment} className="w-full py-5 text-xl shadow-xl shadow-primary/20">Finalizar com Cartão</Button>
              )}

              {paymentMethod === 'delivery_payment' && (
                <Button variant="secondary" loading={loading} className="w-full py-5 text-xl shadow-xl shadow-amarena-green/20 bg-amarena-green" onClick={() => finishOrder('Pagar na Entrega')}>Finalizar Pedido</Button>
              )}
            </div>
          </div>
        );
      }

      case 'success':
        return (
          <div className="px-6 py-20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500 no-print">
            <div className="bg-green-100 p-8 rounded-full mb-8 text-green-500 shadow-inner">
              <Check size={64} />
            </div>
            <h2 className="text-3xl font-display font-bold text-stone-800 mb-4 uppercase tracking-tight">Pedido Recebido!</h2>
            <p className="text-stone-500 mb-10 max-w-xs">Nossa equipe já está preparando sua delícia. Você será notificado quando estiver pronto.</p>
            <div className="bg-stone-100 px-6 py-3 rounded-2xl mb-8">
               <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Senha do Pedido</p>
               <p className="text-2xl font-display font-bold text-stone-800">{String(lastOrderId).slice(-4).toUpperCase()}</p>
            </div>
            <Button onClick={() => setCurrentScreen('home')} variant="outline" className="w-full">Voltar ao Menu</Button>
          </div>
        );

      case 'history': {
        return <OrderHistory clientPhone={clientPhone} setCurrentScreen={setCurrentScreen} setCart={setCart} setViewingTicket={setViewingTicket} />;
      }

      default:
        return (
          <div className="px-6 py-20 flex flex-col items-center justify-center text-center no-print">
            <div className="bg-stone-100 p-8 rounded-full mb-6 text-stone-400">
              <IceCream size={48} />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2 uppercase tracking-tight">Em Breve</h2>
            <p className="text-stone-500 mb-8">Esta seção está sendo preparada.</p>
            <Button onClick={() => setCurrentScreen('home')} variant="outline">Voltar</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center font-sans selection:bg-primary/20 selection:text-primary">
      <AnimatePresence>
        {isInitialLoading && <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.5 }}><SplashScreen /></motion.div>}
      </AnimatePresence>
      {/* Background Decorative Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden no-print">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary blur-3xl" />
        <div className="absolute top-1/2 -right-48 w-[600px] h-[600px] rounded-full bg-secondary blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-accent blur-3xl opacity-50" />
      </div>

      {/* Actual App Container */}
      <div className={`w-full ${currentScreen === 'admin' ? 'h-screen' : 'max-w-2xl min-h-screen relative'} bg-cream/50 backdrop-blur-[2px] shadow-2xl relative overflow-x-hidden transition-all duration-500 border-x border-amarena/5`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen + (isAdminLoggedIn ? adminSection : '')}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>

        {/* Footer Branding (Hidden in Admin and Print) */}
        {!['admin', 'checkout', 'success'].includes(currentScreen) && (
          <footer className="py-12 flex flex-col items-center opacity-30 select-none no-print">
            <div className="pointer-events-none flex flex-col items-center">
              <Logo />
              <div className="mt-4 flex gap-4 text-primary">
                <IceCream size={16} />
                <IceCream size={16} />
                <IceCream size={16} />
              </div>
            </div>
            <button 
              onClick={() => setCurrentScreen('admin')}
              className="mt-8 text-[10px] uppercase font-black tracking-widest text-stone-400 hover:text-amarena-red transition-colors cursor-pointer px-4 py-2"
            >
              Acesso Administrativo
            </button>
          </footer>
        )}
      </div>

      <AnimatePresence>
        {viewingTicket && (
          <ModernTicket order={viewingTicket} onDismiss={() => setViewingTicket(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.visible && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[40] bg-stone-900/90 backdrop-blur-md text-white px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-3 font-bold pointer-events-none border border-white/10"
          >
            <div className="bg-amarena-green p-1.5 rounded-lg text-white">
              <ShoppingCart size={18} />
            </div>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actual Hidden Ticket for Browser Printing */}
      <OrderTicket order={printOrder} />
    </div>
  );
}
