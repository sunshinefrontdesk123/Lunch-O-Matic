import { useState, useEffect, useRef } from 'react';
import DinerFrame from './components/DinerFrame/DinerFrame';
import SlotMachine from './components/SlotMachine/SlotMachine';
import { fetchRestaurants, getCategories } from './services/restaurantService';
import { Utensils, MapPin, Star } from 'lucide-react';
import spinSound from './assets/musicfx-dj-1767805169902.ogg';
import './App.css';

function App() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCravingModal, setShowCravingModal] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio(spinSound);
  }, []);

  useEffect(() => {
    if (spinning) {
      audioRef.current?.play().catch(e => console.error("Audio play failed", e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [spinning]);

  useEffect(() => {
    setCategories(getCategories());
  }, []);

  const handleSpin = async () => {
    if (spinning) return;

    setResult(null);
    setLocationError(null); // Clear previous errors

    // 1. Get Location
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setSpinning(true);
    setRestaurants([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const items = await fetchRestaurants({ lat: latitude, lng: longitude }, selectedCategory);
          setRestaurants(items);

          // Spin for 3 seconds
          setTimeout(() => {
            const winner = items[Math.floor(Math.random() * items.length)];
            setResult(winner);
            setSpinning(false);
          }, 3000);

        } catch (err) {
          console.error(err);
          setLocationError(err.message); // Show the specific error (e.g., "No places found")
          setSpinning(false);
        }
      },
      (error) => {
        console.error("Geo Error:", error);
        let msg = "Unable to retrieve your location.";
        if (error.code === 1) msg = "Location access denied. Please enable permission.";
        setLocationError(msg);
        setSpinning(false);
      }
    );
  };

  return (
    <DinerFrame title="Lunch-O-Matic">
      <div className="control-panel">
        <label className="panel-label">1. Pick a Craving:</label>
        <button
          className="craving-trigger"
          onClick={() => setShowCravingModal(true)}
        >
          {selectedCategory ? (
            <>
              <Utensils size={20} />
              <span className="trigger-text">{selectedCategory}</span>
            </>
          ) : (
            <>
              <Star size={20} />
              <span className="trigger-text">Any Craving</span>
            </>
          )}
          <span className="trigger-arrow">▼</span>
        </button>
      </div>

      {showCravingModal && (
        <div className="craving-modal-overlay" onClick={() => setShowCravingModal(false)}>
          <div className="craving-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select a Craving</h3>
              <button className="modal-close" onClick={() => setShowCravingModal(false)}>×</button>
            </div>
            <div className="category-grid">
              <button
                className={`category-btn ${selectedCategory === null ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(null);
                  setShowCravingModal(false);
                }}
              >
                <Star size={16} /> Any
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowCravingModal(false);
                  }}
                >
                  <Utensils size={16} /> {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


      <div className="slot-stage">
        {locationError ? (
          <div className="error-message">
            ⚠️ {locationError}
          </div>
        ) : (
          <SlotMachine
            options={restaurants.length > 0 ? restaurants : ["Ready", "Set", "Spin!"]}
            spinning={spinning}
          />
        )}

        {result && !spinning && (
          <div className="winner-display">
            <div className="winner-label">Let's Eat At:</div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="winner-link"
            >
              <div className="winner-name">{result}</div>
            </a>
            <div className="winner-location"><MapPin size={16} /> Click to Open Maps</div>
          </div>
        )}
      </div>

      <div className="action-area">
        <button
          className={`spin-btn ${spinning ? 'disabled' : ''}`}
          onClick={handleSpin}
          disabled={spinning}
        >
          {spinning ? 'Searching & Spinning...' : 'SPIN THE WHEEL'}
        </button>
      </div>
    </DinerFrame >
  );
}

export default App;
