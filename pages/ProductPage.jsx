import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import "../styles/ProductPage.css";

// ✅ Import product images
import grocImg from "../assets/groc.jpg";
import appleImg from "../assets/apple.jpg";
import mangoImg from "../assets/mango.jpg";
import vegImg from "../assets/veg.jpg";

const ProductPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { products: initialProducts, shopkeeper } = location.state || { products: [], shopkeeper: null };

  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState({});

  useEffect(() => {
    if (!initialProducts.length && shopkeeper) {
      fetch(`http://localhost:5000/propage?storekeeperEmail=${shopkeeper.storekeeperEmail}`)
        .then((res) => res.json())
        .then((data) => setProducts(data))
        .catch((error) => console.error("Error fetching products:", error));
    }
  }, [shopkeeper, initialProducts]);

  const getProductImage = (productName) => {
    const name = productName.toLowerCase();
    if (name.includes("grocery")) return grocImg;
    if (name.includes("apple")) return appleImg;
    if (name.includes("mango")) return mangoImg;
    if (name.includes("vegetable") || name.includes("vegetables")) return vegImg;
    return "/images/default.jpg";
  };

  const handleIncrease = (product) => {
    if (cart[product._id] >= product.stock) {
      alert("Not enough stock available!");
      return;
    }
    setCart((prevCart) => ({
      ...prevCart,
      [product._id]: (prevCart[product._id] || 0) + 1,
    }));
  };

  const handleDecrease = (product) => {
    if (cart[product._id] > 0) {
      setCart((prevCart) => ({
        ...prevCart,
        [product._id]: prevCart[product._id] - 1,
      }));
    }
  };

  const handleBook = async () => {
    if (Object.keys(cart).length === 0 || Object.values(cart).every((qty) => qty === 0)) {
      alert("Please add products to the cart before booking.");
      return;
    }
  
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.email) {
      alert("User not found. Please log in again.");
      return;
    }
  
    // ✅ Retrieve customer location stored from handleSearch()
    let customerLocation = JSON.parse(localStorage.getItem("customerLocation"));
  
    console.log("📍 Debugging Customer Location:", customerLocation); // ✅ Debugging output
  
    if (!customerLocation || !customerLocation.latitude || !customerLocation.longitude) {
      alert("Customer location not available. Please search for stores first.");
      return;
    }
  
    let allProductsAvailable = true;
    const newBookings = Object.keys(cart).map((productId) => {
      const product = products.find((p) => p._id === productId);
      if (!product) return null;
  
      if (product.stock <= 0) {
        alert(`🚫 Booking failed! ${product.name} is out of stock.`);
        allProductsAvailable = false;
        return null;
      }
  
      return {
        productId,
        customerEmail: user.email,
        storekeeperEmail: product.storekeeperEmail,
        productName: product.name,
        quantity: cart[productId],
        location: {
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude
        }
      };
    }).filter(Boolean);
  
    if (!allProductsAvailable) return;
  
    console.log("📦 Sending Booking Data:", newBookings); // ✅ Debugging output
  
    try {
      const response = await fetch("http://localhost:5000/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: newBookings }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Booking failed:", errorData);
        throw new Error(errorData.message || "Failed to book products");
      }
  
      // ✅ Save booking details in `localStorage`
      const previousBookings = JSON.parse(localStorage.getItem("bookedItems")) || [];
      localStorage.setItem("bookedItems", JSON.stringify([...previousBookings, ...newBookings])); 
  
      alert("✅ Booking successful!");
      setCart({});
      window.dispatchEvent(new Event("storage")); // ✅ Notify Storekeeper Page
  
      // ✅ Fetch updated stock after booking
      fetchUpdatedProducts();
  
    } catch (error) {
      console.error("❌ Error booking products:", error);
      alert(error.message);
    }
  };
  
  // ✅ Function to refresh product stock after booking
  const fetchUpdatedProducts = async () => {
    try {
      const response = await fetch(`http://localhost:5000/propage?storekeeperEmail=${shopkeeper.storekeeperEmail}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("❌ Error fetching updated products:", error);
    }
  };
  

  return (
    <div className="product-page">
      <h1>{shopkeeper ? `${shopkeeper.storekeeperName}'s Products` : "Products"}</h1>
      <button onClick={() => navigate("/")}>Back to Home</button>

      <div className="product-list">
        {products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          products.map((product) => {
            // ✅ Ensure product location is properly formatted
            let locationUrl = product.location;
            if (product.location && typeof product.location === "object") {
              locationUrl = `https://www.google.com/maps?q=${product.location.latitude},${product.location.longitude}`;
            }

            return (
              <div key={product._id} className="product-item">
                <img src={getProductImage(product.name)} alt={product.name} className="product-image" />
                <div className="product-details">
                  <h3>{product.name}</h3>
                  <p className="price">₹{product.price}</p>
                  <p className="stock">Stock: {product.stock}</p>

                  <div className="cart-controls">
                    <button onClick={() => handleDecrease(product)} disabled={!cart[product._id]}>-</button>
                    <span>{cart[product._id] || 0}</span>
                    <button onClick={() => handleIncrease(product)}>+</button>
                  </div>

                  {/* ✅ Fixed View Location Button */}
                  {locationUrl ? (
                    <p>
                      <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="view-location-link">
                        View Location
                      </a>
                    </p>
                  ) : (
                    <p>No location available</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button className="book-btn" onClick={handleBook}>Book Now</button>
    </div>
  );
};

export default ProductPage;
