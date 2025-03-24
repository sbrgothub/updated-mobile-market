import React, { useState, useEffect } from "react";
import "../App.css";
import "../styles/Storekeeper_home.css";

const Storekeeper_home = () => {
  const [products, setProducts] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [location, setLocation] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    stock: "",
    location: "",
    storekeeperEmail: "",
    storekeeperName: "",
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.email) {
      console.error("User not found in localStorage");
      return;
    }
  
    setNewProduct((prev) => ({
      ...prev,
      storekeeperEmail: user.email,
      storekeeperName: user.name || "Storekeeper",
    }));
  
    // ✅ Function to fetch products from MongoDB
    const fetchProducts = async () => {
      try {
        const response = await fetch(`http://localhost:5000/products?storekeeperEmail=${user.email}`);
        const data = await response.json();
        setProducts(data.filter((p) => p.stock > 0)); // ✅ Remove out-of-stock items
      } catch (error) {
        console.error("❌ Error fetching products:", error);
      }
    };
  
    fetchProducts(); // ✅ Initial fetch when page loads
  
    // ✅ Listen for stock updates from `localStorage`
    const handleStockUpdate = () => fetchProducts();
    window.addEventListener("storage", handleStockUpdate); // ✅ Detects changes in stock data
  
    // ✅ Function to update live location
    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const liveLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setLocation(liveLink);
  
          // ✅ Send live location to backend
          fetch("http://localhost:5000/update-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, location: liveLink }),
          });
        },
        (error) => console.error("❌ Error getting location:", error),
        { enableHighAccuracy: true }
      );
    };
  
    updateLocation(); // ✅ Get initial location
    const interval = setInterval(updateLocation, 2000); // ✅ Update every 2 seconds
  
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStockUpdate);
    };
  }, []);
  

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      alert("⚠️ Please fill all required fields.");
      return;
    }

    // Ensure product has updated live location
    const updatedProduct = {
      ...newProduct,
      location: location, // ✅ Attach latest live location
    };

    fetch("http://localhost:5000/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProduct),
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "❌ Failed to add product");
        }

        return data;
      })
      .then((data) => {
        setProducts((prevProducts) => [...prevProducts, data.product]);
        setShowAddProduct(false);
        setNewProduct({
          name: "",
          price: "",
          stock: "",
          location: "",
          storekeeperEmail: newProduct.storekeeperEmail,
          storekeeperName: newProduct.storekeeperName,
        });

        alert("✅ Product added successfully!");
      })
      .catch((error) => {
        console.error("❌ Error adding product:", error);
        alert(`❌ ${error.message}`); // Show error message instead of black screen
      });
  };

  const handleDeleteProduct = (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    fetch(`http://localhost:5000/products/${productId}`, {
      method: "DELETE",
    })
      .then(() => {
        setProducts((prevProducts) => prevProducts.filter((product) => product._id !== productId));
      })
      .catch((error) => console.error("Error deleting product:", error));
  };

  return (
    <div className="storekeeper-page">
      <div className="storekeeper-header">
        <h1>Storekeeper Dashboard</h1>
        <button className="add-product-btn" onClick={() => setShowAddProduct(true)}>
          Add New Product
        </button>
      </div>

      {/* ✅ Display Live Location */}
      <p>
        <a href={location} target="_blank" rel="noopener noreferrer" className="view-location-link">
          View Live Location
        </a>
      </p>

      {/* ✅ "View Book" Button */}
      <button className="view-book-btn" onClick={() => window.location.href = "/last"}>
        View Book
      </button>

      {/* ✅ Product Management */}
      <div className="product-management">
        <h2>Product Inventory</h2>
        <div className="product-list scrollable-list">
          {products.length === 0 ? (
            <p>No products added yet.</p>
          ) : (
            products.map((product) => (
              <div key={product._id} className="product-item">
                <div className="product-details">
                  <h3>{product.name}</h3>
                  <p className="price">₹{product.price}</p>
                  <p className="stock">Stock: {product.stock}</p>

                  {/* ✅ Display Live Location per Product */}
                  <p>
                    <a href={product.location} target="_blank" rel="noopener noreferrer" className="view-location-link">
                      View Product Location
                    </a>
                  </p>

                  <button className="delete-btn" onClick={() => handleDeleteProduct(product._id)}>
                    Delete Product
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ✅ Product Add Form */}
      {showAddProduct && (
        <div className="overlay">
          <div className="overlay-content">
            <h2>Add New Product</h2>
            <div className="form-group">
              <label>Product Name:</label>
              <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Enter product name" />
            </div>

            <div className="form-group">
              <label>Price (₹):</label>
              <input type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="Enter price" />
            </div>

            <div className="form-group">
              <label>Stock:</label>
              <input type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} placeholder="Enter stock quantity" />
            </div>

            <div className="form-actions">
              <button className="save-btn" onClick={handleAddProduct}>Save</button>
              <button className="cancel-btn" onClick={() => setShowAddProduct(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Storekeeper_home;

