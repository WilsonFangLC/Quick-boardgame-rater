import { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  pointerWithin,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { arrayToCsv, downloadCsv } from './csvUtils';

const CSV_URL = process.env.PUBLIC_URL + '/selected_boardgames_2023.csv';

const StatisticsPage = ({ onBack, playedGames, onRatingChange }) => {
  const [studentTiers, setStudentTiers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const tierListRef = useRef(null);
  const [stats, setStats] = useState({
    totalRated: 0,
    totalPlayed: 0,
    averageRating: 0,
    topRating: 0
  });
  const [activeGame, setActiveGame] = useState(null);
  const [dragOverTier, setDragOverTier] = useState(null);

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

  // Drag and drop functions
  const handleDragStart = (event) => {
    const { active } = event;
    const gameId = active.id;
    
    // Find the game being dragged
    for (const tierData of Object.values(studentTiers)) {
      const draggedGame = tierData.games.find(game => game.ID === gameId);
      if (draggedGame) {
        setActiveGame(draggedGame);
        break;
      }
    }
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (over && over.id.startsWith('tier-')) {
      const tierKey = over.id.replace('tier-', '');
      setDragOverTier(tierKey);
    } else {
      setDragOverTier(null);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveGame(null);
    setDragOverTier(null);

    if (!over) return;

    const gameId = active.id;
    const overId = over.id;

    // Handle dropping on a tier
    if (overId.startsWith('tier-')) {
      const newTierKey = overId.replace('tier-', '');
      moveGameToTier(gameId, newTierKey);
    }
  };

  const moveGameToTier = (gameId, targetTierKey) => {
    // Find which tier the game is currently in
    let sourceGame = null;
    let sourceTierKey = null;
    
    for (const [tierKey, tierData] of Object.entries(studentTiers)) {
      const gameIndex = tierData.games.findIndex(game => game.ID === gameId);
      if (gameIndex !== -1) {
        sourceGame = tierData.games[gameIndex];
        sourceTierKey = tierKey;
        break;
      }
    }

    if (!sourceGame || sourceTierKey === targetTierKey) return;

    // Get the target tier's rating range
    const targetTier = studentTiers[targetTierKey];
    if (!targetTier) return;

    // Calculate new rating based on tier
    const tierRanges = [
      { key: '10.0', min: 10, max: 10 },
      { key: '9.5+', min: 9.5, max: 9.9 },
      { key: '9+', min: 9.0, max: 9.4 },
      { key: '8.5+', min: 8.5, max: 8.9 },
      { key: '8+', min: 8.0, max: 8.4 },
      { key: '7.5+', min: 7.5, max: 7.9 },
      { key: '7+', min: 7.0, max: 7.4 },
      { key: '6.5+', min: 6.5, max: 6.9 },
      { key: '6+', min: 6.0, max: 6.4 },
      { key: '5.5+', min: 5.5, max: 5.9 },
      { key: '5+', min: 5.0, max: 5.4 },
      { key: '4.5+', min: 4.5, max: 4.9 },
      { key: '4+', min: 4.0, max: 4.4 },
      { key: '3.5+', min: 3.5, max: 3.9 },
      { key: '3+', min: 3.0, max: 3.4 },
      { key: '<3', min: 0, max: 2.9 }
    ];

    const targetRange = tierRanges.find(range => range.key === targetTierKey);
    if (!targetRange) return;

    // Set new rating to the minimum of the target tier range
    const newRating = targetRange.min;
    const roundedRating = Math.round(newRating * 10) / 10; // Round to 1 decimal place

    // Update the game's rating
    sourceGame.studentRating = roundedRating;

    // Update local state
    setStudentTiers(prevTiers => {
      const newTiers = { ...prevTiers };
      
      // Remove game from source tier
      newTiers[sourceTierKey] = {
        ...newTiers[sourceTierKey],
        games: newTiers[sourceTierKey].games.filter(game => game.ID !== gameId)
      };
      
      // Add game to target tier
      if (!newTiers[targetTierKey]) {
        const targetRange = tierRanges.find(range => range.key === targetTierKey);
        newTiers[targetTierKey] = {
          label: targetRange.label,
          range: targetTierKey,
          games: [],
          avgRating: targetRange.min + (targetRange.max - targetRange.min) / 2
        };
      }
      
      newTiers[targetTierKey] = {
        ...newTiers[targetTierKey],
        games: [...newTiers[targetTierKey].games, sourceGame]
      };

      // Remove empty tiers
      Object.keys(newTiers).forEach(key => {
        if (newTiers[key].games.length === 0) {
          delete newTiers[key];
        }
      });

      return newTiers;
    });

    // Call the callback to update the main rating system
    if (onRatingChange) {
      onRatingChange(gameId, roundedRating);
    }
  };

  // Draggable Game Component
  const DraggableGame = ({ game }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: game.ID,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1000 : 'auto',
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: 'transform 0.2s',
          transform: isDragging ? 'scale(1.05)' : 'scale(1)',
          height: 'auto'
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
              transition: 'transform 0.2s, box-shadow 0.2s',
              pointerEvents: isDragging ? 'none' : 'auto'
            }}
            onMouseOver={e => {
              if (!isDragging) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
              }
            }}
            onMouseOut={e => {
              if (!isDragging) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }
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
              draggable={false}
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
      </div>
    );
  };

  // Droppable Tier Component
  const DroppableTier = ({ tierKey, tierData, children }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: `tier-${tierKey}`,
    });

    const isHighlighted = dragOverTier === tierKey || isOver;

    return (
      <div
        ref={setNodeRef}
        style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: isHighlighted 
            ? '0 12px 40px rgba(99,102,241,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.1)',
          border: isHighlighted 
            ? '2px solid #6366f1' 
            : '1px solid #e0e7ff',
          overflow: 'hidden',
          transition: 'box-shadow 0.3s, border 0.3s'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: '250px 1fr',
          alignItems: 'stretch',
          minHeight: '140px',
          width: '100%',
          boxSizing: 'border-box'
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
            padding: '1rem',
            position: 'relative'
          }}>
            {isHighlighted && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                📥
              </div>
            )}
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
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: '140px',
            background: isHighlighted ? 'rgba(99,102,241,0.05)' : 'transparent',
            transition: 'background 0.3s'
          }}>
            {children}
          </div>
        </div>
      </div>
    );
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

    // Convert to CSV with proper escaping
    const csvContent = arrayToCsv(allRatedGames);
    downloadCsv(csvContent, `boardgame_statistics_${new Date().toISOString().split('T')[0]}.csv`);
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

  const exportTierListImage = async () => {
    if (!hasRatedGames) {
      alert('No rated games to export!');
      return;
    }

    setIsExportingImage(true);
    
    try {
      console.log('🔍 DEBUG: Starting export process...');
      
      // Create a container that replicates the exact statistics page layout
      const exportContainer = document.createElement('div');
      exportContainer.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 1200px;
        background: linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%);
        font-family: 'Segoe UI', Arial, sans-serif;
        padding: 40px;
      `;
      
      // Add title
      const title = document.createElement('div');
      title.innerHTML = `
        <h1 style="
          text-align: center;
          color: #2d3748;
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 2rem;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">📊 My Board Game Tier List</h1>
        <div style="
          text-align: center;
          color: #64748b;
          font-size: 1.1rem;
          margin-bottom: 3rem;
        ">Generated on ${new Date().toLocaleDateString()}</div>
      `;
      exportContainer.appendChild(title);
      
      // Clone and modify the actual tier list
      const tierListClone = tierListRef.current.cloneNode(true);
      console.log('🔍 DEBUG: Cloned tier list');
      
      // Find all images
      const images = tierListClone.querySelectorAll('img');
      console.log(`🔍 DEBUG: Found ${images.length} images to process`);
      
      let successCount = 0;
      let failCount = 0;
      
      // Process each image with detailed logging
      const imagePromises = Array.from(images).map(async (img, index) => {
        const originalSrc = img.src;
        console.log(`🔍 DEBUG: Processing image ${index + 1}/${images.length}: ${originalSrc}`);
        
        return new Promise(async (resolve) => {
          try {
            // Method 1: Try to load the original image directly first
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';
            
            const loadPromise = new Promise((imgResolve, imgReject) => {
              testImg.onload = () => {
                console.log(`✅ DEBUG: Image ${index + 1} loaded directly`);
                // Convert to canvas to ensure it works with html2canvas
                const canvas = document.createElement('canvas');
                canvas.width = 90;
                canvas.height = 90;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(testImg, 0, 0, 90, 90);
                img.src = canvas.toDataURL('image/jpeg', 0.9);
                successCount++;
                imgResolve();
              };
              testImg.onerror = () => {
                console.log(`❌ DEBUG: Image ${index + 1} failed direct load`);
                imgReject();
              };
              testImg.src = originalSrc;
            });
            
            // Try direct load first with 5 second timeout
            try {
              await Promise.race([
                loadPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Direct load timeout')), 5000))
              ]);
              resolve();
              return;
            } catch (directError) {
              console.log(`⏰ DEBUG: Image ${index + 1} direct load failed/timeout`);
            }
            
            // Method 2: Try CORS proxies
            const proxies = [
              'https://corsproxy.io/?',
              'https://api.allorigins.win/raw?url='
            ];
            
            let proxyWorked = false;
            for (const proxy of proxies) {
              try {
                console.log(`🔄 DEBUG: Trying proxy ${proxy} for image ${index + 1}`);
                const proxyUrl = proxy + encodeURIComponent(originalSrc);
                
                const proxyImg = new Image();
                proxyImg.crossOrigin = 'anonymous';
                
                await new Promise((proxyResolve, proxyReject) => {
                  proxyImg.onload = () => {
                    console.log(`✅ DEBUG: Image ${index + 1} loaded via proxy ${proxy}`);
                    // Convert to canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = 90;
                    canvas.height = 90;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(proxyImg, 0, 0, 90, 90);
                    img.src = canvas.toDataURL('image/jpeg', 0.9);
                    successCount++;
                    proxyWorked = true;
                    proxyResolve();
                  };
                  proxyImg.onerror = proxyReject;
                  proxyImg.src = proxyUrl;
                  setTimeout(proxyReject, 4000); // 4 second timeout per proxy
                });
                
                if (proxyWorked) break;
                
              } catch (proxyError) {
                console.log(`❌ DEBUG: Proxy ${proxy} failed for image ${index + 1}`);
                continue;
              }
            }
            
            if (proxyWorked) {
              resolve();
              return;
            }
            
            // Method 3: Create a nice placeholder
            console.log(`🎨 DEBUG: Creating placeholder for image ${index + 1}`);
            const canvas = document.createElement('canvas');
            canvas.width = 90;
            canvas.height = 90;
            const ctx = canvas.getContext('2d');
            
            // Create a nice gradient background
            const gradient = ctx.createLinearGradient(0, 0, 90, 90);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#8b5cf6');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 90, 90);
            
            // Add border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 88, 88);
            
            // Add game controller emoji
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('🎮', 45, 55);
            
            img.src = canvas.toDataURL();
            failCount++;
            
          } catch (error) {
            console.error(`💥 DEBUG: Complete failure for image ${index + 1}:`, error);
            failCount++;
          }
          
          resolve();
        });
      });
      
      console.log('⏳ DEBUG: Waiting for all images to process...');
      await Promise.all(imagePromises);
      console.log(`🔍 DEBUG: Image processing complete. Success: ${successCount}, Failed: ${failCount}`);
      
      exportContainer.appendChild(tierListClone);
      document.body.appendChild(exportContainer);
      
      console.log('⏳ DEBUG: Waiting additional 3 seconds for images to fully render...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('📸 DEBUG: Starting html2canvas...');
      // Generate the image
      const canvas = await html2canvas(exportContainer, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: false, // Disable CORS since we've already processed images
        allowTaint: true,
        width: 1200,
        height: exportContainer.scrollHeight,
        logging: true, // Enable html2canvas logging
        imageTimeout: 0, // Disable timeout since we pre-processed images
      });
      
      console.log('✅ DEBUG: html2canvas completed');
      
      // Clean up
      document.body.removeChild(exportContainer);
      
      // Download the image
      const link = document.createElement('a');
      link.download = `boardgame_tier_list_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      
      alert(`🎉 Export complete!\\n\\nImages loaded: ${successCount}\\nPlaceholders: ${failCount}\\n\\nCheck browser console for detailed logs.`);
      
    } catch (error) {
      console.error('💥 DEBUG: Export failed:', error);
      alert(`Export failed: ${error.message}\\n\\nCheck browser console for details.`);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      padding: '2rem',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '2rem',
        width: '100%'
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
              disabled={isExportingImage}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 12,
                border: 'none',
                background: isExportingImage ? '#a78bfa' : '#8b5cf6',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: isExportingImage ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(139,92,246,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isExportingImage ? 0.7 : 1
              }}
              onMouseOver={e => {
                if (!isExportingImage) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(139,92,246,0.3)';
                }
              }}
              onMouseOut={e => {
                if (!isExportingImage) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 16px rgba(139,92,246,0.2)';
                }
              }}
            >
              {isExportingImage ? '⏳ Generating...' : '🖼️ Export Image'}
            </button>
          </div>
        )}
      </div>

      {/* Tier List */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <DndContext
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          collisionDetection={pointerWithin}
        >
          <div ref={tierListRef} style={{ width: '100%' }}>
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
            <>
              {/* Help text */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 16,
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #e0e7ff',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '1rem'
              }}>
                💡 <strong>Tip:</strong> Drag games between tiers to change their ratings! Moving a game will automatically update its numeric rating to match the new tier.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.entries(studentTiers).map(([tierKey, tierData]) => (
                  <DroppableTier key={tierKey} tierKey={tierKey} tierData={tierData}>
                    {tierData.games.map(game => (
                      <DraggableGame key={game.ID} game={game} />
                    ))}
                  </DroppableTier>
                ))}
              </div>
            </>
          )}
        </div>

        <DragOverlay>
          {activeGame ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transform: 'rotate(5deg)',
              opacity: 0.9
            }}>
              <div style={{
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '2px solid #6366f1'
              }}>
                <img
                  src={activeGame.Thumbnail}
                  alt={activeGame.Name}
                  style={{
                    width: 90,
                    height: 90,
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: '#6366f1',
                textAlign: 'center',
                maxWidth: '90px',
                lineHeight: '1.2',
                fontWeight: 600,
                background: '#fff',
                padding: '4px 8px',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                {activeGame.Name.length > 20 ? activeGame.Name.substring(0, 20) + '...' : activeGame.Name}
              </div>
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default StatisticsPage;