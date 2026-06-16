// Category metadata: icon emoji, display order
/* eslint-disable react-refresh/only-export-components */
export const CATEGORY_META = {
  All: { emoji: "🍽️", color: "cat-active-all", accent: "#5E8F6E" },
  Noodles: { emoji: "🍜", color: "cat-active-noodles", accent: "#A67F4C" },
  Rice: { emoji: "🍚", color: "cat-active-rice", accent: "#B08B50" },
  "Manchurian & Starters": { emoji: "🍗", color: "cat-active-starters", accent: "#7C8A5F" },
  "Egg Specials": { emoji: "🍳", color: "cat-active-egg", accent: "#B89356" },
  Biryani: { emoji: "🍛", color: "cat-active-biryani", accent: "#A7774B" },
  "Hot Beverages": { emoji: "☕", color: "cat-active-hot", accent: "#7D6241" },
  "Cool Drinks": { emoji: "🥤", color: "cat-active-cool", accent: "#7E8F68" },
  "Water Bottles": { emoji: "💧", color: "cat-active-water", accent: "#8A9B72" },
};

export default function CategoryTabs({ categories, selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat] || { emoji: "🍴", color: "cat-active-all", accent: "#2E7D32" };
        const isActive = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
              isActive
                ? "bg-primary text-white border-transparent shadow-sm"
                : "bg-white border-border text-secondary hover:bg-surface-variant hover:border-primary/30"
            }`}
          >
            <span className="text-sm">{meta.emoji}</span>
            <span>{cat === "Manchurian & Starters" ? "Starters" : cat}</span>
          </button>
        );
      })}
    </div>
  );
}
