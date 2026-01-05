import React, { useState, useEffect } from 'react';
import { useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { IncidentCard } from '../components/IncidentCard';
import { incidentsApi } from '../api/incidents';

export const IncidentsListPage = () => {
    const [incidents, setIncidents] = useState([]);
    const [filter, setFilter] = useState('open');
    const styles = useStyles2(getStyles);

    useEffect(() => {
        loadIncidents();
    }, [filter]);

    const loadIncidents = async () => {
        const data = await incidentsApi.list({ status: filter });
        setIncidents(data);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Incidents</h1>
                <button onClick={() => createNewIncident()}>
                    + New Incident
                </button>
            </div>

            <div className={styles.filters}>
                <button
                    className={filter === 'open' ? styles.activeFilter : ''}
                    onClick={() => setFilter('open')}
                >
                    Open ({incidents.filter(i => i.status === 'open').length})
                </button>
                <button
                    className={filter === 'all' ? styles.activeFilter : ''}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
            </div>

            <div className={styles.list}>
                {incidents.map(incident => (
                    <IncidentCard
                        key={incident.id}
                        incident={incident}
                        onClick={() => navigateToIncident(incident.id)}
                    />
                ))}
            </div>
        </div>
    );
};

const getStyles = (theme: GrafanaTheme2) => ({
    container: css`
    padding: ${theme.spacing(3)};
  `,
    header: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${theme.spacing(3)};
  `,
    // ... more styles
});