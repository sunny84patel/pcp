import React, { useState } from "react";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import { Star, Share2, Trash2, Bell, Clock3 } from "lucide-react";

import homedepot from "../assets/images/homedepot.png";
import lowes from "../assets/images/lowes.png";
import offericon from "../assets/images/offericon.png"; // small promo strip(s)

// ---- dummy data (swap with API) ----
const ITEMS = [
  {
    id: 1,
    badge: { text: "Best Seller", bg: "#F1D7D9", fg: "#6B1F26" },
    title:
      "Ryobi One+ 18V Lithium-Ion Starter Kit with 2.0 Ah Battery, 4.0 Ah Battery, and Charger",
    rating: 5,
    image:
      "https://images.unsplash.com/photo-1581093458791-9d42e3f98a03?q=80&w=600&auto=format&fit=crop",
    prices: [
      { store: "Lowe's", logo: lowes, price: 349, list: 420, save: 29 },
      { store: "Home Depot", logo: homedepot, price: 320, list: 420, save: 29, lowest: true },
    ],
    offers: 3,
    offerChips: [offericon],
  },
  {
    id: 2,
    badge: { text: "Exclusive", bg: "#E9E4FF", fg: "#3E2F92" },
    title: "Dewalt 18V Lithium-Ion Starter Power Cutter",
    rating: 5,
    image:
      "https://images.unsplash.com/photo-1581091014534-0f3f5c9c2b76?q=80&w=600&auto=format&fit=crop",
    prices: [{ store: "Home Depot", logo: homedepot, price: 320, list: 420, save: 29, lowest: true }],
    offers: 3,
    offerChips: [offericon],
  },
  {
    id: 3,
    badge: { text: "Exclusive", bg: "#E9E4FF", fg: "#3E2F92" },
    title: "Dewalt 18V Lithium-Ion Starter Power Cutter",
    rating: 5,
    image:
      "https://images.unsplash.com/photo-1581091014534-0f3f5c9c2b76?q=80&w=600&auto=format&fit=crop",
    prices: [{ store: "Home Depot", logo: homedepot, price: 320, list: 420, save: 29, lowest: true }],
    offers: 3,
    offerChips: [offericon],
  },
  {
    id: 4,
    badge: { text: "Best Seller", bg: "#F1D7D9", fg: "#6B1F26" },
    title:
      "Ryobi One+ 18V Lithium-Ion Starter Kit with 2.0 Ah Battery, 4.0 Ah Battery, and Charger",
    rating: 5,
    image:
      "https://images.unsplash.com/photo-1581093458791-9d42e3f98a03?q=80&w=600&auto=format&fit=crop",
    prices: [
      { store: "Lowe's", logo: lowes, price: 349, list: 420, save: 29 },
      { store: "Home Depot", logo: homedepot, price: 320, list: 420, save: 29, lowest: true },
    ],
    offers: 3,
    offerChips: [offericon],
  },
  // add more…
];

// ===== small pieces =====
const Stars = ({ value }) => (
  <div className="flex items-center gap-1 text-xs text-gray-800 mt-2 mb-2">
    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    <span>{value}/5</span>
  </div>
);

const PriceTile = ({ p }) => (
  <div className="">
    <div className="flex items-center gap-2">
      <img src={p.logo} alt={p.store} className="h-5 w-auto" />
      <span className="text-lg font-bold">${p.price}</span>
      <span className="text-xs text-gray-400 line-through">${p.list}</span>
    </div>
    <div className="mt-1 flex items-center gap-2">
      <span className="text-xs font-semibold text-green-700">Save ${p.save}</span>
      {p.lowest && (
        <span className="rounded bg-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-900">
          Lowest Price
        </span>
      )}
    </div>
  </div>
);

const WishlistRow = ({ item, onDelete }) => (
  <div className="rounded-xl border border-[#CFC7F2] bg-white px-4 py-3 shadow-sm">
    <div className="flex items-center gap-4">
      {/* Image */}
      <div className="flex-shrink-0">
        <img src={item.image} alt="" className="h-20 w-20 object-contain" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1">
        {/* Badge + Title + Stars */}
        <div className="flex items-center gap-2">
          {item.badge && (
            <span
              className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: item.badge.bg, color: item.badge.fg }}
            >
              {item.badge.text}
            </span>
          )}
          <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
        </div>
        <Stars value={item.rating} />

        {/* Prices + Offers */}
        <div className="mt-1 flex items-center gap-4">
          {item.prices.map((p, i) => (
            <PriceTile key={i} p={p} />
          ))}
          {/* Divider */}
          <div className="h-10 w-px bg-gray-300" />
          {/* Offers */}
          <div>
            <div className="text-sm font-medium text-gray-900">{item.offers} Offers</div>
            <div className="mt-1 flex items-center gap-1">
              {item.offerChips.map((src, i) => (
                <img key={i} src={src} alt="" className="h-5 w-auto object-contain" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-6 ml-4">
        <div className="flex gap-2">
          <button className="rounded-full p-2 hover:bg-gray-100" title="Share">
            <Share2 className="h-4 w-4" />
          </button>
          <button
            className="rounded-full p-2 hover:bg-gray-100"
            title="Delete"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <button className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-black">
          <span>Set Price Alert</span>
          <Clock3 className="h-4 w-4" />
        </button>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span>Add to Compare</span>
          <input type="checkbox" className="h-4 w-4 accent-[#5F43B2]" />
        </label>
      </div>
    </div>
  </div>
);


// ===== page =====
export default function WishlistPage() {
  const [items, setItems] = useState(ITEMS);
  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <>
      <Navbar />

      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* top bar (title + actions) */}
        <div
          className="flex justify-between items-end pb-3 mb-8"
          style={{ borderBottom: "1px solid #ABA9A980" }}
        >
          <div className="text-[18px] font-semibold">
            Compare Products
            <span className="ml-2 text-sm font-normal text-gray-500">
              {items.length} products added out to maximum 3
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <button className="text-gray-700 hover:text-black">Clear All</button>
            <button className="text-gray-700 hover:text-black">Add Products +</button>
          </div>
        </div>

        {/* rows */}
        <div className="space-y-4">
          {items.map((it) => (
            <WishlistRow key={it.id} item={it} onDelete={() => remove(it.id)} />
          ))}
        </div>

        {/* pagination */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            &lt; Previous
          </button>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`h-8 w-8 rounded-full text-sm ${
                n === 2 ? "bg-[#5F43B2] text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          ))}
          <button className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Next &gt;
          </button>
        </div>
      </div>

      <Footer />
    </>
  );
}
