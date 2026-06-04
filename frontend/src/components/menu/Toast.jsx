import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 2.5s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onRemove]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 bg-[#1a1208] border border-amber-500/40 text-amber-100 px-4 py-3 rounded-2xl shadow-2xl shadow-amber-900/30 backdrop-blur-xl min-w-[220px] max-w-[300px] transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-8 scale-95"
      }`}
    >
      <span className="text-xl">{toast.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-300 truncate">{toast.title}</p>
        <p className="text-[10px] text-amber-100/60 truncate">{toast.message}</p>
      </div>
      <CheckCircle size={14} className="text-amber-400 flex-shrink-0" />
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        className="text-amber-100/40 hover:text-amber-100 transition-colors flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
