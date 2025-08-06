// Language translations for the boardgame tracker

export const translations = {
  en: {
    // Main App
    loading: 'Loading games...',
    noGamesFound: 'No games found.',
    recoverProgress: 'Recover Progress:',
    uploadCSV: 'Upload CSV',
    quickSearch: '🔍 Quick Search:',
    searchPlaceholder: 'Type game name...',
    viewOnBGG: 'View on BGG',
    typeRating: 'Type your rating (1-10):',
    ratingInstructions: 'For unplayed games, press Backspace.\nFor played games, type a rating and press Enter.',
    unplayed: 'Unplayed',
    played: 'Played',
    playedRating: 'Played, Your rating: ',
    notAnswered: 'Not answered',
    back: 'Back',
    next: 'Next',
    exportResults: 'Export Results',
    viewStatistics: 'View Statistics',
    jumpToPlaceholder: 'Jump to',
    jumpToError: 'Please enter a number between 1 and ',
    copyright: 'Boardgame Played Tracker',
    developedBy: 'Developed by',
    
    // Statistics Page
    backToTracker: '← Back to Tracker',
    ratingStatistics: '📊 Rating Statistics',
    gamesRated: 'Games Rated',
    gamesPlayed: 'Games Played',
    averageRating: 'Average Rating',
    highestRating: 'Highest Rating',
    exportCSV: '📊 Export CSV',
    exportJSON: '📋 Export JSON',
    exportImage: '🖼️ Export Image',
    exporting: '⏳ Generating...',
    noGamesRatedYet: 'No Games Rated Yet',
    noGamesRatedDescription: 'Start rating some games to see your personalized tier list here!',
    dragDropTip: '💡 Tip: Drag games between tiers to change their ratings! Moving a game will automatically update its numeric rating to match the new tier.',
    noRatedGamesToExport: 'No rated games to export!',
    exportComplete: '🎉 Export complete!',
    imagesLoaded: 'Images loaded: ',
    placeholders: 'Placeholders: ',
    checkConsole: 'Check browser console for detailed logs.',
    exportFailed: 'Export failed: ',
    checkConsoleDetails: 'Check browser console for details.',
    statisticsCopyright: 'Boardgame Rating Statistics',
    
    // Tier labels
    tierSPlus: 'S+ Tier',
    tierS: 'S Tier',
    tierSMinus: 'S- Tier',
    tierAPlus: 'A+ Tier',
    tierA: 'A Tier',
    tierAMinus: 'A- Tier',
    tierBPlus: 'B+ Tier',
    tierB: 'B Tier',
    tierBMinus: 'B- Tier',
    tierCPlus: 'C+ Tier',
    tierC: 'C Tier',
    tierCMinus: 'C- Tier',
    tierDPlus: 'D+ Tier',
    tierD: 'D Tier',
    tierDMinus: 'D- Tier',
    tierF: 'F Tier',
    
    // General
    game: 'game',
    games: 'games',
    loadingStatistics: 'Loading statistics...',
    loading_: 'Loading...'
  },
  
  zh: {
    // Main App
    loading: '加载游戏中...',
    noGamesFound: '未找到游戏。',
    recoverProgress: '恢复进度：',
    uploadCSV: '上传 CSV',
    quickSearch: '🔍 快速搜索：',
    searchPlaceholder: '输入游戏名称...',
    viewOnBGG: '在 BGG 查看',
    typeRating: '输入您的评分 (1-10)：',
    ratingInstructions: '未玩游戏：按退格键。\n已玩游戏：输入评分并按回车键。',
    unplayed: '未玩',
    played: '已玩',
    playedRating: '已玩，您的评分：',
    notAnswered: '未回答',
    back: '上一个',
    next: '下一个',
    exportResults: '导出结果',
    viewStatistics: '查看统计',
    jumpToPlaceholder: '跳转到',
    jumpToError: '请输入 1 到 ',
    copyright: '桌游打分器',
    developedBy: '开发者',
    
    // Statistics Page
    backToTracker: '← 返回追踪器',
    ratingStatistics: '📊 评分统计',
    gamesRated: '已评分游戏',
    gamesPlayed: '已玩游戏',
    averageRating: '平均评分',
    highestRating: '最高评分',
    exportCSV: '📊 导出 CSV',
    exportJSON: '📋 导出 JSON',
    exportImage: '🖼️导出图片',
    exporting: '⏳ 生成中...',
    noGamesRatedYet: '还未评分任何游戏',
    noGamesRatedDescription: '开始评分一些游戏，在这里查看您的个性化分级列表！',
    dragDropTip: '💡 提示：拖拽游戏到不同等级来改变评分！移动游戏会自动更新其数字评分以匹配新等级。',
    noRatedGamesToExport: '没有已评分的游戏可导出！',
    exportComplete: '🎉 导出完成！',
    imagesLoaded: '图片已加载：',
    placeholders: '占位符：',
    checkConsole: '查看浏览器控制台获取详细日志。',
    exportFailed: '导出失败：',
    checkConsoleDetails: '查看浏览器控制台获取详情。',
    statisticsCopyright: '桌游打分器统计',
    
    // Tier labels
    tierSPlus: 'S+ 级',
    tierS: 'S 级',
    tierSMinus: 'S- 级',
    tierAPlus: 'A+ 级',
    tierA: 'A 级',
    tierAMinus: 'A- 级',
    tierBPlus: 'B+ 级',
    tierB: 'B 级',
    tierBMinus: 'B- 级',
    tierCPlus: 'C+ 级',
    tierC: 'C 级',
    tierCMinus: 'C- 级',
    tierDPlus: 'D+ 级',
    tierD: 'D 级',
    tierDMinus: 'D- 级',
    tierF: 'F 级',
    
    // General
    game: '款游戏',
    games: '款游戏',
    loadingStatistics: '加载统计中...',
    loading_: '加载中...'
  }
};

// Language context hook
import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  
  const t = (key) => {
    return translations[language][key] || translations.en[key] || key;
  };
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};