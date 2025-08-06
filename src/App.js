import { useEffect, useState, useCallback, useRef } from 'react';
// We'll use PapaParse for CSV parsing
import Papa from 'papaparse';
import StatisticsPage from './StatisticsPage';
import { arrayToCsv, downloadCsv } from './csvUtils';

const CSV_URL = process.env.PUBLIC_URL + '/selected_boardgames_2023.csv';

function App() {
  const [games, setGames] = useState([]);
  const [current, setCurrent] = useState(0);
  const playedRef = useRef({}); // { id: true/false or rating number }
  const [rating, setRating] = useState('');
  const [, forceUpdate] = useState(0); // dummy state to force re-render
  const [loading, setLoading] = useState(true);
  const [showStatistics, setShowStatistics] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load CSV on mount
  useEffect(() => {
    fetch(CSV_URL)
      .then(res => res.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setGames(results.data);
            setLoading(false);
          }
        });
      });
  }, []);

  // Handle upload of played_boardgames.csv to recover progress
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      Papa.parse(event.target.result, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Map: { ID: Played }
          const playedMap = {};
          results.data.forEach(row => {
            if (row.ID) {
              if (row.Played === 'No') playedMap[row.ID] = false;
              else if (row.Played === 'Yes') playedMap[row.ID] = true;
              else if (!isNaN(Number(row.Played)) && row.Played !== '') playedMap[row.ID] = Number(row.Played);
            }
          });
          Object.assign(playedRef.current, playedMap);
          forceUpdate(u => u + 1);
          alert('Progress recovered from uploaded file!');
        }
      });
    };
    reader.readAsText(file);
  };

  // Keyboard handler for direct number typing
  const handleKeyDown = useCallback((e) => {
    if (loading || games.length === 0) return;
    // Ignore keyboard events when focus is on an input element
    if (e.target.tagName.toLowerCase() === 'input') return;
    
    // If number or dot, update rating
    if ((/^[0-9]$/.test(e.key) && rating.length < 4) || (e.key === '.' && !rating.includes('.'))) {
      setRating(r => (e.key === '.' && r === '' ? '0.' : r + e.key));
      e.preventDefault();
    }
    // Backspace: remove last char or record as unplayed if empty
    else if (e.key === 'Backspace') {
      if (rating.length > 0) {
        setRating(r => r.slice(0, -1));
      } else {
        playedRef.current[games[current].ID] = false;
        setRating('');
        setCurrent(c => {
          const next = Math.min(c + 1, games.length - 1);
          forceUpdate(u => u + 1);
          return next;
        });
      }
      e.preventDefault();
    }
    // Enter: record as played with rating
    else if (e.key === 'Enter') {
      if (rating.trim() !== '' && !isNaN(Number(rating))) {
        playedRef.current[games[current].ID] = Number(rating);
      } else {
        playedRef.current[games[current].ID] = true;
      }
      setRating('');
      setCurrent(c => {
        const next = Math.min(c + 1, games.length - 1);
        forceUpdate(u => u + 1);
        return next;
      });
      e.preventDefault();
    }
  }, [current, games, loading, rating]);

  // Search functionality
  const handleSearch = useCallback((query) => {
    if (!query.trim() || games.length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results = games
      .map((game, index) => ({
        ...game,
        index,
        score: getSearchScore(game, normalizedQuery)
      }))
      .filter(game => game.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Show top 8 results

    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, [games]);

  const getSearchScore = (game, query) => {
    const name = game.Name.toLowerCase();
    const year = game.Year?.toString() || '';
    
    // Exact match gets highest score
    if (name === query) return 100;
    
    // Starts with query gets high score
    if (name.startsWith(query)) return 90;
    
    // Contains query gets medium score
    if (name.includes(query)) return 70;
    
    // Year match gets medium score
    if (year === query) return 60;
    
    // Fuzzy match - check if all characters of query appear in order
    let queryIndex = 0;
    for (let i = 0; i < name.length && queryIndex < query.length; i++) {
      if (name[i] === query[queryIndex]) {
        queryIndex++;
      }
    }
    if (queryIndex === query.length) return 40;
    
    return 0;
  };

  const jumpToGame = (gameIndex) => {
    setCurrent(gameIndex);
    setRating('');
    setSearchQuery('');
    setShowSearchResults(false);
    forceUpdate(u => u + 1);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300); // Debounce search
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);


  // Preload images with priority loading for next/previous
  const imageCache = useRef({});
  const [imageLoading, setImageLoading] = useState(true);
  
  // Enhanced image preloading system
  const preloadWindowSize = 5; // Number of images to keep loaded in each direction
  const [preloadedImages, setPreloadedImages] = useState(new Set());

  // Add preconnect link for faster image loading
  useEffect(() => {
    // Add preconnect for the image domain
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://cf.geekdo-images.com';
    document.head.appendChild(link);

    // Add DNS prefetch as fallback
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = 'https://cf.geekdo-images.com';
    document.head.appendChild(dnsPrefetch);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(dnsPrefetch);
    };
  }, []);

  // Aggressive preloading system
  useEffect(() => {
    if (games.length === 0) return;

    const currentUrl = games[current].ImageURL;
    const newPreloadedImages = new Set(preloadedImages);
    
    // Function to preload a single image
    const preloadImage = (url, isPriority = false) => {
      if (!imageCache.current[url] && !newPreloadedImages.has(url)) {
        const img = new window.Image();
        
        // Set high priority loading for nearby images
        img.loading = isPriority ? 'eager' : 'lazy';
        img.decoding = isPriority ? 'sync' : 'async';
        if (isPriority) img.fetchPriority = 'high';

        img.onload = () => {
          imageCache.current[url] = img;
          newPreloadedImages.add(url);
          if (url === currentUrl) {
            setImageLoading(false);
          }
        };

        img.onerror = () => {
          if (url === currentUrl) {
            setImageLoading(false);
          }
        };

        // Start loading
        img.src = url;
      }
    };

    // Calculate the range of images to preload
    const start = Math.max(0, current - preloadWindowSize);
    const end = Math.min(games.length - 1, current + preloadWindowSize);
    
    // Immediately check if current image is cached
    setImageLoading(!imageCache.current[currentUrl]?.complete);

    // Preload images in order of priority
    const preloadOrder = [
      current,      // Current
      current + 1,  // Next
      current - 1,  // Previous
      current + 2,  // Next + 1
      current - 2,  // Previous - 1
      ...Array.from({length: preloadWindowSize * 2 + 1}, (_, i) => current - preloadWindowSize + i)
        .filter(i => i >= start && i <= end && i !== current)
    ];

    // Execute preloading with priority
    preloadOrder
      .filter((index, pos, arr) => 
        index >= 0 && 
        index < games.length && 
        arr.indexOf(index) === pos
      )
      .forEach((index, priority) => {
        const url = games[index].ImageURL;
        const isPriority = priority < 3; // First three images are high priority
        requestAnimationFrame(() => preloadImage(url, isPriority));
      });

    // Update preloaded images set
    setPreloadedImages(newPreloadedImages);

    // Cleanup images outside the window
    const maxCache = preloadWindowSize * 4;
    const cacheKeys = Object.keys(imageCache.current);
    if (cacheKeys.length > maxCache) {
      const keepRange = games
        .slice(Math.max(0, current - preloadWindowSize), current + preloadWindowSize + 1)
        .map(g => g.ImageURL);
      cacheKeys
        .filter(url => !keepRange.includes(url))
        .forEach(url => delete imageCache.current[url]);
    }
  }, [games, current, preloadedImages]);

  if (loading) return <div>Loading games...</div>;
  if (games.length === 0) return <div>No games found.</div>;
  
  if (showStatistics) {
    return (
      <StatisticsPage 
        onBack={() => setShowStatistics(false)} 
        playedGames={playedRef.current}
        onRatingChange={(gameId, newRating) => {
          playedRef.current[gameId] = newRating;
          forceUpdate(u => u + 1); // Force a re-render to sync state
        }}
      />
    );
  }
  
  const game = games[current];

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          padding: '2.5rem 2.5rem 2rem 2.5rem',
          maxWidth: 420,
          width: '100%',
          margin: '2rem 0',
          textAlign: 'center',
          position: 'relative',
          transition: 'box-shadow 0.2s',
        }}>
          {/* Upload button for recovering progress */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500, color: '#6366f1', cursor: 'pointer' }}>
              <span style={{ marginRight: 8 }}>Recover Progress:</span>
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleUpload} />
              <span style={{
                background: '#e0e7ff',
                color: '#6366f1',
                padding: '0.3rem 0.8rem',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: '1rem',
                border: '1px solid #6366f1',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s'
              }}>Upload CSV</span>
            </label>
          </div>

          {/* Search functionality */}
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontWeight: 500, color: '#6366f1' }}>🔍 Quick Search:</span>
              <input
                type="text"
                placeholder="Type game name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: 6,
                  border: '1px solid #6366f1',
                  fontSize: '0.9rem',
                  width: '200px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                border: '1px solid #e0e7ff',
                zIndex: 1000,
                maxHeight: '300px',
                overflowY: 'auto',
                width: '320px'
              }}>
                {searchResults.map((game, index) => (
                  <div
                    key={game.ID}
                    onClick={() => jumpToGame(game.index)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: index < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                  >
                    <img
                      src={game.Thumbnail}
                      alt={game.Name}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 6,
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{
                        fontWeight: 600,
                        color: '#2d3748',
                        fontSize: '0.9rem',
                        marginBottom: '2px'
                      }}>
                        {game.Name}
                      </div>
                      <div style={{
                        color: '#64748b',
                        fontSize: '0.8rem'
                      }}>
                        {game.Year} • #{game.index + 1} of {games.length}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: playedRef.current[game.ID] === false 
                        ? '#f59e42' 
                        : playedRef.current[game.ID] === true 
                          ? '#10b981' 
                          : typeof playedRef.current[game.ID] === 'number' 
                            ? '#6366f1' 
                            : '#9ca3af',
                      fontWeight: 500
                    }}>
                      {playedRef.current[game.ID] === false
                        ? 'Unplayed'
                        : typeof playedRef.current[game.ID] === 'number'
                          ? `★ ${playedRef.current[game.ID]}`
                          : playedRef.current[game.ID] === true
                            ? 'Played'
                            : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            marginBottom: 12,
            letterSpacing: 1,
            color: '#2d3748',
            textShadow: '0 2px 8px #e0e7ff'
          }}>{game.Name} <span style={{fontWeight: 400, color: '#6366f1'}}>({game.Year})</span></h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            position: 'relative',
            width: 340,
            height: 340,
            margin: '0 auto',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 16,
              overflow: 'hidden',
              background: '#f1f5f9',
            }}>
              {Object.entries(imageCache.current).map(([url]) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: url === game.ImageURL ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    boxShadow: '0 4px 16px 0 rgba(99,102,241,0.10)',
                    border: '2px solid #e0e7ff',
                    borderRadius: 16,
                    transform: 'translate3d(0,0,0)',
                    zIndex: url === game.ImageURL ? 2 : 1
                  }}
                />
              ))}
            </div>
            {imageLoading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#6366f1',
                fontWeight: 600,
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div className="loading-spinner" style={{
                  width: '24px',
                  height: '24px',
                  border: '3px solid #e0e7ff',
                  borderTop: '3px solid #6366f1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
                Loading...
              </div>
            )}
          </div>
          {/* Removed rank/avg/users for cleaner UI */}
          <a href={`https://boardgamegeek.com${game.URL}`} target="_blank" rel="noopener noreferrer" style={{
            color: '#6366f1',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1.05rem',
            marginBottom: 18,
            display: 'inline-block',
            transition: 'color 0.2s',
          }}>View on BGG</a>
          <div style={{
            margin: '18px 0 10px 0',
            fontSize: '1.1rem',
            color: '#334155',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <b style={{marginBottom: 8}}>Type your rating (1-10):</b>
            <div style={{
              minHeight: 80,
              minWidth: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
              background: '#f1f5f9',
              borderRadius: 16,
              boxShadow: '0 2px 8px 0 rgba(99,102,241,0.06)',
              border: '2px solid #6366f1',
              padding: '0.5rem 1.5rem',
              fontFamily: 'monospace',
            }}>
              <span style={{
                fontSize: rating ? '3.5rem' : '2rem',
                color: rating ? '#6366f1' : '#a1a1aa',
                fontWeight: 700,
                letterSpacing: 2,
                transition: 'font-size 0.2s, color 0.2s',
                opacity: rating ? 1 : 0.5
              }}>{rating ? rating : '—'}</span>
            </div>
            <div style={{marginTop: 10, color: '#64748b', fontSize: '0.98rem'}}>
              <b>Type a number, press <span style={{color:'#10b981'}}>Enter</span> for played, <span style={{color:'#f59e42'}}>Backspace</span> for unplayed.</b>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
              marginTop: '8px'
            }}>
              <span style={{fontSize: '1rem', color: '#6366f1'}}>{current + 1} / {games.length}</span>
              <input
                type="number"
                min="1"
                max={games.length}
                style={{
                  width: '80px',
                  padding: '4px 8px',
                  border: '1px solid #6366f1',
                  borderRadius: '4px',
                  color: '#6366f1',
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}
                placeholder="Jump to"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = parseInt(e.target.value);
                    if (num >= 1 && num <= games.length) {
                      setRating('');
                      setCurrent(num - 1);
                      e.target.value = '';
                      // Return focus to document body for rating input
                      document.body.focus();
                    } else {
                      alert(`Please enter a number between 1 and ${games.length}`);
                    }
                    e.preventDefault(); // Prevent form submission
                  }
                }}
                onFocus={(e) => e.target.select()} // Select all text when focused
              />
            </div>
          </div>
          <div style={{
            fontSize: '1.1rem',
            marginBottom: 18,
            color: playedRef.current[game.ID] === false ? '#f59e42' : playedRef.current[game.ID] === true ? '#10b981' : (typeof playedRef.current[game.ID] === 'number' ? '#6366f1' : '#64748b'),
            fontWeight: 500
          }}>
            {playedRef.current[game.ID] === false
              ? 'Unplayed'
              : typeof playedRef.current[game.ID] === 'number'
                ? `Played, Your rating: ${playedRef.current[game.ID]}`
                : playedRef.current[game.ID] === true
                  ? 'Played'
                  : 'Not answered'}
          </div>
          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            marginBottom: 8
          }}>
            <button onClick={() => {
              setRating('');
              setCurrent(c => {
                const prev = Math.max(c - 1, 0);
                forceUpdate(u => u + 1);
                return prev;
              });
            }} disabled={current === 0} style={{
              padding: '0.5rem 1.2rem',
              borderRadius: 8,
              border: 'none',
              background: current === 0 ? '#e5e7eb' : '#6366f1',
              color: current === 0 ? '#a1a1aa' : '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: current === 0 ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px 0 rgba(99,102,241,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}>Back</button>
            <button onClick={() => {
              setRating('');
              setCurrent(c => {
                const next = Math.min(c + 1, games.length - 1);
                forceUpdate(u => u + 1);
                return next;
              });
            }} disabled={current === games.length - 1} style={{
              padding: '0.5rem 1.2rem',
              borderRadius: 8,
              border: 'none',
              background: current === games.length - 1 ? '#e5e7eb' : '#6366f1',
              color: current === games.length - 1 ? '#a1a1aa' : '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: current === games.length - 1 ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px 0 rgba(99,102,241,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}>Next</button>
            <button onClick={() => {
              // Export results as CSV with proper escaping
              const rows = games.map(g => ({
                ID: g.ID,
                Name: g.Name,
                Played: playedRef.current[g.ID] === false
                  ? 'No'
                  : typeof playedRef.current[g.ID] === 'number'
                    ? playedRef.current[g.ID]
                    : playedRef.current[g.ID] === true
                      ? 'Yes'
                      : ''
              }));
              const csvContent = arrayToCsv(rows);
              downloadCsv(csvContent, 'played_boardgames.csv');
            }} style={{
              padding: '0.5rem 1.2rem',
              borderRadius: 8,
              border: 'none',
              background: '#10b981',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px 0 rgba(16,185,129,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}>Export Results</button>
            <button onClick={() => setShowStatistics(true)} style={{
              padding: '0.5rem 1.2rem',
              borderRadius: 8,
              border: 'none',
              background: '#8b5cf6',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px 0 rgba(139,92,246,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}>View Statistics</button>
          </div>
        </div>
        <div style={{color:'#a1a1aa', fontSize:'0.95rem', marginTop:8, textAlign: 'center'}}>
          <div>Boardgame Played Tracker &copy; {new Date().getFullYear()}</div>
          <div style={{marginTop: 4}}>Developed by <span style={{color: '#6366f1', fontWeight: 500}}>Lichi Fang</span></div>
        </div>
      </div>
    </>
  );
}

export default App;
