'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
} from 'lucide-react';

interface BookingStats {
  totalBooked: number;
  confirmed: number;
  noShow: number;
  completed: number;
  rescheduled: number;
  avgBookingValue: number;
}

export default function BookingAnalyticsPage() {
  const [stats, setStats] = useState<BookingStats>({
    totalBooked: 0,
    confirmed: 0,
    noShow: 0,
    completed: 0,
    rescheduled: 0,
    avgBookingValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sabrina/stats?range=${dateRange}`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalBooked: data.totalBooked ?? 0,
            confirmed: data.confirmed ?? 0,
            noShow: data.noShow ?? 0,
            completed: data.completed ?? 0,
            rescheduled: data.rescheduled ?? 0,
            avgBookingValue: data.avgBookingValue ?? 0,
          });
        }
      } catch (err) {
        console.error('Failed to load booking stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [dateRange]);

  const confirmRate = stats.totalBooked > 0 ? ((stats.confirmed / stats.totalBooked) * 100).toFixed(1) : '0';
  const showRate = stats.confirmed > 0 ? (((stats.confirmed - stats.noShow) / stats.confirmed) * 100).toFixed(1) : '0';
  const completionRate = stats.confirmed > 0 ? ((stats.completed / stats.confirmed) * 100).toFixed(1) : '0';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SABRINA Booking Analytics</h1>
          <p className="text-muted-foreground">
            Track appointment booking and show rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange(dateRange)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : (stats.totalBooked ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Appointments booked by SABRINA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : (stats.confirmed ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {confirmRate}% confirmation rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : (stats.completed ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Shows</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : (stats.noShow ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {showRate}% show rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">Booked</div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-blue-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: '100%' }}
                >
                  {(stats.totalBooked ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">Confirmed</div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-green-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: `${confirmRate}%` }}
                >
                  {(stats.confirmed ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">Showed Up</div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-yellow-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: `${showRate}%` }}
                >
                  {((stats.confirmed ?? 0) - (stats.noShow ?? 0)).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">Completed</div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-purple-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: `${completionRate}%` }}
                >
                  {(stats.completed ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Booking Value */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Average Booking Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {loading ? '...' : `$${(stats.avgBookingValue ?? 0).toLocaleString()}`}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Average deal value from SABRINA bookings
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
