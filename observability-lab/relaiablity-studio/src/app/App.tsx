import React, { useState, useEffect } from 'react';
import { css, cx } from '@emotion/css';

// API client
const API_BASE = 'http://localhost:9000/api';

const fetchAPI = async (endpoint: string) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    return null;
  }
};

const theme = {
  bg: '#0d0e12',
  surface: '#16191d',
  surfaceHeader: '#1c1f24',
  border: '#2a2d33',
  text: '#d1d2d3',
  textMuted: '#8b8e92',
  healthy: '#4caf50',
  warning: '#ff9800',
  critical: '#f44336',
  fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  monoFont: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
};

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  service: string;
  timestamp: string;
}

interface SLOData {
  slo: number;
  errorRate: number;
  failedPods: number;
  openIncidents: number;
}

const Header = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.flexCenter}>
        <span className={styles.brand}>Reliability Studio</span>
        <span className={styles.divider}>|</span>
        <span className={styles.metaItem}>Env: <span className={styles.metaHigh}>Production</span></span>
        <span className={styles.divider}>|</span>
        <span className={styles.metaItem}>Last Update: <span className={styles.metaHigh}>{time.toUTCString()}</span></span>
      </div>
    </header>
  );
};

const KPIGrid: React.FC<{ data: SLOData | null }> = ({ data }) => (
  <div className={styles.kpiGrid}>
    <div className={styles.kpiBox}>
      <span className={styles.kpiLabel}>SLO</span>
      <span className={cx(styles.kpiValue, styles.textHealthy)}>
        {data ? `${data.slo.toFixed(2)}%` : '--'}
      </span>
    </div>
    <div className={styles.kpiBox}>
      <span className={styles.kpiLabel}>Error Rate</span>
      <span className={cx(styles.kpiValue, styles.textWarning)}>
        {data ? `${data.errorRate.toFixed(2)}%` : '--'}
      </span>
    </div>
    <div className={styles.kpiBox}>
      <span className={styles.kpiLabel}>Failed Pods</span>
      <span className={cx(styles.kpiValue, styles.textCritical)}>
        {data ? data.failedPods : '--'}
      </span>
    </div>
    <div className={styles.kpiBox}>
      <span className={styles.kpiLabel}>Open Incidents</span>
      <span className={cx(styles.kpiValue, styles.textCritical)}>
        {data ? data.openIncidents : '--'}
      </span>
    </div>
  </div>
);

const IncidentCard: React.FC<{
  incident: Incident;
  isSelected: boolean;
  onClick: () => void;
}> = ({ incident, isSelected, onClick }) => {
  const severityColor =
    incident.severity === 'critical'
      ? theme.critical
      : incident.severity === 'high'
      ? theme.warning
      : theme.healthy;

  return (
    <div
      className={cx(styles.incidentCard, isSelected && styles.incidentCardSelected)}
      onClick={onClick}
    >
      <div className={styles.incidentHeader}>
        <span
          className={styles.severityDot}
          style={{ backgroundColor: severityColor }}
        />
        <span className={styles.incidentTitle}>{incident.title}</span>
      </div>
      <div className={styles.incidentMeta}>
        <span>{incident.service}</span>
        <span>{incident.status}</span>
      </div>
      <div className={styles.incidentTime}>
        {new Date(incident.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

const MainBoard: React.FC<{
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident) => void;
}> = ({ incidents, selectedIncident, onSelectIncident }) => (
  <div className={styles.mainBoard}>
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Active Incidents</div>
      <div className={styles.incidentList}>
        {incidents.length > 0 ? (
          incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              isSelected={selectedIncident?.id === incident.id}
              onClick={() => onSelectIncident(incident)}
            />
          ))
        ) : (
          <div className={styles.emptyContent}>
            <span className={styles.textMuted}>No active incidents</span>
          </div>
        )}
      </div>
    </div>

    <div className={styles.rightColumn}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>Incident Details</div>
        <div className={styles.detailsContent}>
          {selectedIncident ? (
            <div className={styles.detailsGrid}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Service:</span>
                <span className={styles.detailValue}>{selectedIncident.service}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Severity:</span>
                <span className={styles.detailValue}>{selectedIncident.severity}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status:</span>
                <span className={styles.detailValue}>{selectedIncident.status}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Started:</span>
                <span className={styles.detailValue}>
                  {new Date(selectedIncident.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.emptyContent}>
              <span className={styles.textMuted}>Select an incident to view details</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>Incident Timeline</div>
        <div className={styles.timelineContent}>
          {selectedIncident ? (
            <div className={styles.timelineList}>
              <div className={styles.timelineEvent}>
                <span className={styles.timelineTime}>
                  {new Date(selectedIncident.timestamp).toLocaleTimeString()}
                </span>
                <span className={styles.timelineSource}>Prometheus</span>
                <span className={styles.timelineMessage}>
                  Incident detected: {selectedIncident.title}
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.emptyContent}>
              <span className={styles.textMuted}>No events recorded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const TelemetryConsole = () => {
  const [activeTab, setActiveTab] = useState('Metrics');
  const tabs = ['Metrics', 'Logs', 'Traces', 'Kubernetes'];

  return (
    <div className={styles.panel}>
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={cx(styles.tabBtn, activeTab === tab && styles.tabActive)}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className={styles.consoleBody}>
        <div className={styles.consolePlaceholder}>
          <pre className={styles.consoleText}>
            Waiting for {activeTab.toLowerCase()} telemetry...
          </pre>
        </div>
      </div>
    </div>
  );
};

export const App = () => {
  const [sloData, setSloData] = useState<SLOData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [slo, inc] = await Promise.all([
        fetchAPI('/slo'),
        fetchAPI('/incidents')
      ]);
      
      if (slo) setSloData(slo);
      if (inc) {
        setIncidents(inc);
        if (inc.length > 0) setSelectedIncident(inc[0]);
      }
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={styles.appContainer}>
        <Header />
        <div className={styles.contentWrapper}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <span className={styles.textMuted}>Loading reliability data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <Header />
      <div className={styles.contentWrapper}>
        <KPIGrid data={sloData} />
        <MainBoard
          incidents={incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={setSelectedIncident}
        />
        <TelemetryConsole />
      </div>
    </div>
  );
};

// Styles remain the same...
const styles = {
  appContainer: css`
    background-color: ${theme.bg};
    color: ${theme.text};
    font-family: ${theme.fontFamily};
    min-height: 100vh;
    font-size: 13px;
  `,
  header: css`
    height: 44px;
    background-color: ${theme.surfaceHeader};
    border-bottom: 1px solid ${theme.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  `,
  flexCenter: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  brand: css`
    font-weight: 700;
    color: #fff;
    font-size: 15px;
  `,
  divider: css`
    color: ${theme.border};
  `,
  metaItem: css`
    font-size: 11px;
    color: ${theme.textMuted};
    text-transform: uppercase;
    font-weight: 500;
  `,
  metaHigh: css`
    color: ${theme.text};
    text-transform: none;
    font-weight: 600;
  `,
  contentWrapper: css`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
  `,
  kpiGrid: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  `,
  kpiBox: css`
    background: ${theme.surface};
    border: 1px solid ${theme.border};
    padding: 16px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  `,
  kpiLabel: css`
    font-size: 11px;
    font-weight: 600;
    color: ${theme.textMuted};
    text-transform: uppercase;
  `,
  kpiValue: css`
    font-size: 22px;
    font-weight: 700;
  `,
  mainBoard: css`
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 20px;
    min-height: 480px;
  `,
  rightColumn: css`
    display: flex;
    flex-direction: column;
    gap: 20px;
  `,
  panel: css`
    background: ${theme.surface};
    border: 1px solid ${theme.border};
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  panelHeader: css`
    background: ${theme.surfaceHeader};
    padding: 10px 16px;
    border-bottom: 1px solid ${theme.border};
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: ${theme.textMuted};
  `,
  incidentList: css`
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  incidentCard: css`
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid ${theme.border};
    border-radius: 4px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: rgba(0, 0, 0, 0.4);
      border-color: ${theme.healthy};
    }
  `,
  incidentCardSelected: css`
    background: rgba(76, 175, 80, 0.1);
    border-color: ${theme.healthy};
  `,
  incidentHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  severityDot: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
  `,
  incidentTitle: css`
    font-size: 12px;
    font-weight: 600;
  `,
  incidentMeta: css`
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: ${theme.textMuted};
  `,
  incidentTime: css`
    font-size: 10px;
    color: ${theme.textMuted};
    font-family: ${theme.monoFont};
  `,
  detailsContent: css`
    padding: 16px;
    flex: 1;
  `,
  detailsGrid: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  detailRow: css`
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid ${theme.border};
  `,
  detailLabel: css`
    font-size: 11px;
    color: ${theme.textMuted};
    text-transform: uppercase;
    font-weight: 600;
  `,
  detailValue: css`
    font-size: 12px;
    color: ${theme.text};
    font-family: ${theme.monoFont};
  `,
  timelineContent: css`
    padding: 16px;
    flex: 1;
    max-height: 300px;
    overflow-y: auto;
  `,
  timelineList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  timelineEvent: css`
    display: grid;
    grid-template-columns: 80px 120px 1fr;
    gap: 12px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    font-size: 11px;
  `,
  timelineTime: css`
    color: ${theme.textMuted};
    font-family: ${theme.monoFont};
  `,
  timelineSource: css`
    color: ${theme.healthy};
    font-weight: 600;
  `,
  timelineMessage: css`
    color: ${theme.text};
  `,
  emptyContent: css`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  `,
  tabBar: css`
    display: flex;
    background: ${theme.surfaceHeader};
    border-bottom: 1px solid ${theme.border};
  `,
  tabBtn: css`
    background: none;
    border: none;
    border-right: 1px solid ${theme.border};
    padding: 12px 24px;
    color: ${theme.textMuted};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: #22252a;
      color: #fff;
    }
  `,
  tabActive: css`
    background: ${theme.surface};
    color: #fff;
    border-bottom: 2px solid ${theme.healthy};
  `,
  consoleBody: css`
    padding: 24px;
    background: #090a0d;
    min-height: 200px;
  `,
  consolePlaceholder: css`
    font-family: ${theme.monoFont};
  `,
  consoleText: css`
    color: ${theme.text};
    font-size: 11px;
    margin: 0;
  `,
  textHealthy: css`
    color: ${theme.healthy};
  `,
  textWarning: css`
    color: ${theme.warning};
  `,
  textCritical: css`
    color: ${theme.critical};
  `,
  textMuted: css`
    color: ${theme.textMuted};
  `,
};