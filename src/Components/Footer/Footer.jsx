import {
  faFacebook,
  faInstagram,
  faLinkedinIn,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ArrowRight, Italic } from "lucide-react";
import buy from "../../assets/images/Buy.png";
import authentic from "../../assets/images/Authentic.png";
import save from "../../assets/images/Save.png";
import reliable from "../../assets/images/Reliable.png";
import italicLogo from "../../assets/images/ITALIC.png";

export default function Footer() {
  // Features data
  const features = [
    {
      title: "Buy Products at best prices",
      icon: buy,
      description: "Get the best deals and offers",
    },
    {
      title: "Authentic and Reliable",
      icon: authentic,
      description: "100% genuine products",
    },
    {
      title: "Save Time & Effort",
      icon: save,
      description: "Quick and easy shopping",
    },
    {
      title: "Reliable & Secure Redirects",
      icon: reliable,
      description: "Safe and secure transactions",
    },
  ];

  return (
    <div>
      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-8 border-b border-gray-200 max-w-6xl mx-auto px-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="px-4 border-r last:border-none border-gray-300 text-left"
          >
            <div className="w-16 h-16 flex items-center mb-4">
              <img
                src={feature.icon}
                alt={feature.title}
                className="w-12 h-12 object-contain"
              />
            </div>
            <h3
              className="font-bold text-gray-800 mb-1"
              style={{ fontSize: "16px" }}
            >
              {feature.title}
            </h3>
          </div>
        ))}
      </div>

      <footer
        className="text-white"
        style={{
          backgroundColor: "#443778",
          paddingTop: "80px",
          paddingBottom: "80px",
          height: "400px",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{
            backgroundColor: "#443778",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* First Column - Brand */}
            <div className="space-y-2">
              <div className="w-24 h-12 flex items-center">
                <img
                  src={italicLogo}
                  alt="Italic Logo"
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium">Crafted Carefully to</p>
                <p className="text-white">
                  Save{" "}
                  <span className="text-green-400 font-medium">Your Money</span>
                </p>
              </div>
            </div>

            {/* Second Column - Shop */}
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-lg">SHOP</h3>
              <ul className="space-y-3 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    All Categories
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Top Price Dropped
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Hot Deals
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Compare Products
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Set Price Alert
                  </a>
                </li>
              </ul>
            </div>

            {/* Third Column - About Us */}
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-lg">ABOUT US</h3>
              <ul className="space-y-3 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    What We Do
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Affiliate
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Policies
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blogs
                  </a>
                </li>
              </ul>
            </div>

            <div className=" space-y-2">
              <h3 className="text-white font-semibold text-lg">HELP</h3>
              <ul className="space-y-3 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Use
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Compare Products
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Set Price Alert
                  </a>
                </li>
              </ul>
            </div>

            {/* Fourth Column - Newsletter */}
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-lg">
                Subscribe to our Newsletter
              </h3>
              <p className="text-gray-300 text-sm">
                Never miss exclusive offers, price drop alerts, and personalized
                tips for shopping
              </p>

              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter Your Email"
                  className="w-full px-4 py-3 pr-12 rounded-full bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-600 hover:text-green-400 transition-colors">
                  <ArrowRight size={20} />
                </button>
              </div>

              <div className="flex space-x-3 mt-6">
                <a
                  href="#"
                  className="w-8 h-8 bg-white-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <FontAwesomeIcon icon={faFacebook} />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-white-600 rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors"
                >
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-white-400 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors"
                >
                  <FontAwesomeIcon icon={faXTwitter} />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-white-700 rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors"
                >
                  <FontAwesomeIcon icon={faLinkedinIn} />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className=" mt-4 pt-4">
            <p className="text-gray-400 text-sm text-right">
              © 2025 Price Comparison Portal. All Right Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
