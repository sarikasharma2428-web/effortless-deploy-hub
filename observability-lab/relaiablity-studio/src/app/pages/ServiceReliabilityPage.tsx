import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SLOCard } from '../components/SLOCard';
import { IncidentHistoryChart } from '../components/IncidentHistoryChart';
import { MTTRTrendChart } from '../components/MTTRTrendChart';
import { servicesApi } from '../api/services';

export const ServiceReliabilityPage = () => {
    const { id } = useParams<{ id: string }>();
    const [service, setService] = useState(null);
    const [slos, setSlos] = useState([]);
    const [incidents, setIncidents] = useState([]);

    useEffect(() => {
        loadServiceData();
    }, [id]);

    const loadServiceData = async () => {
        const [serviceData, sloData, incidentData] = await Promise.all([
            servicesApi.get(id),
            servicesApi.getSLOs(id),
            servicesApi.getIncidents(id)
        ]);

        setService(serviceData);
        setSlos(sloData);
        setIncidents(incidentData);
    };

    return (
        <div className="service-reliability">
            <div className="service-header">
                <h1>{service?.name}</h1>
                <div className="metadata">
                    <span>Team: {service?.team}</span>
                    <span>On-call: {service?.onCallSchedule}</span>
                </div>
            </div>

            <div className="slo-grid">
                {slos.map(slo => (
                    <SLOCard key={slo.id} slo={slo} />
                ))}
            </div>

            <div className="reliability-metrics">
                <IncidentHistoryChart incidents={incidents} />
                <MTTRTrendChart incidents={incidents} />
            </div>

            <div className="recent-incidents">
                <h2>Recent Incidents</h2>
                {/* List of incidents affecting this service */}
            </div>
        </div>
    );
};