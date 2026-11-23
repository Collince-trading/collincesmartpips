type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    FREE_BOTS: 2,
    BULK_TRADER: 3,
    PRO_AI: 4,
    DUAL_EDGE: 5,
    ANALYSIS_TOOL: 6,
    COPY_TRADING: 7,
    CHART: 8,
    RISK_CALCULATOR: 9,
    MANUAL_TRADER: 10,
    TRADINGVIEW: 11,
    TUTORIAL: 12,
    ACCOUNT_MANAGEMENT: 13,
    TRADE_HISTORY: 14,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-free-bots',
    'id-bulk-trader',
    'id-pro-ai',
    'id-dual-edge',
    'id-analysis-tool',
    'id-copy-trading',
    'id-charts',
    'id-risk-calculator',
    'id-manual-trader',
    'id-tradingview',
    'id-tutorials',
    'id-account-management',
    'id-trade-history',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
