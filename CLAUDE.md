# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm start` (launches React dev server on port 3000)
- **Build for production**: `npm build` (creates optimized production build)
- **Install dependencies**: `npm install`

Note: This project uses Create React App, so standard CRA scripts apply. No testing or linting commands are configured.

## Project Architecture

This is a React-based boardgame rating tracker that allows users to browse, rate, and track their experience with board games from BoardGameGeek's dataset.

### Core Components

- **App.js**: Main application component handling game browsing, rating input, keyboard navigation, and CSV import/export functionality
- **TierListPage.js**: Secondary component for displaying games grouped by BGG rating tiers (currently unused in main flow)

### Key Features & Implementation

**CSV Data Loading**: Uses PapaParse to load boardgame data from `/public/selected_boardgames_2023.csv`. Games include ID, Name, Year, URL, and ImageURL fields.

**Rating System**: Supports three states per game stored in `playedRef`:
- `false`: Explicitly marked as unplayed
- `true`: Played without numeric rating  
- `number`: Played with rating (1-10, including decimals)

**Keyboard Navigation**: Global keyboard handler with these controls:
- Number keys (0-9) + decimal: Build rating input
- Enter: Save current rating and advance to next game
- Backspace: Mark as unplayed (if no rating typed) or remove rating characters

**Image Preloading System**: Aggressive preloading with priority system:
- Preloads 5 games in each direction from current position
- Uses priority loading for immediate neighbors (current ±2)
- Implements image caching with cleanup for memory management
- Adds preconnect headers for BoardGameGeek image CDN

**Progress Management**: 
- Export: Downloads CSV with ID, Name, and Played status
- Import: Uploads previous CSV to restore rating progress
- Uses refs for performance (avoids re-renders on rating changes)

### Data Structure

Games are loaded from CSV with columns: ID, Name, Year, URL, ImageURL. The ImageURL points to BoardGameGeek's CDN for game thumbnails.

The unused TierListPage loads from a different CSV (`updated_bgg_top5000_images.csv`) and groups games by Bayes average rating.

### Styling Approach

Inline styles throughout with modern design system:
- Gradient backgrounds, rounded corners, shadows
- Purple accent color (#6366f1) 
- Clean typography with Segoe UI
- Responsive image containers with loading states