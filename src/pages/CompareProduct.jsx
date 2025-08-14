import { useState } from "react";
import homedepot from "../assets/images/homedepot.png";
import lowes from "../assets/images/lowes.png";
import Navbar from "../Components/Navbar/navbar";
import SearchBar from "../Components/Search Bar/SearchBar";
import Footer from "../Components/Footer/Footer";
import { ChevronDown, Heart, Star } from "lucide-react";
import offericon from "../assets/images/offericon.png";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import informationCircle from "../assets/images/informationCircle.png";
import location from "../assets/images/location.png";

const dummyProducts = [
  {
    id: 1,
    title: "Ryobi One+ 18V Lithium-Ion Hammer Drill with 2.0 Ah Battery",
    price: 320,
    listPrice: 420,
    image: homedepot,
    rating: 4,
    reviews: 1181,
    delivery: "Delivery in 2-3 Days, Friday, 27 June",
    stores: [
      {
        name: "Home Depot",
        logo: homedepot,
        location: "Niagara Falls #1287",
        distance: "0.1 mi",
        price: 320,
        listPrice: 420,
        savings: 100,
        offers: 3,
        inStock: 12,
      },
      {
        name: "Lowe's",
        logo: lowes,
        location: "Magenta Street #1287",
        distance: "0.1 mi",
        price: 349,
        listPrice: 420,
        savings: 71,
        offers: 2,
        inStock: 6,
      },
    ],
  },
  {
    id: 2,
    title: "Milwaukee M18 FUEL 18V Cordless Hammer Drill & Impact Driver Kit",
    price: 369,
    listPrice: 420,
    image: lowes,
    rating: 4.3,
    reviews: 1151,
    delivery: "Delivery in 2-3 Days, Friday, 27 June",
    stores: [
      {
        name: "Home Depot",
        logo: homedepot,
        location: "Niagara Falls #1287",
        distance: "0.1 mi",
        price: 369,
        listPrice: 420,
        savings: 51,
        offers: 3,
        inStock: 12,
      },
      {
        name: "Lowe's",
        logo: lowes,
        location: "Magenta Street #1287",
        distance: "0.1 mi",
        price: 420,
        listPrice: 420,
        savings: 0,
        offers: 0,
        inStock: 0,
      },
    ],
  },
];

const CompareProducts = () => {
  const [products] = useState(dummyProducts);

  const renderStars = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm text-gray-600 ml-1">{rating}/5</span>
      </div>
    );
  };
  const similarProducts = [
    {
      productId: 1,
      title:
        "Ryobi One+ 18V Lithium-Ion Hammer Drill with 2.0 Ah Battery, 4.0 Ah Battery, and Charger",
      rating: 4.5,
      listPrice: 129.99,
      price: 99.99,
      image: homedepot,
    },
    {
      productId: 2,
      title:
        "Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless Hammer Drill and Impact Driver Combo Kit (2-Tool) with 2 B",
      rating: 4.2,
      listPrice: 199.99,
      price: 149.99,
      image: homedepot,
    },
  ];

  return (
    <>
      <Navbar />
      <SearchBar />
      <div className="w-full max-w-7xl mx-auto p-4 bg-white">
        <div
          className="flex justify-between items-end pb-3 mb-8"
          style={{ borderBottom: "1px solid #ABA9A980" }}
        >
          {/* Left Section */}
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-bold text-black">Compare Products</h2>
            <span className="text-sm text-gray-500">
              {products.length} products added out to maximum 3
            </span>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-6 text-sm font-semibold">
            <button className="text-black hover:underline">Clear All</button>
            <button className="flex items-center gap-1 text-black hover:underline">
              Add Products <span className="text-lg leading-none">+</span>
            </button>
          </div>
        </div>

        {/* Product Header Comparison Section */}
        <div className="flex gap-6 mb-5 grid grid-cols-[250px_1fr_1fr]">
          {/* Filter Sidebar */}
          <div className="bg-[#523D96] text-white rounded-lg p-4 flex flex-col justify-between h-64">
            <h4 className="font-semibold text-sm">
              2.0 Ah Battery Operated
              <br />
              Hammer Drill
            </h4>
            <label className="flex items-center text-white text-sm space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox rounded-sm accent-white"
              />
              <span>Show differences only</span>
            </label>
          </div>

          {/* Product Compare Cards */}
          {products.map((product, index) => (
            <div
              key={index}
              className="flex-1 bg-white border border-gray-300 rounded-lg shadow-sm"
            >
              <div className="relative p-3">
                {/* Favorite icon */}
                <button className=" top-3 p-2 bg-[#E3E5FC] rounded-xl shadow-sm hover:shadow-md cursor-pointer">
                  <Heart className="w-5 h-5 text-black" />
                </button>

                {/* Remove icon */}
                <button className="absolute top-2 right-2 text-gray-600 hover:text-red-500">
                  ✕
                </button>

                {/* Image */}
                <div className="flex justify-center">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="h-28 object-contain"
                  />
                </div>

                {/* Title */}
                <p className="text-sm text-gray-800 mt-16 font-medium px-1">
                  {product.title}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Product Cards */}
        <div
          className="w-full border rounded-xl overflow-hidden bg-white"
          style={{ borderColor: "#5F43B2" }}
        >
          {/* Row: Available On */}
          <div className="grid grid-cols-[250px_1fr_1fr] divide-x divide-[#ABA9A9]">
            <div className="px-4 py-3 font-semibold text-sm text-black-700">
              Available On
            </div>
            {products.map((product, index) => (
              <div key={index} className="p-4 space-y-3">
                {product.stores.map((store, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-md bg-[#E3E5FC66] p-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <img
                          src={store.store === "Lowe's" ? lowes : homedepot}
                          alt="Store"
                          className="h-16 w-auto"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-bold">
                              ${store.price}
                            </span>
                            <span className="text-sm line-through text-[#757575]">
                              ${store.listPrice}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-green-600 text-xs font-medium">
                              Save ${store.savings.toFixed(2)}
                            </span>
                            <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded">
                              Lowest Price
                            </span>
                          </div>
                        </div>
                      </div>
                      {store.offers > 0 && (
                        <div
                          className="flex flex-col items-end text-xs"
                          style={{ color: "rgba(95, 67, 178, 1)" }}
                        >
                          <span className="flex items-center gap-1">
                            {store.offers} Offers
                            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                          </span>
                          <img
                            src={offericon} // make sure to import this at the top
                            alt="Offer icon"
                            className="mt-1 h-4"
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-black-700 mt-2">
                      <img
                        src={location}
                        alt="Location"
                        className="w-4 h-4 inline-block mr-2"
                      />
                      Nearby store:{" "}
                      <span className="text-blue-600 underline">
                        {store.location}
                      </span>{" "}
                      ({store.distance})
                    </div>
                    <div className="text-sm mt-1 flex items-center gap-1">
                      {store.inStock > 0 ? (
                        <>
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            style={{ color: '#0B4C0A' }}
                          />
                          <span className="text-green-600 font-semibold">
                            {store.inStock} in stock
                          </span>
                          <span className="">
                            for Pickup
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500">Out of Stock Now</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Row: Delivery */}
          <div className="grid grid-cols-[250px_1fr_1fr] divide-x border-t border-[#ABA9A9] divide-[#ABA9A9]">
            <div className="px-4 py-3 font-semibold text-sm text-black-700">
              Delivery
            </div>
            {products.map((product, i) => (
              <div
                key={i}
                className="px-4 py-3 text-sm text-black-700 flex items-center"
              >
                <div className="flex items-center space-x-1">
                  <span>{product.delivery}</span>
                  <img
                    src={informationCircle}
                    alt="Info"
                    className="w-3 h-3 object-contain"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Row: Reviews & Rating */}
          <div className="grid grid-cols-[250px_1fr_1fr] divide-x border-t border-[#ABA9A9] divide-[#ABA9A9]">
            <div className="px-4 py-3 font-semibold text-sm text-black-700">
              Reviews & Rating
            </div>
            {products.map((product, i) => (
              <div key={i} className="px-4 py-3 text-sm space-y-2">
                {product.stores.map((store, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="h-16 w-auto"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-black">{product.rating}/5</span>
                      <a
                        href="#"
                        className="text-blue-600 underline text-sm hover:opacity-80"
                      >
                        {product.reviews} Reviews
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-7 space-y-7 text-sm">
          {[
            {
              title: "Highlights",
              rows: ["Model", "Battery", "Return Policy"],
            },
            {
              title: "Dimensions",
              rows: [
                "Assembled Depth (in.)",
                "Assembled Width (in.)",
                "Assembled Height (in.)",
              ],
            },
            {
              title: "Details",
              rows: ["Model", "Battery", "Return Policy"],
            },
            {
              title: "Warranty/Certifications",
              rows: ["Model", "Battery", "Return Policy"],
            },
          ].map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h4 className="text-base font-semibold mb-2">{section.title}</h4>
              <table className="min-w-full border rounded-xl">
                <tbody>
                  {section.rows.map((rowLabel, rowIndex) => (
                    <tr key={rowIndex}>
                      <td
                        className="border px-4 py-2 font-medium text-gray-800 w-1/5"
                        style={{ backgroundColor: "#E3E5FC66" }}
                      >
                        {rowLabel}
                      </td>
                      {products.map((_, i) => (
                        <td key={i} className="border px-4 py-2 text-gray-700">
                          5000 MaH, 20 V
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-6 relative">
          <div className="flex items-center justify-end">
            <div className="overflow-hidden w-full">
              <div className="flex justify-end gap-4 max-w-[1000px] ml-auto transition-transform duration-300 ease-in-out">
                {similarProducts.map((product) => (
                  <div key={product.productId} className="px-2 w-[500px]">
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                      <div className="top-3 p-2 flex justify-center">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-28 object-contain"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">
                          {product.title}
                        </h3>
                        {renderStars(product.rating || 0)}

                        <div className="mt-2">
                          <div className="flex items-start justify-between">
                            {/* Store Logos */}
                            <div className="space-y-2">
                              <img src={lowes} alt="" className="h-5 w-auto" />
                              <img
                                src={homedepot}
                                alt=""
                                className="h-5 w-auto"
                              />
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-800">
                                ${product.listPrice}
                              </div>
                              <div className="text-lg font-bold text-gray-800">
                                ${product.price}
                              </div>
                              {product.listPrice && (
                                <div className="text-xs text-green-600 font-medium">
                                  Save $
                                  {Number(
                                    product.listPrice - product.price
                                  ).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <button className="mt-4 w-full bg-[#5F43B2] text-white py-2 rounded-full font-semibold hover:bg-[#4b3499] transition">
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CompareProducts;
