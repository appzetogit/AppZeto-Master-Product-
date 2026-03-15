import React from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { 
  ChefHat, 
  Car, 
  ShoppingBag, 
  User, 
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock
} from "lucide-react"

const MODULES = [
  {
    id: "food",
    title: "Food Delivery",
    description: "Delicious meals delivered to your doorstep",
    icon: ChefHat,
    color: "from-orange-500 to-amber-500",
    path: "/food/user",
    stats: "500+ Restaurants"
  },
  {
    id: "taxi",
    title: "Taxi Services",
    description: "Reliable rides wherever you go",
    icon: Car,
    color: "from-blue-500 to-cyan-500",
    path: "/taxi/user",
    stats: "1000+ Drivers"
  },
  {
    id: "quick-commerce",
    title: "Quick Commerce",
    description: "Groceries and more in minutes",
    icon: ShoppingBag,
    color: "from-green-500 to-emerald-500",
    path: "/quick-commerce",
    stats: "10 min Delivery"
  }
]

export default function MasterLandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0f1115] text-white font-sans selection:bg-orange-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1115]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-blue-500 rounded-xl flex items-center justify-center font-black text-xl">
              A
            </div>
            <span className="text-2xl font-black tracking-tighter italic">APPZETO</span>
          </div>
          
          <button 
            onClick={() => navigate("/user/auth/login")}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-full transition-all group"
          >
            <User className="w-5 h-5 text-gray-400 group-hover:text-white" />
            <span className="font-semibold">Profile</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-500/20"
            >
              <TrendingUp className="w-4 h-4" />
              Everything you need, in one app
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black tracking-tight"
            >
              The Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-blue-400">Ecosystem</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto"
            >
              Order food, book rides, and get essentials delivered instantly. 
              The ultimate multi-service platform designed for your lifestyle.
            </motion.p>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MODULES.map((module, idx) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                whileHover={{ y: -10 }}
                onClick={() => navigate(module.path)}
                className="group cursor-pointer"
              >
                <div className="relative h-full bg-white/[0.03] border border-white/5 rounded-3xl p-8 overflow-hidden transition-all group-hover:bg-white/[0.05] group-hover:border-white/20 shadow-2xl">
                  {/* Glow Effect */}
                  <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity`} />
                  
                  <div className={`w-16 h-16 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                    <module.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-3">{module.title}</h3>
                  <p className="text-gray-400 leading-relaxed mb-8">
                    {module.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      {module.stats}
                    </span>
                    <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white text-gray-400 group-hover:text-black transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Features */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/5 pt-16">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Live Tracking</h4>
                <p className="text-gray-500">Know exactly where your order or ride is in real-time.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Instant Service</h4>
                <p className="text-gray-500">Our average response time is under 3 minutes.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Secure Payments</h4>
                <p className="text-gray-500">Multiple payment options with industry-standard security.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-600 text-sm">
        <p>&copy; 2026 AppZeto Master Product. All rights reserved.</p>
      </footer>
    </div>
  )
}
