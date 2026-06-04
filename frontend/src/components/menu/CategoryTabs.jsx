// Category metadata: icon emoji, display order
export const CATEGORY_META = {
  All: { emoji: "🍽️", color: "from-amber-500 to-orange-500" },
  Noodles: { emoji: "🍜", color: "from-yellow-500 to-orange-400" },
  Rice: { emoji: "🍚", color: "from-amber-400 to-yellow-500" },
  "Manchurian & Starters": { emoji: "🍗", color: "from-red-500 to-orange-500" },
  "Egg Specials": { emoji: "🍳", color: "from-amber-400 to-yellow-400" },
  Biryani: { emoji: "🍛", color: "from-orange-600 to-amber-500" },
  "Hot Beverages": { emoji: "☕", color: "from-amber-700 to-orange-600" },
  "Cool Drinks": { emoji: "🥤", color: "from-blue-500 to-cyan-400" },
  "Water Bottles": { emoji: "💧", color: "from-sky-400 to-blue-400" },
};

export default function CategoryTabs({ categories, selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat] || { emoji: "🍴", color: "from-amber-500 to-orange-500" };
        const isActive = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
              isActive
                ? `bg-gradient-to-r ${meta.color} text-white border-transparent shadow-lg`
                : "bg-white/5 border-white/10 text-amber-100/60 hover:border-amber-500/30 hover:text-amber-300"
            }`}
          >
            <span>{meta.emoji}</span>
            <span>{cat === "Manchurian & Starters" ? "Starters" : cat}</span>
          </button>
        );
      })}
    </div>
  );
}
