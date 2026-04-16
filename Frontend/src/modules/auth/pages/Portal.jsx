import React from "react"
import { motion } from "framer-motion"
import { useLocation, useNavigate } from "react-router-dom"
import { UtensilsCrossed, ShoppingBasket, Car, Bed, ShieldCheck, User } from "lucide-react"
import { hasLocalUserToken } from "../../taxi/modules/user/services/authService"

const SERVICES = [
  {
    id: "food",
    name: "Foods",
    description: "Delicious local favorites",
    image: "/super-app/food.png",
    path: "/food/user",
    icon: UtensilsCrossed,
    color: "from-[#FF4D4D] to-[#CB202D]",
    badge: "Fast",
    badgeIcon: "⚡"
  },
  {
    id: "grocery",
    name: "Quick Commerce",
    description: "20-Min Essentials",
    image: "/super-app/grocery.png",
    path: "/quick",
    icon: ShoppingBasket,
    color: "from-[#4CAF50] to-[#2DAB52]",
    badge: "Instant",
    badgeIcon: "⏱️"
  },
  {
    id: "taxi",
    name: "Taxi",
    description: "Safe city rides",
    image: "/super-app/taxi.png",
    path: "/taxi/user",
    icon: Car,
    color: "from-[#333333] to-[#000000]",
    badge: "Safe",
    badgeIcon: "🛡️"
  },
  {
    id: "hotel",
    name: "Hotel",
    description: "Luxury book stays",
    image: "/super-app/hotel.png",
    path: "/food/user",
    icon: Bed,
    color: "from-[#64B5F6] to-[#4A90E2]",
    badge: "Premium",
    badgeIcon: "💎"
  }
]

export default function SuperAppPortal() {
  const location = useLocation()
  const navigate = useNavigate()
  const redirectTo = typeof location.state?.redirectTo === "string" && location.state.redirectTo.trim()
    ? location.state.redirectTo.trim()
    : ""

  const handleServiceClick = (service) => {
    if (service.id === "taxi" && !hasLocalUserToken()) {
      navigate("/user/auth/login", {
        state: { redirectTo: redirectTo || service.path },
      })
      return
    }

    navigate(service.path)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col px-4 sm:px-6 pt-3 pb-3 overflow-hidden relative">
      {/* Floating profile action */}
      <button
        type="button"
        onClick={() => navigate("/user/auth/login")}
        className="fixed top-2 right-2 sm:top-3 sm:right-3 z-40 flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-full transition-all shadow-md hover:shadow-lg"
      >
        <User className="w-4 h-4 text-gray-500" />
        <span className="font-bold text-xs sm:text-sm text-gray-700">Profile</span>
      </button>

      {/* Lining Effect & Pattern Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
            backgroundSize: `40px 40px`
          }} />
          <div className="absolute inset-0 animate-scanline" style={{ 
            backgroundImage: `linear-gradient(transparent 0%, #000 50%, transparent 100%)`,
            backgroundSize: `100% 200px`,
            opacity: 0.5
          }} />
      </div>

      {/* Dynamic Background Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
             <motion.div
               key={i}
               animate={{
                 y: [0, -100, 0],
                 x: [0, 50, 0],
                 scale: [1, 1.2, 1],
                 opacity: [0.1, 0.2, 0.1]
               }}
               transition={{
                 duration: 10 + i * 2,
                 repeat: Infinity,
                 ease: "linear"
               }}
               className="absolute w-64 h-64 bg-[#CB202D]/5 rounded-full blur-3xl"
               style={{
                 left: `${Math.random() * 100}%`,
                 top: `${Math.random() * 100}%`,
               }}
             />
          ))}
      </div>

      {/* Top Header Section */}
      <div className="flex-1 flex flex-col items-center text-center justify-start space-y-3 sm:space-y-4 mt-10 sm:mt-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg shadow-gray-200/40 max-w-full"
        >
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-5 h-5 bg-gradient-to-br from-[#CB202D] to-red-700 rounded-md flex items-center justify-center shadow-md flex-shrink-0"
          >
             <span className="text-white text-[9px] font-black italic">A</span>
          </motion.div>
          <span className="text-[9px] sm:text-[10px] font-black tracking-[0.18em] text-[#BABCBD] uppercase whitespace-nowrap overflow-hidden text-ellipsis">
            Everything you need, delivered
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="text-4xl sm:text-5xl md:text-7xl font-black text-[#1A202C] tracking-tight leading-[0.95]"
        >
          Welcome to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CB202D] via-rose-500 to-[#CB202D] bg-[length:200%_auto] animate-gradient block mt-1 sm:mt-2">AppZeto</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[#718096] text-[13px] sm:text-sm md:text-lg font-bold max-w-[250px] sm:max-w-[320px] mx-auto leading-snug"
        >
          Choose a service to continue
        </motion.p>

        {/* Main Service Grid - compact for mobile */}
        <div className="w-full max-w-[800px] mx-auto mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
          {SERVICES.map((service, idx) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: 0.15 + idx * 0.06, 
                type: "spring", 
                stiffness: 120,
                damping: 18
              }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleServiceClick(service)}
              className="group cursor-pointer relative perspective"
            >
              <div className="relative h-[175px] sm:h-[205px] w-full rounded-[1.5rem] overflow-hidden shadow-xl bg-white border border-white/30 transition-all duration-500">
                {/* Image Base */}
                <div className="absolute inset-0 bg-gray-50 overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-tr ${service.color.replace('from-', 'from-black/40 to-')} opacity-25`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                </div>

                {/* Service Icon floating */}
                <div className="absolute top-3 left-3 z-30">
                  <motion.div 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: idx * 0.3 }}
                    className="p-2.5 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30 shadow-lg"
                  >
                    <service.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </motion.div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-3 left-3 right-3 z-30 space-y-0.5">
                  <h2 className="text-[1.05rem] sm:text-xl font-black text-white tracking-tight leading-none">
                    {service.name}
                  </h2>
                  <p className="text-white/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.08em]">
                    {service.description}
                  </p>
                </div>

                {/* Corner Badge */}
                <div className="absolute top-0 right-0 z-30">
                   <motion.div 
                     initial={{ x: 12, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: 0.25 + idx * 0.05 }}
                     className="bg-black/80 backdrop-blur-xl px-3 py-1.5 rounded-bl-2xl border-l border-b border-white/20 shadow-lg flex items-center gap-1.5"
                   >
                      <span className="text-[9px] scale-110">{service.badgeIcon}</span>
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">{service.badge}</span>
                   </motion.div>
                </div>
              </div>

              {/* Neon Glow on Hover */}
              <div className={`absolute inset-0 -z-10 rounded-[1.5rem] bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-25 blur-xl transition-all duration-500 scale-95`} />
            </motion.div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective {
          perspective: 1000px;
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
        @keyframes line-shine {
          0% { left: -100%; transition: none; }
          100% { left: 200%; transition: all 0.8s ease-in-out; }
        }
        .animate-line-shine {
          animation: line-shine 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}} />

      {/* Trust Badge at bottom */}
      <div className="mt-4 hidden sm:flex flex-col items-center gap-3 opacity-50">
         <div className="flex items-center gap-1.5 grayscale">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Secure by AppZeto</span>
         </div>
      </div>
    </div>
  )
}
