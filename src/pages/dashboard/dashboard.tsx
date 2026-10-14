import React, { useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import OnboardTourHandler from '../tutorials/dbot-tours/onboarding-tour';
import Announcements from './announcements';
import Cards from './cards';
import InfoPanel from './info-panel';

type TMobileIconGuide = {
    handleTabChange: (active_number: number) => void;
};

type FeatureKey = 'home' | 'free-bots' | 'risk-calculator' | 'account' | 'history';

const featureButtonStyle: React.CSSProperties = {
    border: '1px solid var(--border-normal, #d8dce3)',
    borderRadius: 12,
    padding: '14px 16px',
    background: 'var(--general-section-1, #fff)',
    color: 'var(--text-general, #202939)',
    textAlign: 'left',
    cursor: 'pointer',
    minHeight: 88,
};

const panelStyle: React.CSSProperties = {
    border: '1px solid var(--border-normal, #d8dce3)',
    borderRadius: 12,
    padding: 18,
    margin: '16px 0',
    color: 'var(--text-general, #202939)',
};

const DashboardComponent = observer(({ handleTabChange }: TMobileIconGuide) => {
    const { load_modal, dashboard, client, google_drive } = useStore();
    const { dashboard_strategies } = load_modal;
    const { is_google_drive_configured } = google_drive;
    const { active_tab, active_tour } = dashboard;
    const has_dashboard_strategies = !!dashboard_strategies?.length;
    const { isDesktop, isTablet } = useDevice();
    const [feature, setFeature] = useState<FeatureKey>('home');
    const [capital, setCapital] = useState('100');
    const [riskPercent, setRiskPercent] = useState('2');
    const [tradeAmount, setTradeAmount] = useState('1');

    const numberCapital = Math.max(0, Number(capital) || 0);
    const numberRisk = Math.max(0, Number(riskPercent) || 0);
    const numberTrade = Math.max(0, Number(tradeAmount) || 0);
    const riskAmount = numberCapital * numberRisk / 100;
    const maxTrades = numberTrade > 0 ? Math.floor(riskAmount / numberTrade) : 0;

    const openFeature = (next: FeatureKey) => setFeature(next);
    const featureTitle: Record<FeatureKey, string> = {
        home: 'SmartPips dashboard',
        'free-bots': 'Free Bots',
        'risk-calculator': 'Risk Calculator',
        account: 'Account Management',
        history: 'Trade History',
    };

    return (
        <React.Fragment>
            <div className={classNames('tab__dashboard', { 'tab__dashboard--tour-active': active_tour })}>
                <div className='tab__dashboard__content'>
                    {client.is_logged_in && (
                        <Announcements is_mobile={!isDesktop} is_tablet={isTablet} handleTabChange={handleTabChange} />
                    )}

                    <section aria-label='SmartPips feature navigation' style={{ margin: '8px 0 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                                <h2 style={{ margin: '0 0 6px', fontSize: 22, color: 'var(--text-prominent, #172033)' }}>SmartPips Tools</h2>
                                <p style={{ margin: 0, color: 'var(--text-general, #4b5563)' }}>Open your analysis, bot library, and trading helpers from one place.</p>
                            </div>
                            {feature !== 'home' && (
                                <button type='button' onClick={() => openFeature('home')} style={{ ...featureButtonStyle, minHeight: 40, padding: '8px 12px' }}>← Dashboard</button>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 10, marginTop: 14 }}>
                            <button type='button' onClick={() => handleTabChange(4)} style={featureButtonStyle}>
                                <strong>Digit Analysis</strong><div style={{ marginTop: 6, fontSize: 13, opacity: .8 }}>Live market digits and analysis tools</div>
                            </button>
                            <button type='button' onClick={() => openFeature('free-bots')} style={featureButtonStyle}>
                                <strong>Free Bots</strong><div style={{ marginTop: 6, fontSize: 13, opacity: .8 }}>Browse starter strategies</div>
                            </button>
                            <button type='button' onClick={() => openFeature('risk-calculator')} style={featureButtonStyle}>
                                <strong>Risk Calculator</strong><div style={{ marginTop: 6, fontSize: 13, opacity: .8 }}>Estimate exposure before trading</div>
                            </button>
                            <button type='button' onClick={() => openFeature('account')} style={featureButtonStyle}>
                                <strong>Account Management</strong><div style={{ marginTop: 6, fontSize: 13, opacity: .8 }}>Account and connection guidance</div>
                            </button>
                            <button type='button' onClick={() => openFeature('history')} style={featureButtonStyle}>
                                <strong>Trade History</strong><div style={{ marginTop: 6, fontSize: 13, opacity: .8 }}>History feature status</div>
                            </button>
                        </div>
                    </section>

                    {feature !== 'home' && (
                        <section style={panelStyle} aria-live='polite'>
                            <h2 style={{ marginTop: 0 }}>{featureTitle[feature]}</h2>
                            {feature === 'free-bots' && (
                                <div>
                                    <p>Starter strategies are listed here for setup and learning. These cards do not start trades automatically and do not promise profits.</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                                        {[
                                            { title: 'Even / Odd Practice', detail: 'Review last-digit parity in the Digit Analysis tab.', action: 'Open analysis' },
                                            { title: 'Matches / Differs Practice', detail: 'Study how often the latest digit matches a selected digit.', action: 'Open analysis' },
                                            { title: 'Rise / Fall Practice', detail: 'Use the market chart to observe price movement before testing a strategy.', action: 'Open charts' },
                                        ].map(bot => (
                                            <div key={bot.title} style={{ border: '1px solid var(--border-normal, #d8dce3)', borderRadius: 10, padding: 14 }}>
                                                <strong>{bot.title}</strong>
                                                <p style={{ fontSize: 13, lineHeight: 1.5 }}>{bot.detail}</p>
                                                <button type='button' onClick={() => handleTabChange(bot.title === 'Rise / Fall Practice' ? 2 : 4)}>{bot.action}</button>
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: 13, marginBottom: 0 }}>These are learning shortcuts, not deployed automated bots yet. Test any future trading strategy on a demo account first.</p>
                                </div>
                            )}
                            {feature === 'risk-calculator' && (
                                <div>
                                    <p>Set your account balance and risk limit. This estimates a budget only; it cannot predict losses or guarantee a safe trade.</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                                        <label style={{ display: 'grid', gap: 6 }}>Account balance<input type='number' min='0' step='any' value={capital} onChange={event => setCapital(event.target.value)} /></label>
                                        <label style={{ display: 'grid', gap: 6 }}>Risk limit (%)<input type='number' min='0' max='100' step='0.1' value={riskPercent} onChange={event => setRiskPercent(event.target.value)} /></label>
                                        <label style={{ display: 'grid', gap: 6 }}>Stake per trade<input type='number' min='0' step='any' value={tradeAmount} onChange={event => setTradeAmount(event.target.value)} /></label>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 16 }}>
                                        <div><div style={{ fontSize: 13, opacity: .8 }}>Risk budget</div><strong style={{ fontSize: 22 }}>{riskAmount.toFixed(2)}</strong></div>
                                        <div><div style={{ fontSize: 13, opacity: .8 }}>Stake-sized entries within budget</div><strong style={{ fontSize: 22 }}>{maxTrades}</strong></div>
                                    </div>
                                </div>
                            )}
                            {feature === 'account' && (
                                <div>
                                    <p>Use the account switcher in the top header to select the Deriv account you want to use. Your connected account balance remains sourced from Deriv.</p>
                                    <p>For safety, verify whether the selected account is demo or real before placing any trade. This panel does not change account settings or transfer funds.</p>
                                </div>
                            )}
                            {feature === 'history' && (
                                <div>
                                    <p>The dedicated SmartPips trade-history view is not connected yet. I have not displayed sample trades as if they were real.</p>
                                    <p>The next implementation step is to connect this section to Deriv transaction/statement data and show the actual returned records.</p>
                                </div>
                            )}
                        </section>
                    )}

                    <div className='quick-panel'>
                        <div className={classNames('tab__dashboard__header', { 'tab__dashboard__header--listed': isDesktop && has_dashboard_strategies })}>
                            {!has_dashboard_strategies && (
                                <Text className='title' as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                                    {localize('Load or build your bot')}
                                </Text>
                            )}
                            <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className={classNames('subtitle', { 'subtitle__has-list': has_dashboard_strategies })}>
                                {is_google_drive_configured
                                    ? localize('Import a bot from your computer or Google Drive, build it from scratch, or start with a quick strategy.')
                                    : localize('Import a bot from your computer, build it from scratch, or start with a quick strategy.')}
                            </Text>
                        </div>
                        <Cards has_dashboard_strategies={has_dashboard_strategies} is_mobile={!isDesktop} />
                    </div>
                </div>
            </div>
            <InfoPanel />
            {active_tab === 0 && <OnboardTourHandler is_mobile={!isDesktop} />}
        </React.Fragment>
    );
});

export default DashboardComponent;
