import { useEffect, useState } from 'react';
import Papa from 'papaparse';

const CSV_URL = process.env.PUBLIC_URL + '/selected_boardgames_2023.csv';

const StatisticsPage = ({ onBack, playedGames }) => {
  const [studentTiers, setStudentTiers] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRated: 0,
    totalPlayed: 0,
    averageRating: 0,
    topRating: 0
  });

  useEffect(() => {
    fetch(CSV_URL)
      .then(res => res.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processStudentRatings(results.data);
            setLoading(false);
          }
        });
      });
  }, [playedGames]);

  const processStudentRatings = (gameData) => {
    // Filter games that have numeric ratings from students
    const ratedGames = gameData.filter(game => {
      const studentRating = playedGames[game.ID];
      return typeof studentRating === 'number';
    });

    // Group games by their student ratings
    const groupedByRating = ratedGames.reduce((acc, game) => {
      const rating = playedGames[game.ID];
      const roundedRating = Math.round(rating * 10) / 10; // Round to 1 decimal place
      
      if (!acc[roundedRating]) {
        acc[roundedRating] = [];
      }
      acc[roundedRating].push({
        ...game,
        studentRating: rating
      });
      return acc;
    }, {});

    // Sort tiers by rating (highest first)
    const sortedTiers = Object.keys(groupedByRating)
      .map(rating => parseFloat(rating))
      .sort((a, b) => b - a)
      .reduce((acc, rating) => {
        acc[rating] = groupedByRating[rating].sort((a, b) => a.Name.localeCompare(b.Name));
        return acc;
      }, {});

    setStudentTiers(sortedTiers);

    // Calculate statistics
    const ratings = ratedGames.map(game => playedGames[game.ID]);
    const totalPlayed = Object.values(playedGames).filter(rating => rating === true || typeof rating === 'number').length;
    
    setStats({
      totalRated: ratings.length,
      totalPlayed: totalPlayed,
      averageRating: ratings.length > 0 ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : 0,
      topRating: ratings.length > 0 ? Math.max(...ratings) : 0
    });
  };

  const getTierColor = (rating) => {
    if (rating >= 9) return '#10b981'; // Green for 9-10
    if (rating >= 8) return '#3b82f6'; // Blue for 8-8.9
    if (rating >= 7) return '#8b5cf6'; // Purple for 7-7.9
    if (rating >= 6) return '#f59e0b'; // Orange for 6-6.9
    if (rating >= 5) return '#ef4444'; // Red for 5-5.9
    return '#6b7280'; // Gray for below 5
  };

  const getTierLabel = (rating) => {
    if (rating >= 9) return 'S Tier';
    if (rating >= 8) return 'A Tier';
    if (rating >= 7) return 'B Tier';
    if (rating >= 6) return 'C Tier';
    if (rating >= 5) return 'D Tier';
    return 'F Tier';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Segoe UI, Arial, sans-serif'
      }}>
        <div style={{ fontSize: '1.2rem', color: '#6366f1' }}>Loading statistics...</div>
      </div>
    );
  }

  const hasRatedGames = Object.keys(studentTiers).length > 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <button onClick={onBack} style={{
          padding: '0.75rem 1.5rem',
          borderRadius: 12,
          border: 'none',
          background: '#6366f1',
          color: '#fff',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(99,102,241,0.2)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          marginBottom: '2rem'
        }}
        onMouseOver={e => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 20px rgba(99,102,241,0.3)';
        }}
        onMouseOut={e => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 16px rgba(99,102,241,0.2)';
        }}>
          ← Back to Tracker
        </button>

        <h1 style={{
          textAlign: 'center',
          color: '#2d3748',
          fontSize: '3rem',
          fontWeight: 700,
          marginBottom: '1rem',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          📊 Student Rating Statistics
        </h1>

        {/* Statistics Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid #e0e7ff'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#6366f1', marginBottom: '0.5rem' }}>
              {stats.totalRated}
            </div>
            <div style={{ color: '#64748b', fontWeight: 600 }}>Games Rated</div>
          </div>
          
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid #e0e7ff'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
              {stats.totalPlayed}
            </div>
            <div style={{ color: '#64748b', fontWeight: 600 }}>Games Played</div>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid #e0e7ff'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.5rem' }}>
              {stats.averageRating}
            </div>
            <div style={{ color: '#64748b', fontWeight: 600 }}>Average Rating</div>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid #e0e7ff'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.5rem' }}>
              {stats.topRating}
            </div>
            <div style={{ color: '#64748b', fontWeight: 600 }}>Highest Rating</div>
          </div>
        </div>
      </div>

      {/* Tier List */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {!hasRatedGames ? (
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid #e0e7ff'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎲</div>
            <h2 style={{ color: '#64748b', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
              No Games Rated Yet
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>
              Start rating some games to see your personalized tier list here!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(studentTiers).map(([rating, gamesInTier]) => (
              <div key={rating} style={{
                background: '#fff',
                borderRadius: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid #e0e7ff',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr',
                  alignItems: 'center',
                  minHeight: '120px'
                }}>
                  {/* Tier Label */}
                  <div style={{
                    background: getTierColor(parseFloat(rating)),
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '120px',
                    padding: '1rem'
                  }}>
                    <div style={{
                      fontSize: '1.8rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem'
                    }}>
                      {getTierLabel(parseFloat(rating))}
                    </div>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: 'bold',
                      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      {rating}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      opacity: 0.9,
                      marginTop: '0.25rem'
                    }}>
                      {gamesInTier.length} game{gamesInTier.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Games Thumbnails */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '1.5rem',
                    alignItems: 'center'
                  }}>
                    {gamesInTier.map(game => (
                      <a
                        key={game.ID}
                        href={`https://boardgamegeek.com${game.URL}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${game.Name} (${game.Year}) - Your Rating: ${game.studentRating}`}
                        style={{
                          display: 'block',
                          borderRadius: 12,
                          overflow: 'hidden',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          border: `3px solid ${getTierColor(parseFloat(rating))}`,
                          position: 'relative'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                      >
                        <img
                          src={game.Thumbnail}
                          alt={game.Name}
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                        {/* Rating Badge */}
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: getTierColor(parseFloat(rating)),
                          color: '#fff',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                          {game.studentRating}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;