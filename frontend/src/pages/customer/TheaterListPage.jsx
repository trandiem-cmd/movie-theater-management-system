
import React, { useCallback, useEffect, useRef, useState } from "react";
import ouluImage1 from "../../assets/oulu-theater-1.jpg";
import ouluImage2 from "../../assets/oulu-theater-2.jpg";
import tampereImage1 from "../../assets/tampere-theater-1.jpg";
import tampereImage2 from "../../assets/tampere-theater-2.jpg";
import "./TheaterListPage.css";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const LOCATION_API = `${API_BASE_URL}/api/locations`;

// Images mapped by city
const cityTheaterImages = {
  oulu: [ouluImage1, ouluImage2],
  tampere: [tampereImage1, tampereImage2],
};

const TheaterListPage = () => {
  const [cities, setCities] = useState([]);
  const [theaters, setTheaters] = useState([]);

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedTheaterId, setSelectedTheaterId] = useState("");

  const [theaterDetails, setTheaterDetails] = useState(null);
  const [rooms, setRooms] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("information");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingTheaters, setLoadingTheaters] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [error, setError] = useState("");

  const intervalRef = useRef(null);

  // Get images based on selected city
  const heroImages =
    cityTheaterImages[selectedCity.trim().toLowerCase()] ||
    [ouluImage1, ouluImage2];

  // Fetch helper
  const fetchAPI = async (url, signal) => {
    const response = await fetch(url, { signal });
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  };

  // 1. Fetch cities
  useEffect(() => {
    const controller = new AbortController();

    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        setError("");

        const data = await fetchAPI(
          `${LOCATION_API}/cities`,
          controller.signal
        );

        const cityList = data.cities || [];
        setCities(cityList);

        if (cityList.length > 0) {
          setSelectedCity(cityList[0]);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCities(false);
        }
      }
    };

    fetchCities();

    return () => controller.abort();
  }, []);

  // 2. Fetch theaters when city changes
  useEffect(() => {
    if (!selectedCity) return;

    const controller = new AbortController();

    const fetchTheaters = async () => {
      try {
        setLoadingTheaters(true);
        setError("");

        setTheaters([]);
        setSelectedTheaterId("");
        setTheaterDetails(null);
        setRooms([]);
        setCurrentIndex(0);
        setIsModalOpen(false);

        const data = await fetchAPI(
          `${LOCATION_API}/theaters?city=${encodeURIComponent(selectedCity)}`,
          controller.signal
        );

        const theaterList = data.theaters || [];

        setTheaters(theaterList);

        if (theaterList.length > 0) {
          setSelectedTheaterId(
            String(theaterList[0].theater_id)
          );
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingTheaters(false);
        }
      }
    };

    fetchTheaters();

    return () => controller.abort();
  }, [selectedCity]);

  // 3. Fetch theater details
  useEffect(() => {
    if (!selectedTheaterId) return;

    const controller = new AbortController();

    const fetchTheaterDetails = async () => {
      try {
        setLoadingDetails(true);
        setError("");
        setTheaterDetails(null);
        setCurrentIndex(0);

        const data = await fetchAPI(
          `${LOCATION_API}/theaters/${selectedTheaterId}`,
          controller.signal
        );

        setTheaterDetails(data.theater);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingDetails(false);
        }
      }
    };

    fetchTheaterDetails();

    return () => controller.abort();
  }, [selectedTheaterId]);

  // 4. Fetch rooms by theater
  useEffect(() => {
    if (!selectedTheaterId) return;

    const controller = new AbortController();

    const fetchRooms = async () => {
      try {
        setLoadingRooms(true);
        setRooms([]);

        const data = await fetchAPI(
          `${LOCATION_API}/theaters/${selectedTheaterId}/rooms`,
          controller.signal
        );

        setRooms(data.rooms || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingRooms(false);
        }
      }
    };

    fetchRooms();

    return () => controller.abort();
  }, [selectedTheaterId]);

  // 5. Carousel controls
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % 2);
  }, []);

  const previousSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + 2) % 2);
  }, []);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // 6. Carousel auto-play
  useEffect(() => {
    if (!selectedTheaterId) return;

    setCurrentIndex(0);

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 2);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedTheaterId]);

  // 7. Handle city change
  const handleCityChange = (event) => {
    setSelectedCity(event.target.value);
  };

  // 8. Handle theater change
  const handleTheaterChange = (event) => {
    setSelectedTheaterId(event.target.value);
    setCurrentIndex(0);
    setIsModalOpen(false);
  };

  const selectedTheater = theaters.find(
    (theater) =>
      String(theater.theater_id) === selectedTheaterId
  );

  // 9. Modal controls
  const openDetailsModal = () => {
    setActiveTab("information");
    setIsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsModalOpen(false);
  };

  // Close modal with Escape
  useEffect(() => {
    if (!isModalOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeDetailsModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  return (
    <main className="theater-page">
        <div className="theater-top-layout">
        {/* PAGE HEADER */}
        <section className="theater-page-header">
            <div>
            <span className="theater-eyebrow">
                DISCOVER YOUR CINEMA
            </span>
            <p>
                Find your nearest cinema and discover the perfect
                place to enjoy your favorite movies.
            </p>
            </div>
        </section>

        {/* CITY AND THEATER SELECTOR */}
        <section className="theater-selector">
            <div className="selector-group">
            <label htmlFor="city-select">
                Select City
            </label>
            <select
                id="city-select"
                value={selectedCity}
                onChange={handleCityChange}
                disabled={loadingCities || cities.length === 0}
            >
                <option value="">
                {loadingCities
                    ? "Loading cities..."
                    : "Choose a city"}
                </option>

                {cities.map((city) => (
                <option key={city} value={city}>
                    {city}
                </option>
                ))}
            </select>
            </div>

            <div className="selector-group">
            <label htmlFor="theater-select">
                Select Theater
            </label>

            <select
                id="theater-select"
                value={selectedTheaterId}
                onChange={handleTheaterChange}
                disabled={loadingTheaters || theaters.length === 0}
            >
                <option value="">
                {loadingTheaters
                    ? "Loading theaters..."
                    : "Choose a theater"}
                </option>

                {theaters.map((theater) => (
                <option
                    key={theater.theater_id}
                    value={theater.theater_id}
                >
                    {theater.name}
                </option>
                ))}
            </select>
            </div>

        </section>
        </div>
      {/* ERROR MESSAGE */}
      {error && (
        <div className="theater-error" role="alert">
          {error}

          <button
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* LOADING DETAILS */}
      {loadingDetails && (
        <div className="theater-loading">
          <div className="theater-spinner" />
          <p>Loading cinema information...</p>
        </div>
      )}

      {!loadingDetails && theaterDetails && (
        <>

          {/* HERO CAROUSEL */}
          <section className="theater-hero">

            <div className="hero-image-wrapper">

              {heroImages.map((image, index) => (
                <div
                  key={`${selectedCity}-${index}`}
                  className={`hero-slide ${
                    currentIndex === index ? "active" : ""
                  }`}
                >
                  <img
                    src={image}
                    alt={`${theaterDetails.name} - Image ${index + 1}`}
                  />
                </div>
              ))}

              <div className="hero-overlay" />

              {/* HERO CONTENT */}
              <div className="hero-content">

                <span className="hero-label">
                  WELCOME TO OUR CINEMA
                </span>
                <h2>{theaterDetails.name}</h2>
                <p>
                  Address: {theaterDetails.address}
                </p>
                <p>
                  Phone: {theaterDetails.phone}
                </p>
                <button
                  className="cinema-details-link"
                  onClick={openDetailsModal}
                >
                  Cinema Details →  
                </button>

              </div>

              {/* PREVIOUS */}
              <button
                className="carousel-arrow carousel-prev"
                onClick={previousSlide}
                aria-label="Previous image"
              >
                &#10094;
              </button>

              {/* NEXT */}
              <button
                className="carousel-arrow carousel-next"
                onClick={nextSlide}
                aria-label="Next image"
              >
                &#10095;
              </button>

              {/* DOTS */}
              <div className="carousel-dots">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    className={`carousel-dot ${
                      currentIndex === index ? "active" : ""
                    }`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to image ${index + 1}`}
                    aria-current={
                      currentIndex === index ? "true" : undefined
                    }
                  />
                ))}
              </div>

            </div>

          </section>


        </>
      )}

      {/* EMPTY THEATER */}
      {!loadingTheaters &&
        selectedCity &&
        theaters.length === 0 && (
          <div className="theater-empty">
            <span>⌖</span>
            <h2>No theaters found</h2>
            <p>
              There are currently no active theaters in this city.
            </p>
          </div>
        )}

      {/* THEATER DETAILS MODAL */}
      {isModalOpen && theaterDetails && (
        <div
          className="theater-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetailsModal();
            }
          }}
        >

          <div
            className="theater-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="theater-modal-title"
          >

            {/* MODAL HEADER */}
            <div className="modal-header">

              <div>
                <span className="theater-eyebrow">
                  CINEMA DETAILS
                </span>

                <h2 id="theater-modal-title">
                  {theaterDetails.name}
                </h2>
              </div>

              <button
                className="modal-close-button"
                onClick={closeDetailsModal}
                aria-label="Close modal"
              >
                ×
              </button>

            </div>

            {/* MODAL TABS */}
            <div className="modal-tabs">

              <button
                className={
                  activeTab === "information" ? "active" : ""
                }
                onClick={() => setActiveTab("information")}
              >
                Theater Information
              </button>

              <button
                className={
                  activeTab === "rooms" ? "active" : ""
                }
                onClick={() => setActiveTab("rooms")}
              >
                Auditoriums

                <span className="room-count">
                  {rooms.length}
                </span>
              </button>

            </div>

            {/* MODAL BODY */}
            <div className="modal-body">

              {/* THEATER INFORMATION TAB */}
              {activeTab === "information" && (
                <div className="modal-information">
                  <div className="modal-info-item">
                      <p>
                        Address: {theaterDetails.address || "Not available"}
                      </p>
                       <p>
                        Phone: {theaterDetails.phone || "Not available"}
                      </p>
                      <p>
                        Email: {theaterDetails.email || ""}
                      </p>            
                  </div>
                  <div className="modal-description">
                    <span className="info-label">
                      DESCRIPTION
                    </span>

                    <p>
                      {theaterDetails.description ||
                        "No description available."}
                    </p>
                  </div>

                </div>
              )}

              {/* ROOMS TAB */}
              {activeTab === "rooms" && (
                <div className="rooms-content">

                  {loadingRooms ? (
                    <div className="rooms-loading">
                      <div className="theater-spinner" />
                      <p>Loading rooms...</p>
                    </div>
                  ) : rooms.length > 0 ? (
                    <>

                      <div className="rooms-heading">
                        <div>
                          <h3>Available Rooms</h3>

                          <p>
                            {rooms.length} rooms in this theater
                          </p>
                        </div>
                      </div>

                      <div className="rooms-list">

                        {rooms.map((room) => (
                          <div
                            className="room-card"
                            key={room.room_id}
                          >

                            <div className="room-details">
                              <h4>{room.name}</h4>
                              <p>Screening Room</p>
                            </div>

                            <div className="room-capacity">
                              <div>
                                <strong>{room.capacity}</strong>
                                <span>Seats</span>
                              </div>
                            </div>

                          </div>
                        ))}

                      </div>

                    </>
                  ) : (
                    <div className="rooms-empty">
                      <span>▣</span>
                      <h3>No rooms available</h3>

                      <p>
                        This theater currently has no active rooms.
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* MODAL FOOTER */}
            <div className="modal-footer">
              <button onClick={closeDetailsModal}>
                Close
              </button>
            </div>

          </div>

        </div>
      )}

    </main>
  );
};

export default TheaterListPage;