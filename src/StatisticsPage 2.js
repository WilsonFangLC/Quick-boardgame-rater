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

    // Add student ratings to games and sort by rating (highest first)
    const gamesWithRatings = ratedGames.map(game => ({
      ...game,
      studentRating: playedGames[game.ID]
    })).sort((a, b) => b.studentRating - a.studentRating);

    // Group games by tier ranges for better organization
    const tierRanges = [
      { min: 10, max: 10, label: 'S+ Tier', key: '10.0' },
      { min: 9.5, max: 9.9, label: 'S Tier', key: '9.5+' },
      { min: 9.0, max: 9.4, label: 'S- Tier', key: '9+' },
      { min: 8.5, max: 8.9, label: 'A+ Tier', key: '8.5+' },
      { min: 8.0, max: 8.4, label: 'A Tier', key: '8+' },
      { min: 7.5, max: 7.9, label: 'A- Tier', key: '7.5+' },
      { min: 7.0, max: 7.4, label: 'B+ Tier', key: '7+' },
      { min: 6.5, max: 6.9, label: 'B Tier', key: '6.5+' },
      { min: 6.0, max: 6.4, label: 'B- Tier', key: '6+' },
      { min: 5.5, max: 5.9, label: 'C+ Tier', key: '5.5+' },
      { min: 5.0, max: 5.4, label: 'C Tier', key: '5+' },
      { min: 4.5, max: 4.9, label: 'C- Tier', key: '4.5+' },
      { min: 4.0, max: 4.4, label: 'D+ Tier', key: '4+' },
      { min: 3.5, max: 3.9, label: 'D Tier', key: '3.5+' },
      { min: 3.0, max: 3.4, label: 'D- Tier', key: '3+' },
      { min: 0, max: 2.9, label: 'F Tier', key: '<3' }
    ];

    const groupedByTier = {};
    let currentRank = 1;

    // Add rank to each game and group by tier
    gamesWithRatings.forEach(game => {
      // Add rank to game
      game.rank = currentRank++;
      
      // Find which tier this game belongs to
      const tier = tierRanges.find(range => 
        game.studentRating >= range.min && game.studentRating <= range.max
      );
      
      if (tier) {
        if (!groupedByTier[tier.key]) {
          groupedByTier[tier.key] = {
            label: tier.label,
            range: tier.key,
            games: [],
            avgRating: tier.min + (tier.max - tier.min) / 2
          };
        }
        groupedByTier[tier.key].games.push(game);
      }
    });

    // Sort tiers to maintain high-to-low order
    const sortedTiers = {};
    tierRanges.forEach(range => {
      if (groupedByTier[range.key]) {
        sortedTiers[range.key] = groupedByTier[range.key];
      }
    });

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

  // Export functions
  const exportToCSV = () => {
    if (!hasRatedGames) {
      alert('No rated games to export!');
      return;
    }

    // Flatten all games from all tiers into a single array with rankings
    const allRatedGames = [];
    Object.values(studentTiers).forEach(tierData => {
      tierData.games.forEach(game => {
        allRatedGames.push({
          Rank: game.rank,
          Name: game.Name,
          Year: game.Year,
          Rating: game.studentRating,
          Tier: tierData.label,
          'BGG Rank': game.Rank,
          'BGG Average': game.Average,
          'BGG Bayes Average': game['Bayes average'],
          'Users Rated': game['Users rated'],
          URL: `https://boardgamegeek.com${game.URL}`
        });
      });
    });

    // Sort by rank to maintain order
    allRatedGames.sort((a, b) => a.Rank - b.Rank);

    // Convert to CSV
    const headers = Object.keys(allRatedGames[0]).join(',');
    const rows = allRatedGames.map(game => 
      Object.values(game).map(value => 
        typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      ).join(',')
    );
    const csvContent = [headers, ...rows].join('\\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `boardgame_statistics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (!hasRatedGames) {
      alert('No rated games to export!');
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      summary: stats,
      tierList: Object.entries(studentTiers).map(([tierKey, tierData]) => ({
        tierKey,
        tierLabel: tierData.label,
        tierRange: tierData.range,
        gameCount: tierData.games.length,
        games: tierData.games.map(game => ({
          rank: game.rank,
          id: game.ID,
          name: game.Name,
          year: game.Year,
          studentRating: game.studentRating,
          bggRank: game.Rank,
          bggAverage: game.Average,
          bggBayesAverage: game['Bayes average'],
          usersRated: game['Users rated'],
          url: `https://boardgamegeek.com${game.URL}`,
          thumbnail: game.Thumbnail,
          imageUrl: game.ImageURL
        }))
      }))
    };

    // Download JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `boardgame_statistics_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTierListImage = () => {
    // This would require additional libraries like html2canvas
    // For now, show instructions for manual screenshot
    alert('Tier List Image Export:\\n\\n1. Take a screenshot of this page\\n2. Crop to include only the tier list section\\n3. Save as PNG/JPG\\n\\nAutomatic image export feature coming soon!');
  };

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

        {/* Export Options */}
        {hasRatedGames && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <button
              onClick={exportToCSV}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 12,
                border: 'none',
                background: '#10b981',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16,185,129,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={e => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(16,185,129,0.3)';
              }}
              onMouseOut={e => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(16,185,129,0.2)';
              }}
            >
              📊 Export CSV
            </button>

            <button
              onClick={exportToJSON}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 12,
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(59,130,246,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={e => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(59,130,246,0.3)';
              }}
              onMouseOut={e => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(59,130,246,0.2)';
              }}
            >
              📋 Export JSON
            </button>

            <button
              onClick={exportTierListImage}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 12,
                border: 'none',
                background: '#8b5cf6',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(139,92,246,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={e => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(139,92,246,0.3)';
              }}
              onMouseOut={e => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(139,92,246,0.2)';
              }}
            >
              🖼️ Export Image
            </button>
          </div>
        )}
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
            {Object.entries(studentTiers).map(([tierKey, tierData]) => (
              <div key={tierKey} style={{
                background: '#fff',
                borderRadius: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid #e0e7ff',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '250px 1fr',
                  alignItems: 'center',
                  minHeight: '140px'
                }}>
                  {/* Tier Label */}
                  <div style={{
                    background: getTierColor(tierData.avgRating),
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '140px',
                    padding: '1rem'
                  }}>
                    <div style={{
                      fontSize: '1.8rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem'
                    }}>
                      {tierData.label}
                    </div>
                    <div style={{
                      fontSize: '1.4rem',
                      fontWeight: 600,
                      textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      marginBottom: '0.25rem'
                    }}>
                      {tierData.range}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      opacity: 0.9
                    }}>
                      {tierData.games.length} game{tierData.games.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Games with Rankings */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '1.5rem',
                    alignItems: 'flex-start'
                  }}>
                    {tierData.games.map(game => (
                      <div key={game.ID} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {/* Game Thumbnail */}
                        <a
                          href={`https://boardgamegeek.com${game.URL}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${game.Name} (${game.Year}) - Your Rating: ${game.studentRating}`}
                          style={{
                            display: 'block',
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
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
                              width: 90,
                              height: 90,
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                        </a>
                        
                        {/* Game Name */}
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#64748b',
                          textAlign: 'center',
                          maxWidth: '90px',
                          lineHeight: '1.2',
                          fontWeight: 500
                        }}>
                          {game.Name.length > 20 ? game.Name.substring(0, 20) + '...' : game.Name}
                        </div>
                      </div>
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