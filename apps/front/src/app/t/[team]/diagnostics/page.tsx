"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface DiagnosticData {
  timestamp: string;
  environment: string;
  spaces: {
    configured: boolean;
    bucket: string;
    hasKey: boolean;
    hasSecret: boolean;
    keyPreview: string;
  };
  database: {
    configured: boolean;
    hasUrl: boolean;
    urlPreview: string;
  };
  signalhouse: {
    configured: boolean;
    hasApiKey: boolean;
    hasAuthToken: boolean;
    hasPhoneNumber: boolean;
  };
  ai: {
    hasOpenAI: boolean;
    hasAnthropic: boolean;
    hasPerplexity: boolean;
  };
  services: {
    hasTracerfy: boolean;
    hasRealEstateAPI: boolean;
    hasApollo: boolean;
    hasRedis: boolean;
  };
  criticalServicesConfigured: {
    spaces: boolean;
    database: boolean;
    sms: boolean;
  };
  allCriticalConfigured: boolean;
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/diagnostics")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">System Diagnostics</h1>
        <p>Loading diagnostics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">System Diagnostics</h1>
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-500">Failed to load diagnostics: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const StatusBadge = ({ status }: { status: boolean }) => {
    if (status) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Configured
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Missing
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">System Diagnostics</h1>
        <p className="text-muted-foreground">
          Environment: <code className="bg-muted px-2 py-1 rounded">{data.environment}</code>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Last checked: {new Date(data.timestamp).toLocaleString()}
        </p>
      </div>

      {/* Overall Health */}
      <Card className={`mb-6 ${data.allCriticalConfigured ? 'border-green-500' : 'border-red-500'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data.allCriticalConfigured ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                All Critical Services Configured
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-red-500" />
                Missing Critical Configuration
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">DO Spaces (File Storage)</p>
              <StatusBadge status={data.criticalServicesConfigured.spaces} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Database</p>
              <StatusBadge status={data.criticalServicesConfigured.database} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">SignalHouse (SMS)</p>
              <StatusBadge status={data.criticalServicesConfigured.sms} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DO Spaces Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>DigitalOcean Spaces (File Storage)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Overall Status</span>
              <StatusBadge status={data.spaces.configured} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Access Key (SPACES_KEY)</span>
              <div className="flex items-center gap-2">
                {data.spaces.hasKey ? (
                  <>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{data.spaces.keyPreview}</code>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </>
                ) : (
                  <>
                    <code className="text-xs bg-red-100 text-red-500 px-2 py-1 rounded">NOT SET</code>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Secret Key (SPACES_SECRET)</span>
              {data.spaces.hasSecret ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Bucket Name</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{data.spaces.bucket}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Overall Status</span>
              <StatusBadge status={data.database.configured} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Connection URL (DATABASE_URL)</span>
              {data.database.hasUrl ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{data.database.urlPreview}</code>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SignalHouse Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>SignalHouse (SMS Provider)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Overall Status</span>
              <StatusBadge status={data.signalhouse.configured} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Key</span>
              {data.signalhouse.hasApiKey ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auth Token</span>
              {data.signalhouse.hasAuthToken ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Default Phone Number</span>
              {data.signalhouse.hasPhoneNumber ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Providers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">OpenAI</span>
              {data.ai.hasOpenAI ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Anthropic (Claude)</span>
              {data.ai.hasAnthropic ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Perplexity</span>
              {data.ai.hasPerplexity ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Other Services */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Tracerfy (Skip Tracing)</span>
              {data.services.hasTracerfy ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">RealEstateAPI</span>
              {data.services.hasRealEstateAPI ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Apollo.io (B2B Data)</span>
              {data.services.hasApollo ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Redis (Caching)</span>
              {data.services.hasRedis ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {!data.allCriticalConfigured && (
        <Card className="mt-6 border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              How to Fix Missing Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-2">If testing on localhost:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to DigitalOcean App Platform dashboard</li>
                <li>Find your app settings → Environment Variables</li>
                <li>Copy the values for missing variables</li>
                <li>Add them to <code className="bg-muted px-1 rounded">apps/front/.env.local</code></li>
                <li>Restart your dev server</li>
              </ol>
            </div>
            <div>
              <p className="font-medium mb-2">If testing on production:</p>
              <p className="text-sm">The environment variables should already be set in DigitalOcean App Platform. If they're showing as missing, they need to be added in the DO dashboard.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
