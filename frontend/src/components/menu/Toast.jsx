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
      className={`pointer-events-auto flex items-center gap-3 bg-white border border-border text-on-background px-4 py-3 rounded-2xl custom-shadow min-w-[220px] max-w-[300px] transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-8 scale-95"
      }`}
    >
      <span className="text-xl">{toast.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-on-background truncate">{toast.title}</p>
        <p className="text-[10px] text-secondary truncate">{toast.message}</p>
      </div>
      <CheckCircle size={14} className="text-success flex-shrink-0" />
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        className="text-secondary hover:text-primary transition-colors flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
