import React, { useState, useEffect } from "react";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  LogOut,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateUser, deleteUser, logout } from "../Redux/Reducers/userSlice";
import { logout as otpLogout, resetOTPState } from "../Redux/Reducers/OtpSlice";
import { logout as loginLogout } from "../Redux/Reducers/LoginSlice";
const groups = [
  { title: "Account", items: ["Profile Overview", "Wishlist"] },
  {
    title: "General",
    items: ["Communication Preferences", "Contact Us", "FAQ's"],
  },
];

export default function ProfileOverviewPage() {
  const [open, setOpen] = useState({
    Account: true,
    General: true,
  });
  const [active, setActive] = useState("Profile Overview");
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useDispatch();

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    dispatch(loginLogout());
    dispatch(otpLogout());
    dispatch(resetOTPState());
    
    navigate("/", { replace: true });
  };

  const handleDelete = async () => {
    const res = await dispatch(deleteUser());
    if (res.meta.requestStatus === "fulfilled") {
      navigate("/"); // ✅ redirect after successful delete
    }
  };
  const onSave = (e) => {
    e?.preventDefault?.();
    // TODO: call your API here
    setIsEditing(false);
  };
  const navigate = useNavigate();
  return (
    <>
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pt-8 pb-16">
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside>
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
                            onClick={() => {
                              if (item === "Wishlist") {
                                navigate("/wishlist");
                              } else {
                                setActive(item);
                              }
                            }}
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
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>

              <button
                onClick={handleDelete}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </aside>

          {/* Content */}
          <section>
            <Header title={active} />
            {active === "Profile Overview" && (
              <ProfileOverview
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onSave={onSave}
              />
            )}

            {active === "Communication Preferences" && (
              <CommunicationPreferences />
            )}

            {active === "Contact Us" && <ContactUs />}

            {active === "FAQ's" && <Faqs />}
          </section>
        </div>
      </div>

      <Footer />
    </>
  );
}

/* ---------------- UI PARTIALS ---------------- */

function Header({ title }) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold text-gray-800">{title}</h1>
      <div className="h-px w-full bg-gray-200 mt-4" />
    </div>
  );
}

function ProfileOverview({ isEditing, setIsEditing, onSave }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [form, setForm] = useState(user || {});

  useEffect(() => {
    if (user) setForm(user);
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    dispatch(updateUser(form));
    setIsEditing(false);
  };

  return (
    <form onSubmit={handleSave} className="max-w-xl">
      <div className="space-y-4 mt-8">
        <Field
          label="Full Name"
          name="fullName"
          value={form.fullName || ""}
          onChange={handleChange}
          disabled={!isEditing}
        />
        <Field
          label="Email"
          name="email"
          value={form.email || ""}
          onChange={handleChange}
          disabled={!isEditing}
        />
        <Field
          label="Mobile Number"
          name="mobile"
          value={form.mobile || ""}
          onChange={handleChange}
          disabled={!isEditing}
        />
        <Field
          label="Zip Code"
          name="zip"
          value={form.zip || ""}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </div>

      <div className="ml-16 mt-12 flex items-center">
        <button
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>

        <button
          type="submit"
          disabled={!isEditing}
          className={`ml-4 inline-flex items-center justify-center rounded-full px-8 py-2 text-sm font-semibold text-white transition
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
  );
}

function CommunicationPreferences() {
  return (
    <div className="max-w-3xl">
      <div className="mt-8 space-y-6 text-sm text-gray-700">
        <section>
          <h3 className="font-semibold text-gray-900">Email Price Alerts</h3>
          <p className="mt-2">
            You have no active price alerts set. Click here to set an alert for
            a product{" "}
            <a href="#" className="text-indigo-600 hover:underline">
              here
            </a>
            .
          </p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              Email notifications are being sent to:{" "}
              <a
                href="mailto:alexjosephilip@gmail.com"
                className="text-indigo-600 hover:underline"
              >
                alexjosephilip@gmail.com
              </a>{" "}
              (
              <a href="#" className="text-indigo-600 hover:underline">
                Change
              </a>
              ).
            </li>
          </ul>
        </section>

        <section className="pt-2">
          <h3 className="font-semibold text-gray-900">Promotional Emails</h3>
          <p className="mt-2">
            You are subscribed to receive promotional, price drop, events, sales
            emails as a part of our outreach program.
          </p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              Email notifications are being sent to:{" "}
              <a
                href="mailto:alexjosephilip@gmail.com"
                className="text-indigo-600 hover:underline"
              >
                alexjosephilip@gmail.com
              </a>{" "}
              (
              <a href="#" className="text-indigo-600 hover:underline">
                Change
              </a>
              ).
            </li>
          </ul>
          <p className="mt-4 text-xs text-gray-500">
            Note that even if you choose not to receive personalised ads or
            emails, you may see some promotional email as a part of our user
            agreements.
          </p>
        </section>
      </div>
    </div>
  );
}

function ContactUs() {
  return (
    <div className="max-w-4xl">
      <div className="mt-8 space-y-8 text-sm text-gray-700">
        <section>
          <h3 className="font-semibold text-gray-900">Report an Issue</h3>
          <p>
            Connect with BuildScout via email or social logins to report an
            issue:
          </p>
          <ul className="mt-2 space-y-1">
            <li>
              Email:{" "}
              <a
                className="text-indigo-600 hover:underline"
                href="mailto:info@buildscout.com"
              >
                info@buildscout.com
              </a>
            </li>
            <li>
              Facebook:{" "}
              <a
                className="text-indigo-600 hover:underline"
                href="#"
                rel="noreferrer"
              >
                BuildScout
              </a>
            </li>
            <li>
              X :{" "}
              <a
                className="text-indigo-600 hover:underline"
                href="#"
                rel="noreferrer"
              >
                buildscout.com
              </a>
            </li>
            <li>
              LinkedIn:{" "}
              <a
                className="text-indigo-600 hover:underline"
                href="#"
                rel="noreferrer"
              >
                buildscout.com
              </a>
            </li>
            <li>
              Instagram:{" "}
              <a
                className="text-indigo-600 hover:underline"
                href="#"
                rel="noreferrer"
              >
                buildscout.com
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900">Stores Enquiry</h3>
          <p>
            Are you interested in listing your ecommerce platform on BuildScout?
            If yes, contact us on:
            <br />
            <a
              className="text-indigo-600 hover:underline"
              href="mailto:business@buildscout.com"
            >
              business@buildscout.com
            </a>
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900">Privacy Policy</h3>
          <p className="mt-2">
            If you have any questions about how BuildScout handles privacy data,
            check{" "}
            <a href="#" className="text-indigo-600 hover:underline">
              here
            </a>{" "}
            reach out to us on:
            <br />
            <a
              href="mailto:privacy@buildscout.com"
              className="text-indigo-600 hover:underline"
            >
              privacy@buildscout.com
            </a>
            .
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900">Feedback</h3>
          <p className="mt-2">
            Help us improve our platform to serve you better. Contact on:
            <br />
            <a
              href="mailto:weListen@buildscout.com"
              className="text-indigo-600 hover:underline"
            >
              weListen@buildscout.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

function Faqs() {
  const items = [
    {
      q: "How are prices updated on BuildScout?",
      a: "We fetch prices periodically from supported stores and update product pages accordingly.",
    },
    {
      q: "Can I buy directly from BuildScout?",
      a: "Purchases happen on the seller’s site. We redirect you to the best offer.",
    },
    {
      q: "Is my private data safe with BuildScout?",
      a: "Yes. We follow industry best practices and never sell personal data.",
    },
    {
      q: "Can I stop the price alert emails?",
      a: "You can manage or unsubscribe from alerts in Communication Preferences.",
    },
    {
      q: "What parameters BuildScout consider to compare products?",
      a: "Price, specs, shipping, seller rating, and availability.",
    },
    {
      q: "Which platforms are listed on BuildScout?",
      a: "We support a curated set of e-commerce stores and marketplaces.",
    },
    {
      q: "How can I set price alert?",
      a: "Open a product page and click 'Set Price Alert' to configure your target price.",
    },
  ];

  const [open, setOpen] = useState(null);

  return (
    <div className="max-w-4xl">
      <div className="mt-8">
        {items.map((it, idx) => {
          const isOpen = open === idx;
          return (
            <div key={idx} className="border-b border-gray-200">
              <button
                className="w-full flex items-center justify-between py-4 text-left"
                onClick={() => setOpen(isOpen ? null : idx)}
              >
                <span className="font-medium text-gray-800">{it.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="pb-4 text-sm text-gray-700">{it.a}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-32 text-sm font-medium">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-50"
      />
    </div>
  );
}
