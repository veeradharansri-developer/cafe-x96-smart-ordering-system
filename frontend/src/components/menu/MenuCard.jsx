import { useState } from "react";
import { Plus, Minus, Flame, Leaf } from "lucide-react";

export default function MenuCard({ item, cartItem, onAddToCart, onUpdateQuantity }) {
  const [selectedVariant, setSelectedVariant] = useState("single");
  const [imgError, setImgError] = useState(false);

  const currentPrice = item.hasVariants && selectedVariant === "full" ? item.fullPrice : item.price;
  const variantLabel = item.hasVariants && selectedVariant === "full" ? "Full" : "Single";

  const cartKey = item.hasVariants ? `${item.id}_${selectedVariant}` : item.id;
  const qty = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    onAddToCart({
      id: cartKey,
      baseId: item.id,
      name: item.hasVariants ? `${item.name} (${variantLabel})` : item.name,
      price: currentPrice,
      variant: item.hasVariants ? variantLabel : null,
      emoji: item.emoji,
      isVeg: item.isVeg,
    });
  };

  const handleDecrease = () => onUpdateQuantity(cartKey, -1);
  const handleIncrease = () => onUpdateQuantity(cartKey, 1);

  return (
    <div
      className={`relative group rounded-2xl overflow-hidden transition-all duration-300 border ${
        item.isOutOfStock
          ? "opacity-60 border-white/5 bg-white/2"
          : "border-amber-900/30 bg-gradient-to-br from-[#1a1007] to-[#0f0a04] hover:border-amber-500/40 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-900/20"
      }`}
      style={{ backdropFilter: "blur(12px)" }}
    >
      {/* Popular Badge */}
      {item.isPopular && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
          <Flame size={8} /> Popular
        </div>
      )}

      {/* Sold Out overlay */}
      {item.isOutOfStock && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
          <span className="bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">Sold Out</span>
        </div>
      )}

      <div className="flex gap-3 p-3">
        {/* Food Image / Emoji */}
        <div className="relative flex-shrink-0 w-[88px] h-[88px] rounded-xl overflow-hidden bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-900/20">
          {!imgError ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl select-none">
              {item.emoji}
            </div>
          )}
          {/* Veg / Non-Veg dot */}
          <span className={`absolute bottom-1.5 right-1.5 w-4 h-4 rounded border flex items-center justify-center bg-black/80 ${item.isVeg ? "border-emerald-500" : "border-red-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-red-500"}`} />
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <h3 className="font-bold text-sm text-amber-50 leading-snug line-clamp-2 flex-1">{item.name}</h3>
              {item.isVeg ? (
                <Leaf size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <span className="text-[8px] text-red-400 font-bold flex-shrink-0 mt-0.5">NON-VEG</span>
              )}
            </div>
            <p className="text-[10px] text-amber-100/40 line-clamp-2 leading-relaxed mb-2">{item.description}</p>
          </div>

          {/* Size Selector */}
          {item.hasVariants && (
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => setSelectedVariant("single")}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all duration-200 ${
                  selectedVariant === "single"
                    ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                    : "bg-white/5 border-white/10 text-amber-100/40 hover:border-amber-500/30"
                }`}
              >
                Single ₹{item.price}
              </button>
              <button
                onClick={() => setSelectedVariant("full")}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all duration-200 ${
                  selectedVariant === "full"
                    ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                    : "bg-white/5 border-white/10 text-amber-100/40 hover:border-amber-500/30"
                }`}
              >
                Full ₹{item.fullPrice}
              </button>
            </div>
          )}

          {/* Price + Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-black text-base text-amber-400">₹{currentPrice}</span>
              {item.hasVariants && (
                <span className="text-[9px] text-amber-100/30 ml-1">{variantLabel}</span>
              )}
            </div>

            {/* Quantity Control or Add Button */}
            {!item.isOutOfStock && (
              qty > 0 ? (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-xl overflow-hidden">
                  <button
                    onClick={handleDecrease}
                    className="w-7 h-7 flex items-center justify-center text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-amber-300">{qty}</span>
                  <button
                    onClick={handleIncrease}
                    className="w-7 h-7 flex items-center justify-center text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-lg shadow-orange-900/30 hover:shadow-orange-900/50 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <Plus size={12} /> ADD
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
