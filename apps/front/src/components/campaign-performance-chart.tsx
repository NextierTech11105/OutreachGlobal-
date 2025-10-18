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

// Mock performance data
const mockPerformanceData = [
  {
    name: "May 1",
    sent: 25,
    opened: 18,
    engaged: 10,
    converted: 4,
  },
  {
    name: "May 2",
    sent: 30,
    opened: 22,
    engaged: 12,
    converted: 5,
  },
  {
    name: "May 3",
    sent: 35,
    opened: 25,
    engaged: 15,
    converted: 6,
  },
  {
    name: "May 4",
    sent: 40,
    opened: 30,
    engaged: 18,
    converted: 8,
  },
  {
    name: "May 5",
    sent: 45,
    opened: 32,
    engaged: 20,
    converted: 9,
  },
  {
    name: "May 6",
    sent: 50,
    opened: 38,
    engaged: 22,
    converted: 10,
  },
  {
    name: "May 7",
    sent: 55,
    opened: 40,
    engaged: 25,
    converted: 12,
  },
  {
    name: "May 8",
    sent: 60,
    opened: 45,
    engaged: 28,
    converted: 14,
  },
];

export function CampaignPerformanceChart() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        Loading chart...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={mockPerformanceData}
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
