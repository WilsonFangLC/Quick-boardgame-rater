import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

const CSV_URL = process.env.PUBLIC_URL + '/updated_bgg_top5000_images.csv';

const TierListPage = ({ onBack }) => {
  const [tiers, setTiers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(CSV_URL)
      .then(res => res.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const games = results.data;
            const groupedByScore = games.reduce((acc, game) => {
              const score = parseFloat(game['Bayes average']).toFixed(3);
              if (!acc[score]) {
                acc[score] = [];
              }
              acc[score].push(game);
              return acc;
            }, {});

            const sortedTiers = Object.keys(groupedByScore)
              .sort((a, b) => b - a)
              .reduce((acc, key) => {
                acc[key] = groupedByScore[key];
                return acc;
              }, {});

            setTiers(sortedTiers);
            setLoading(false);
          }
        });
      });
  }, []);

  if (loading) {
    return <div>Loading tier list...</div>;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      <button onClick={onBack} style={{
        padding: '0.5rem 1.2rem',
        borderRadius: 8,
        border: 'none',
        background: '#6366f1',
        color: '#fff',
        fontWeight: 600,
        fontSize: '1rem',
        cursor: 'pointer',
        marginBottom: '2rem',
      }}>
        Back to Tracker
      </button>
      <h1 style={{ textAlign: 'center', color: '#2d3748' }}>Board Game Tier List</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Object.entries(tiers).map(([score, games]) => (
          <div key={score} style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr',
            alignItems: 'center',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            padding: '1rem'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#6366f1',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold',
            }}>
              {score}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {games.map(game => (
                <a key={game.ID} href={`https://boardgamegeek.com${game.URL}`} target="_blank" rel="noopener noreferrer" title={`${game.Name} (${game.Year})`}>
                  <img
                    src={game.Thumbnail}
                    alt={game.Name}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TierListPage;
