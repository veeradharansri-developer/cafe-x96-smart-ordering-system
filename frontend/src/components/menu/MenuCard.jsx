import { useState } from "react";
import { Plus, Minus } from "lucide-react";

export default function MenuCard({ item, cartItem, fullCartItem, onAddToCart, onUpdateQuantity }) {
  const [selectedVariant, setSelectedVariant] = useState("single");
  const [imgError, setImgError] = useState(false);

  const currentPrice = item.hasVariants && selectedVariant === "full" ? item.fullPrice : item.price;
  const variantLabel = item.hasVariants && selectedVariant === "full" ? "Full" : "Single";

  const cartKey = item.hasVariants ? `${item.id}_${selectedVariant}` : item.id;
  const qty = item.hasVariants
    ? (selectedVariant === "full" ? (fullCartItem ? fullCartItem.quantity : 0) : (cartItem ? cartItem.quantity : 0))
    : (cartItem ? cartItem.quantity : 0);

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
      className={`relative group rounded-card overflow-hidden transition-all duration-200 border ${
        item.isOutOfStock
          ? "opacity-70 border-border bg-white/80"
          : "border-border bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      {item.isOutOfStock && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 rounded-card">
          <span className="bg-accent-gold text-white text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-[0.15em] shadow-sm">Sold Out</span>
        </div>
      )}

      {/* Card Image section */}
      <div className="relative w-full h-44 bg-surface-variant overflow-hidden">
        {!imgError ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-surface-variant select-none">
            {item.emoji}
          </div>
        )}
        {/* Veg / Non-Veg Indicator */}
        <span className={`absolute bottom-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center bg-white/95 shadow-sm ${item.isVeg ? "border-emerald-500" : "border-red-500"}`}>
          <span className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-red-500"}`} />
        </span>
      </div>

      <div className="p-4 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-base text-on-background leading-snug line-clamp-1">
                {item.name}
              </h3>
            </div>
            <div className="text-lg">{item.emoji}</div>
          </div>

          {item.rating && (
            <div className="inline-flex items-center gap-1 text-xs text-secondary font-semibold bg-surface-variant px-2 py-1 rounded-full border border-border">
              ⭐ {item.rating.toFixed(1)}
            </div>
          )}
        </div>

        {item.hasVariants && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => setSelectedVariant("single")}
              className={`rounded-full py-2 text-[12px] font-semibold transition-all duration-200 ${
                selectedVariant === "single"
                  ? "bg-primary text-white"
                  : "bg-surface-variant text-secondary hover:bg-surface-container"
              }`}
            >
              Single ₹{item.price}
            </button>
            <button
              onClick={() => setSelectedVariant("full")}
              className={`rounded-full py-2 text-[12px] font-semibold transition-all duration-200 ${
                selectedVariant === "full"
                  ? "bg-primary text-white"
                  : "bg-surface-variant text-secondary hover:bg-surface-container"
              }`}
            >
              Full ₹{item.fullPrice}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-bold text-xl text-on-background">₹{currentPrice}</span>
            {item.hasVariants && (
              <span className="text-[11px] text-secondary ml-1">({variantLabel})</span>
            )}
          </div>

          {!item.isOutOfStock && (
            qty > 0 ? (
              <div className="flex items-center rounded-full bg-surface-variant border border-border overflow-hidden">
                <button
                  onClick={handleDecrease}
                  className="w-9 h-9 flex items-center justify-center text-primary hover:bg-surface-container transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-9 text-center text-sm font-bold text-on-background">{qty}</span>
                <button
                  onClick={handleIncrease}
                  className="w-9 h-9 flex items-center justify-center text-primary hover:bg-surface-container transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="px-5 py-2 rounded-full bg-primary text-white text-[12px] font-bold shadow-sm hover:bg-primary-hover transition-all"
              >
                Add to cart
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
