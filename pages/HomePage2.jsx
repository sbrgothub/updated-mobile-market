import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "../styles/HomePage.css";
import { FaSearch } from "react-icons/fa";
import banner1 from "../assets/banner1.jpg";
import banner2 from "../assets/banner2.jpg";
import banner3 from "../assets/banner3.jpg";
import banner4 from "../assets/banner4.jpg";

function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [shopkeepers, setShopkeepers] = useState([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a product name.");
      return;
    }
  
    try {
      const response = await fetch(`http://localhost:5000/search?query=${searchQuery}`);
      const data = await response.json();
  
      // ✅ Get user's current location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
  
          console.log(`✅ Customer Location: Lat=${userLat}, Lon=${userLon}`); // Debugging
          localStorage.setItem("customerLocation", JSON.stringify({ latitude: userLat, longitude: userLon }));
  
          // ✅ Filter shopkeepers within 200m
          const filteredShopkeepers = data.filter((shopkeeper) => {
            let storeLat, storeLon;
  
            // ✅ Extract latitude & longitude from storekeeper's location
            if (typeof shopkeeper.location === "string" && shopkeeper.location.includes("q=")) {
              const match = shopkeeper.location.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (match) {
                storeLat = parseFloat(match[1]);
                storeLon = parseFloat(match[2]);
              }
            } else if (shopkeeper.location && shopkeeper.location.latitude && shopkeeper.location.longitude) {
              storeLat = shopkeeper.location.latitude;
              storeLon = shopkeeper.location.longitude;
            } else {
              console.error("❌ Invalid storekeeper location:", shopkeeper.location);
              return false;
            }
  
            const distance = getDistance(userLat, userLon, storeLat, storeLon);
            console.log(`📍 Store: Lat=${storeLat}, Lon=${storeLon}, Distance=${distance}m`);
  
            return distance <= 200; // ✅ Show only shopkeepers within 200m
          });
  
          console.log("🛒 Available Shopkeepers:", filteredShopkeepers);
          setShopkeepers(filteredShopkeepers);
        },
        (error) => {
          console.error("❌ Error getting location:", error);
          alert("Please allow location access to search for nearby stores.");
        }
      );
    } catch (error) {
      console.error("❌ Error fetching shopkeepers:", error);
    }
  };
  
  // ✅ Function to Calculate Distance (Haversine Formula)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; // Distance in meters
  };
  
  

  const handleShopkeeperClick = async (shopkeeper) => {
    try {
      const response = await fetch(`http://localhost:5000/propage?storekeeperEmail=${shopkeeper.storekeeperEmail}`);
      const data = await response.json();

      console.log("Fetched data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch products");
      }

      alert("Fetched successfully");

      navigate("/product", { state: { products: data, shopkeeper } });
    } catch (error) {
      console.error("Error fetching products:", error);
      alert("Could not load products.");
    }
  };

  return (
    <div className="home-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <img src="/vite.svg" alt="Logo" className="nav-logo-img" />
        </div>
        <div className="nav-links">
          <a href="#" className="nav-link">Home</a>
          <a href="#" className="nav-link">Profile</a>
          <a href="#" className="nav-link">Settings</a>
        </div>
      </nav>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search for products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="search-button" onClick={handleSearch}>
          <FaSearch className="search-button-icon" />
        </button>
      </div>

      {/* Banner Section - Now with 4 Images Horizontally */}
      <div className="banner-container">
        <img src={banner1} alt="Banner 1" className="banner-image" />
        <img src={banner2} alt="Banner 2" className="banner-image" />
        <img src={banner3} alt="Banner 3" className="banner-image" />
        <img src={banner4} alt="Banner 4" className="banner-image" />
      </div>

     {/* Shopkeepers Display */}
<section className="shopkeepers-section">
  <h2 className="section-title">Available Shopkeepers</h2>
  {shopkeepers.length === 0 ? (
    <p>Search for: "{searchQuery}".</p>
  ) : (
    <div className="shopkeepers-container">
      {shopkeepers.map((shopkeeper) => (
        <div key={shopkeeper._id} className="shopkeeper-box">
          <h3>{shopkeeper.storekeeperName}</h3>
          <p>Store: {shopkeeper.name}</p>
          <button 
            className="shopkeeper-link" 
            onClick={() => handleShopkeeperClick(shopkeeper)}
          >
            View Products
          </button>
        </div>
      ))}
    </div>
  )}
</section>

    </div>
  );
}

export default HomePage;