import React, { useState } from "react";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Save,
  LogOut,
  Trash2,
} from "lucide-react";

const groups = [
  {
    title: "Account",
    items: ["Profile Overview", "Addresses", "Wishlist", "Price Alerts"],
  },
  {
    title: "Offers & Credits",
    items: ["Coupons & Offers", "Notification Settings"],
  },
  {
    title: "General",
    items: [
      "Communication Preferences",
      "Contact Us",
      "Report an issue",
      "Feedback",
    ],
  },
];

export default function ProfileOverviewPage() {
  const [open, setOpen] = useState({
    Account: true,
    "Offers & Credits": true,
    General: true,
  });
  const [active, setActive] = useState("Profile Overview");
  const [isEditing, setIsEditing] = useState(false);

//   const [form, setForm] = useState({
//     fullName: "Anonymous",
//     email: "Anonymous",
//     mobile: "(222) 555-XXXX",
//     zip: "14304",
//   });

//   const onChange = (e) => {
//     const { name, value } = e.target;
//     setForm((prev) => ({ ...prev, [name]: value }));
//   };

  const onSave = () => {
    // TODO: call your API here
    setIsEditing(false);
  };

  return (
    <>
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pt-8 pb-16">
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="">
            {groups.map((g) => (
              <div
                key={g.title}
                className="mb-2 rounded-md border border-gray-200"
              >
                <button
                  onClick={() =>
                    setOpen((s) => ({ ...s, [g.title]: !s[g.title] }))
                  }
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
                >
                  <span>{g.title}</span>
                  {open[g.title] ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {open[g.title] && (
                  <ul className="border-t border-gray-200 py-1">
                    {g.items.map((item) => {
                      const isActive = active === item;
                      return (
                        <li key={item}>
                          <button
                            onClick={() => setActive(item)}
                            className={`w-full text-left px-3 py-2 text-sm ${
                              isActive
                                ? "bg-gray-100 text-gray-900 font-semibold"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {item}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}

            <div className="mt-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
              <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </aside>

          {/* Content */}
          <section className="">
            {/* Title with right rule */}
            <div className="items-end justify-between">
              <h1 className="text-[22px] font-semibold text-gray-800">
                Profile Overview
              </h1>
              <div className="h-px flex-1 bg-gray-200 mt-4" />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
              className="max-w-xl"
            >
              {/* Form Fields */}
              <div className="space-y-4 mt-8">
                {/* Full Name */}
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    // value={formData.fullName}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                {/* Email */}
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm font-medium">Email</label>
                  <input
                    type="text"
                    // value={formData.email}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                {/* Mobile Number */}
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm font-medium">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    // value={formData.mobile}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                {/* Zip Code */}
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm font-medium">Zip Code</label>
                  <input
                    type="text"
                    // value={formData.zipCode}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="ml-16 mt-12 flex items-center gap-18">
                <button
                  type="button"
                  onClick={() => setIsEditing((v) => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>

                <button
                  type="submit"
                  disabled={!isEditing}
                  className={`relative ml-4 inline-flex items-center justify-center rounded-full px-8 py-2 text-sm font-semibold text-white transition
                    ${
                      isEditing
                        ? "bg-gray-600 hover:bg-gray-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                >
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      <Footer />
    </>
  );
}
