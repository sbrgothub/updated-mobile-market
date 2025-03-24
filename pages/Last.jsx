import React, { useState, useEffect } from "react";
import "../styles/Last.css"; // ✅ Import CSS for styling

const Last = () => {
  const [bookedItems, setBookedItems] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || user.userType !== "storekeeper") {
      alert("You must be logged in as a storekeeper to view bookings.");
      return;
    }

    // ✅ Function to fetch bookings from `localStorage`
    const fetchBookings = () => {
      const allBookings = JSON.parse(localStorage.getItem("bookedItems")) || [];
      const filteredBookings = allBookings.filter(
        (item) => item.storekeeperEmail === user.email
      );

      setBookedItems(filteredBookings);
    };

    fetchBookings();
    window.addEventListener("storage", fetchBookings); // ✅ Auto-update on new bookings

    return () => {
      window.removeEventListener("storage", fetchBookings);
    };
  }, []);

  // ✅ Function to delete a booking entry
  const handleDelete = (index) => {
    if (!window.confirm("Are you sure you want to delete this booking?")) return;

    const updatedBookings = bookedItems.filter((_, i) => i !== index);
    setBookedItems(updatedBookings);

    // ✅ Update localStorage by removing only the deleted booking
    const allBookings = JSON.parse(localStorage.getItem("bookedItems")) || [];
    const updatedAllBookings = allBookings.filter((item) => item !== bookedItems[index]);

    localStorage.setItem("bookedItems", JSON.stringify(updatedAllBookings));
    window.dispatchEvent(new Event("storage")); // ✅ Trigger update for other pages
  };

  return (
    <div className="last-page">
      <h1 className="title">📌 Your Product Booking Details</h1>
      {bookedItems.length === 0 ? (
        <p className="no-bookings">No bookings for your products.</p>
      ) : (
        <div className="table-container">
          <table className="booking-table">
            <thead>
              <tr>
                <th>📧 Customer Email</th>
                <th>📦 Product Name</th>
                <th>🔢 Quantity</th>
                <th>📍 Customer Location</th> {/* ✅ Show customer location */}
                <th>❌ Action</th>
              </tr>
            </thead>
            <tbody>
              {bookedItems.map((item, index) => {
                // ✅ Debugging location data
                console.log("📍 Debugging Location:", item.location);

                // ✅ Fix issue where `location` might not be a valid Google Maps link
                let locationUrl = "";
                if (item.location && typeof item.location === "object" && item.location.latitude && item.location.longitude) {
                  locationUrl = `https://www.google.com/maps?q=${item.location.latitude},${item.location.longitude}`;
                }

                return (
                  <tr key={index}>
                    <td>{item.customerEmail}</td>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>
                      {locationUrl ? (
                        <a
                          href={locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-location-link"
                        >
                          View Location
                        </a>
                      ) : (
                        <span>Location not available</span>
                      )}
                    </td>
                    <td>
                      <button className="delete-btn" onClick={() => handleDelete(index)}>
                        ❌ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Last;
