"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformanceDataPoint {
  name: string;
  sent: number;
  opened: number;
  engaged: number;
  converted: number;
}

interface CampaignPerformanceChartProps {
  data?: PerformanceDataPoint[];
  campaignId?: string;
}

export function CampaignPerformanceChart({
  data,
  campaignId,
}: CampaignPerformanceChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [performanceData, setPerformanceData] = useState<
    PerformanceDataPoint[]
  >(data || []);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (data) {
      setPerformanceData(data);
      setLoading(false);
      return;
    }

    if (campaignId) {
      // Fetch from API when campaignId is provided
      fetch(`/api/campaigns/${campaignId}/performance`)
        .then((res) => res.json())
        .then((result) => {
          if (result.data) setPerformanceData(result.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [data, campaignId]);

  if (!isMounted || loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (performanceData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No performance data available</p>
          <p className="text-sm">Data will appear once campaigns are running</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={performanceData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="sent" fill="#94a3b8" name="Sent" />
        <Bar dataKey="opened" fill="#60a5fa" name="Opened" />
        <Bar dataKey="engaged" fill="#a78bfa" name="Engaged" />
        <Bar dataKey="converted" fill="#34d399" name="Converted" />
      </BarChart>
    </ResponsiveContainer>
  );
}
