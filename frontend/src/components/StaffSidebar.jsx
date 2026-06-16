import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, ShoppingBag, ChefHat, BarChart3, BookOpen, Settings, LogOut 
} from "lucide-react";

export default function StaffSidebar({ activeItem, setActiveTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isKitchen = location.pathname === "/kitchen";

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Live Orders", icon: ShoppingBag },
    { id: "kitchen", label: "Kitchen", icon: ChefHat },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "menu", label: "Menu Editor", icon: BookOpen },
  ];

  const handleItemClick = (item) => {
    if (item.id === "kitchen") {
      navigate("/kitchen");
    } else {
      if (isKitchen) {
        navigate("/admin?tab=" + item.id);
      } else if (setActiveTab) {
        setActiveTab(item.id);
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      sessionStorage.removeItem("staff_auth");
      window.location.reload();
    }
  };

  return (
    <aside className="w-64 bg-surface-variant border-r border-border p-5 flex flex-col justify-between h-screen sticky top-0 shrink-0 text-left">
      <div className="space-y-6">
        {/* Top Branding */}
        <div>
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Café X96</h2>
          <p className="text-[10px] text-outline font-bold tracking-widest mt-1 uppercase">Admin</p>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-3 px-4.5 py-3 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-primary shadow-sm active-tab font-bold"
                    : "text-secondary hover:text-primary hover:bg-white/40"
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="space-y-0.5 pt-4 border-t border-surface-variant/30">
          <button className="w-full flex items-center gap-3 px-4.5 py-2.5 rounded-full text-xs font-semibold text-secondary hover:text-primary hover:bg-white/40 cursor-pointer">
            <Settings size={15} />
            <span>Settings</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4.5 py-2.5 rounded-full text-xs font-semibold text-error hover:bg-error/10 cursor-pointer"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
      </div>
    </aside>
  );
}
