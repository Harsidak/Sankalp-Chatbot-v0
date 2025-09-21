import React, { useState, useEffect, useMemo } from 'react';
import type { Theme, WellnessPlan, DashboardAnalytics, Reward, RewardType, AuthUser, MoodTrendPoint, EmotionBreakdownItem, UserStats, ChallengeDefinition, LeaderboardEntry } from '../types';
import { generateWellnessPlan, generateDashboardAnalytics } from '../services/geminiService';
import ThemeToggle from './ThemeToggle';
import { TRANSLATIONS } from '../constants';

const BackIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
);

const TrophyIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 0 0 9 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 15.375c0-1.34-1.01-2.438-2.25-2.625A23.13 23.13 0 0 0 12 12.75c-2.032 0-4.01.175-5.952.5-1.24.187-2.25 1.285-2.25 2.625m12 0v-1.5c0-1.538-1.232-2.75-2.75-2.75S9.5 13.837 9.5 15.375v1.5m6 0v-2.25c0-.965-.785-1.75-1.75-1.75s-1.75.785-1.75 1.75v2.25m4.5 0v-3.375c0-.795-.655-1.437-1.458-1.437s-1.458.642-1.458 1.437v3.375m1.5-3.375v-1.312a1.125 1.125 0 0 0-1.125-1.125h-1.5a1.125 1.125 0 0 0-1.125 1.125v1.312" />
    </svg>
);

const BadgeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const PointsIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
);

const FireIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M10 2c-1.1 0-2.05.95-2 2.05 0 1.519 1.48 3.493 2 4.025.52-.532 2-2.506 2-4.025C12.05 2.95 11.1 2 10 2Z" />
        <path fillRule="evenodd" d="M10 18c3.866 0 7-2.686 7-6s-3.134-6-7-6-7 2.686-7 6 3.134 6 7 6Zm0-2c-2.761 0-5-1.79-5-4s2.239-4 5-4 5 1.79 5 4-2.239 4-5 4Z" clipRule="evenodd" />
    </svg>
);

const RewardIcon: React.FC<{ type: RewardType, className?: string }> = ({ type, className }) => {
    switch (type) {
        case 'points': return <PointsIcon className={className} />;
        case 'badge': return <BadgeIcon className={className} />;
        case 'milestone': return <TrophyIcon className={className} />;
        default: return <PointsIcon className={className} />;
    }
};

const Tooltip: React.FC<{ content: string; x: number; y: number; visible: boolean }> = ({ content, x, y, visible }) => {
    if (!visible) return null;
    return (
        <div
            className="absolute p-2 text-xs text-white bg-black/70 rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{ left: x, top: y, transition: 'opacity 0.2s', opacity: visible ? 1 : 0 }}
        >
            {content}
        </div>
    );
};

const MoodTrendChart: React.FC<{ data: MoodTrendPoint[] }> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number; visible: boolean }>({ content: '', x: 0, y: 0, visible: false });
    const svgRef = React.useRef<SVGSVGElement>(null);
    const width = 300;
    const height = 150;
    const padding = 20;

    const showTooltip = (day: string, moodScore: number, event: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        setTooltip({ content: `${day}: Mood ${moodScore}`, x: event.clientX - rect.left, y: event.clientY - rect.top, visible: true });
    };

    const hideTooltip = () => setTooltip(prev => ({ ...prev, visible: false }));
    
    const maxX = width - padding * 2;
    const maxY = height - padding * 2;

    const points = data.map((d, i) => ({
        ...d,
        x: (i / (data.length - 1)) * maxX,
        y: maxY - ((d.moodScore - 1) / 9) * maxY,
    }));

    const pathD = points.map((p, i) => i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`).join(' ');

    return (
        <div className="relative">
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <g transform={`translate(${padding}, ${padding})`}>
                    <text x="-10" y={0} dy="0.32em" textAnchor="end" className="text-xs fill-current text-secondary">High</text>
                    <text x="-10" y={maxY} dy="0.32em" textAnchor="end" className="text-xs fill-current text-secondary">Low</text>
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent-color-dark-theme)" stopOpacity="0.5"/>
                            <stop offset="100%" stopColor="var(--accent-color-dark-theme)" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    <path d={`${pathD} L ${points[points.length-1].x},${maxY} L ${points[0].x},${maxY} Z`} fill="url(#lineGradient)" />
                    <path d={pathD} fill="none" stroke="var(--accent-color-dark-theme)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="5" fill="var(--accent-color-dark-theme)" stroke="var(--bg-color)" strokeWidth="2" className="mood-chart-point"
                            onMouseMove={(e) => showTooltip(p.day, p.moodScore, e)}
                            onMouseLeave={hideTooltip}
                        />
                    ))}
                    {data.map((d, i) => (
                        <text key={i} x={(i / (data.length - 1)) * maxX} y={maxY + 15} textAnchor="middle" className="text-xs fill-current text-secondary">{d.day}</text>
                    ))}
                </g>
            </svg>
            <Tooltip {...tooltip} />
        </div>
    );
};

const EmotionDonutChart: React.FC<{ data: EmotionBreakdownItem[] }> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number; visible: boolean }>({ content: '', x: 0, y: 0, visible: false });
    const svgRef = React.useRef<SVGSVGElement>(null);
    const size = 150;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const getArcPath = (startAngle: number, endAngle: number) => {
        const start = { x: size / 2 + radius * Math.cos(startAngle), y: size / 2 + radius * Math.sin(startAngle) };
        const end = { x: size / 2 + radius * Math.cos(endAngle), y: size / 2 + radius * Math.sin(endAngle) };
        const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
    };

    let startAngle = -Math.PI / 2;
    const segments = data.map(item => {
        const angle = (item.percentage / 100) * 2 * Math.PI;
        const endAngle = startAngle + angle;
        const path = getArcPath(startAngle, endAngle - 0.01); // -0.01 for small gap
        startAngle = endAngle;
        return { ...item, path };
    });

    const showTooltip = (emotion: string, percentage: number, event: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        setTooltip({ content: `${emotion}: ${percentage}%`, x: event.clientX - rect.left, y: event.clientY - rect.top, visible: true });
    };

    const hideTooltip = () => setTooltip(prev => ({ ...prev, visible: false }));

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {segments.map((item, index) => (
                    <path
                        key={index}
                        d={item.path}
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth={strokeWidth}
                        className="emotion-chart-segment"
                        onMouseMove={(e) => showTooltip(item.emotion, item.percentage, e)}
                        onMouseLeave={hideTooltip}
                    />
                ))}
            </svg>
             <div className="absolute text-center">
                <span className="text-2xl font-bold text-primary">{data.length}</span>
                <p className="text-xs text-secondary">Emotions</p>
            </div>
            <Tooltip {...tooltip} />
        </div>
    );
};

const DashboardSkeleton: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse w-full">
        <div className="lg:col-span-1 h-32 glass-panel bg-loading-skeleton/50"></div>
        <div className="lg:col-span-1 h-32 glass-panel bg-loading-skeleton/50"></div>
        <div className="md:col-span-2 lg:col-span-2 h-64 glass-panel bg-loading-skeleton/50"></div>
        <div className="md:col-span-2 lg:col-span-2 h-64 glass-panel bg-loading-skeleton/50"></div>
        <div className="md:col-span-1 lg:col-span-2 h-48 glass-panel bg-loading-skeleton/50"></div>
        <div className="md:col-span-1 lg:col-span-2 h-48 glass-panel bg-loading-skeleton/50"></div>
    </div>
);

interface DashboardPageProps {
  onGoBack: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  language: string;
  user: AuthUser;
  initialData: { wellnessPlan: WellnessPlan, analyticsData: DashboardAnalytics } | null;
  onSaveData: (data: { wellnessPlan: WellnessPlan, analyticsData: DashboardAnalytics }) => void;
  // Live, Firebase-backed data
  liveStats?: UserStats | null;
  liveTrend?: { day: string; moodScore: number }[] | null;
  liveBreakdown?: EmotionBreakdownItem[] | null;
  challenges?: { daily?: ChallengeDefinition; weekly?: ChallengeDefinition };
  leaderboard?: LeaderboardEntry[];
  onCompleteDaily?: () => void | Promise<void>;
  onTrackWeeklyDay?: () => void | Promise<void>;
}

const getStreakColor = (streak: number): string => {
    if (streak <= 2) return 'bg-blue-500';
    if (streak <= 5) return 'bg-teal-400';
    return 'bg-purple-500';
};

const DashboardPage: React.FC<DashboardPageProps> = ({ onGoBack, theme, onToggleTheme, language, initialData, onSaveData, liveStats, liveTrend, liveBreakdown, challenges, leaderboard, onCompleteDaily, onTrackWeeklyDay }) => {
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const [isChallengeCompleted, setIsChallengeCompleted] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [weeklyProgress, setWeeklyProgress] = useState(0);
    const [isCompletingDaily, setIsCompletingDaily] = useState(false);

    const t = useMemo(() => TRANSLATIONS[language] || TRANSLATIONS['en'], [language]);

    useEffect(() => {
        if (!initialData) {
            const fetchData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const [plan, analytics] = await Promise.all([
                        generateWellnessPlan(language),
                        generateDashboardAnalytics(language)
                    ]);
                    const newData = { wellnessPlan: plan, analyticsData: analytics };
                    setData(newData);
                    onSaveData(newData);
                } catch (err) {
                    console.error("Failed to fetch dashboard data:", err);
                    // Fallback mock data so dashboard still works if AI API fails
                    const fallbackData = {
                        wellnessPlan: {
                            dailyChallenge: { description: 'Take a 10-minute mindful walk today.', reward: { type: 'points', value: '25 pts' } },
                            streakInfo: { currentStreak: 3, reward: 'Weekly Reflection', encouragement: 'You are doing great—small steps count!' },
                            weeklyChallenge: { description: 'Journal for 5 minutes', reward: { type: 'badge', value: 'Reflector' }, goalDays: 4 },
                            encouragement: 'Remember to be kind to yourself.'
                        },
                        analyticsData: {
                            keyMetrics: { currentStreak: 3, challengesCompleted: 8 },
                            moodTrend: [
                                { day: 'Mon', moodScore: 6 }, { day: 'Tue', moodScore: 5 }, { day: 'Wed', moodScore: 7 },
                                { day: 'Thu', moodScore: 6 }, { day: 'Fri', moodScore: 7 }, { day: 'Sat', moodScore: 8 }, { day: 'Sun', moodScore: 7 }
                            ],
                            emotionBreakdown: [
                                { emotion: 'Calm', percentage: 40, color: '#60A5FA' },
                                { emotion: 'Anxious', percentage: 25, color: '#F59E0B' },
                                { emotion: 'Hopeful', percentage: 20, color: '#A78BFA' },
                                { emotion: 'Tired', percentage: 15, color: '#10B981' }
                            ],
                            activityLog: [
                                { date: 'Today', activity: 'Completed daily challenge' },
                                { date: 'Yesterday', activity: 'Checked dashboard' }
                            ]
                        }
                    } as const;
                    setData(fallbackData as any);
                    onSaveData(fallbackData as any);
                    setError(null);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [initialData, language, onSaveData]);
    
    const handleCompleteChallenge = async () => {
        if (isChallengeCompleted || isCompletingDaily) return;
        setIsCompletingDaily(true);
        try {
            await onCompleteDaily?.();
            setIsChallengeCompleted(true);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
        } finally {
            setIsCompletingDaily(false);
        }
    };
    
    const handleTrackWeeklyDay = async () => {
        await onTrackWeeklyDay?.();
        if (data) {
            setWeeklyProgress(p => Math.min((challenges?.weekly?.goalDays || data.wellnessPlan.weeklyChallenge.goalDays), p + 1));
        }
    };

    const renderReward = (reward: Reward) => (
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--reward-text-color, #FBBF24)'}}>
            <RewardIcon type={reward.type as RewardType} className="w-5 h-5" />
            <span>{reward.value}</span>
        </div>
    );

    return (
        <div className="w-full flex flex-col gap-6 animate-fade-in">
             {showConfetti && (
                <div id="confetti-container">
                    {Array.from({ length: 150 }).map((_, index) => (
                        <div key={index} className="confetti" style={{
                            left: `${Math.random() * 100}vw`,
                            animationDelay: `${Math.random() * 3}s`,
                            backgroundColor: `hsl(${Math.random() * 360}, 90%, 60%)`,
                            transform: `rotate(${Math.random() * 360}deg)`
                        }} />
                    ))}
                </div>
            )}
            <header className="flex items-center justify-between w-full">
                <button onClick={onGoBack} className="p-2 rounded-full bg-interactive hover:bg-interactive-hover transition-colors" aria-label="Go back">
                    <BackIcon className="w-6 h-6 text-primary" />
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-primary hidden sm:block">{t.dashboardTitle}</h1>
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                </div>
            </header>

            {isLoading ? (
                <DashboardSkeleton />
            ) : error || !data ? (
                <div className="glass-panel text-center p-8">
                    <p className="text-error-color">{error || "Something went wrong."}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    {/* Key Metrics */}
                    <div className="glass-panel interactive-glare p-4 flex flex-col justify-between">
                        <h3 className="text-sm font-semibold text-secondary">{t.currentStreak}</h3>
                        <p className="text-4xl font-bold text-primary">{liveStats?.currentStreak ?? data.analyticsData.keyMetrics.currentStreak} <span className="text-lg">{t.days}</span></p>
                    </div>
                    <div className="glass-panel interactive-glare p-4 flex flex-col justify-between">
                        <h3 className="text-sm font-semibold text-secondary">{t.challengesDone}</h3>
                        <p className="text-4xl font-bold text-primary">{liveStats?.challengesCompleted ?? data.analyticsData.keyMetrics.challengesCompleted}</p>
                    </div>
                    <div className="glass-panel interactive-glare p-4 flex flex-col justify-between">
                        <h3 className="text-sm font-semibold text-secondary">Points</h3>
                        <div className="flex items-end gap-2">
                            <PointsIcon className="w-6 h-6 text-yellow-400" />
                            <p className="text-4xl font-bold text-primary">{liveStats?.points ?? 0}</p>
                        </div>
                    </div>
                    
                    {/* Daily Challenge */}
                    <div className="md:col-span-2 lg:col-span-2 glass-panel interactive-glare p-4 flex flex-col">
                        <h3 className="text-sm font-semibold text-secondary mb-2">{t.dailyChallenge}</h3>
                        <p className="text-lg text-primary font-medium flex-grow">{challenges?.daily?.description || data.wellnessPlan.dailyChallenge.description}</p>
                        <div className="flex justify-between items-end mt-2">
                            {renderReward({ type: 'points' as RewardType, value: `${50} pts` })}
                            {!isChallengeCompleted ? (
                                <button onClick={handleCompleteChallenge} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-500/80 hover:bg-green-500/100 transition-colors shadow-lg hover:shadow-green-500/50 disabled:opacity-50" disabled={isCompletingDaily}>
                                    {isCompletingDaily ? 'Saving...' : t.markAsComplete}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 text-green-400 font-bold animate-fade-in">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{t.completed}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mood Trend */}
                    <div className="md:col-span-2 lg:col-span-2 glass-panel interactive-glare p-4">
                        <h3 className="text-sm font-semibold text-secondary mb-2">{t.weeklyMoodTrend}</h3>
                        <MoodTrendChart data={(liveTrend as MoodTrendPoint[]) || data.analyticsData.moodTrend} />
                    </div>

                    {/* Emotion Breakdown */}
                    <div className="md:col-span-1 lg:col-span-2 glass-panel interactive-glare p-4 flex flex-col items-center">
                        <h3 className="text-sm font-semibold text-secondary self-start mb-2">{t.emotionBreakdown}</h3>
                        <div className="flex-grow flex items-center">
                            <EmotionDonutChart data={(liveBreakdown as EmotionBreakdownItem[]) || data.analyticsData.emotionBreakdown} />
                        </div>
                         <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                            {(liveBreakdown || data.analyticsData.emotionBreakdown).map(item => (
                                <div key={item.emotion} className="flex items-center gap-1.5 text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-secondary">{item.emotion}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                     {/* Streak Info */}
                    <div className="glass-panel interactive-glare p-4 flex flex-col">
                        <h3 className="text-sm font-semibold text-secondary mb-2">{t.streakProgress}</h3>
                        <div className="flex items-center gap-2">
                            <FireIcon className="w-5 h-5 text-orange-400" />
                            <p className="text-primary font-semibold">{(liveStats?.currentStreak ?? data.wellnessPlan.streakInfo.currentStreak)} Day Streak</p>
                        </div>
                        <p className="text-sm text-secondary flex-grow mt-2">{data.wellnessPlan.streakInfo.encouragement}</p>
                        <p className="text-sm text-teal-300 font-semibold mt-2">7-Day Goal: {data.wellnessPlan.streakInfo.reward}</p>
                        <div className="w-full h-2 bg-interactive rounded-full mt-2 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${getStreakColor(liveStats?.currentStreak ?? data.wellnessPlan.streakInfo.currentStreak)}`}
                                style={{ width: `${((liveStats?.currentStreak ?? data.wellnessPlan.streakInfo.currentStreak) / 7) * 100}%` }} />
                        </div>
                    </div>
                    
                    {/* Weekly Challenge */}
                    <div className="glass-panel interactive-glare p-4 flex flex-col">
                        <h3 className="text-sm font-semibold text-secondary mb-2">{t.weeklyChallenge}</h3>
                        <p className="text-md text-primary font-medium">{challenges?.weekly?.description || data.wellnessPlan.weeklyChallenge.description}</p>
                        <div className="flex-grow flex flex-col justify-end mt-2">
                            <div className="flex justify-between items-center mb-2">
                                {renderReward({ type: 'points' as RewardType, value: `${50} pts` })}
                                <span className="text-xs font-bold text-secondary">{(liveStats?.weeklyCompletedDates?.length ?? weeklyProgress)} / {(challenges?.weekly?.goalDays || data.wellnessPlan.weeklyChallenge.goalDays)} Days</span>
                            </div>
                             <div className="flex items-center gap-2 mb-3">
                                {Array.from({ length: (challenges?.weekly?.goalDays || data.wellnessPlan.weeklyChallenge.goalDays) }).map((_, i) => (
                                    <div key={i} className={`h-2 flex-1 rounded-full ${i < (liveStats?.weeklyCompletedDates?.length ?? weeklyProgress) ? 'bg-purple-500' : 'bg-interactive'}`}></div>
                                ))}
                            </div>
                            {(liveStats?.weeklyCompletedDates?.length ?? weeklyProgress) >= (challenges?.weekly?.goalDays || data.wellnessPlan.weeklyChallenge.goalDays) ? (
                                <div className="flex items-center justify-center gap-2 text-green-400 font-bold animate-fade-in text-sm py-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{t.goalMet}</span>
                                </div>
                            ) : (
                                <button onClick={handleTrackWeeklyDay} className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-500/80 hover:bg-blue-500/100 transition-colors shadow-lg hover:shadow-blue-500/50">
                                    {t.trackADay}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="md:col-span-2 lg:col-span-4 glass-panel interactive-glare p-4">
                        <h3 className="text-sm font-semibold text-secondary mb-3">Leaderboard</h3>
                        <div className="flex flex-col gap-2">
                            {(leaderboard || []).map((entry, idx) => (
                                <div key={entry.uid} className="flex items-center justify-between bg-interactive rounded-md px-3 py-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-secondary w-6 text-center">#{idx + 1}</span>
                                        <span className="text-primary font-semibold">{entry.displayName || 'Anonymous'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <PointsIcon className="w-4 h-4 text-yellow-400" />
                                        <span className="text-sm text-primary font-bold">{entry.points}</span>
                                    </div>
                                </div>
                            ))}
                            {(leaderboard || []).length === 0 && (
                                <p className="text-secondary text-sm">Leaderboard will appear once you and others start earning points.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;