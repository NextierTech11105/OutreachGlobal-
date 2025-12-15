"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Building, Users, CheckCircle, XCircle } from "lucide-react";

interface PhoneNumber {
  number: string;
  type: "mobile" | "landline" | "business" | "unknown";
  carrier?: string;
  isValid: boolean;
}

interface OwnershipEntity {
  type: "individual" | "business" | "property" | "trust";
  name: string;
  address?: string;
  phoneNumbers?: PhoneNumber[];
  ownedByOwner?: boolean;
}

interface OwnershipRelationship {
  type: "owner" | "beneficial_owner" | "family_member" | "trust_beneficiary" | "related_entity" | "investment_vehicle";
  targetEntity: {
    type: string;
    name: string;
    address?: string;
  };
  percentage?: number;
  relationship: string;
}

interface OwnershipLayer {
  layer: number;
  entity: OwnershipEntity;
  relationships: OwnershipRelationship[];
  confidence: number;
  source: string;
  discoveredAt: Date;
}

interface AutoTag {
  entityId: string;
  entityType: string;
  tag: string;
  confidence: number;
  source: string;
  relationshipPath: string[];
}

interface SkipTraceResult {
  target: {
    fullName: string;
    businessAddress: string;
    businessName?: string;
  };
  layers: OwnershipLayer[];
  networkSize: number;
  lastUpdated: Date;
  autoTags: AutoTag[];
}

interface OwnershipNetworkVisualizerProps {
  data: SkipTraceResult;
  onEntityClick?: (entity: OwnershipEntity) => void;
}

export const OwnershipNetworkVisualizer: React.FC<OwnershipNetworkVisualizerProps> = ({
  data,
  onEntityClick,
}) => {
  const { layers, autoTags } = data;

  // Group layers by depth for visualization
  const layersByDepth = useMemo(() => {
    const grouped: Record<number, OwnershipLayer[]> = {};
    layers.forEach(layer => {
      if (!grouped[layer.layer]) {
        grouped[layer.layer] = [];
      }
      grouped[layer.layer].push(layer);
    });
    return grouped;
  }, [layers]);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "individual":
        return <Users className="h-4 w-4" />;
      case "business":
        return <Building className="h-4 w-4" />;
      case "property":
        return <MapPin className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const getEntityColor = (type: string) => {
    switch (type) {
      case "individual":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "business":
        return "bg-green-100 text-green-800 border-green-200";
      case "property":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case "owner":
        return "text-green-600";
      case "beneficial_owner":
        return "text-blue-600";
      case "family_member":
        return "text-purple-600";
      case "related_entity":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const renderEntityCard = (layer: OwnershipLayer) => {
    const { entity } = layer;
    const entityTags = autoTags.filter(tag => tag.entityId === `${entity.type}:${entity.name}:${entity.address || ""}`);

    return (
      <Card
        key={`${entity.type}-${entity.name}`}
        className={`cursor-pointer transition-all hover:shadow-md ${getEntityColor(entity.type)}`}
        onClick={() => onEntityClick?.(entity)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {getEntityIcon(entity.type)}
            <span className="truncate">{entity.name}</span>
            {entity.ownedByOwner !== undefined && (
              entity.ownedByOwner ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {entity.address && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{entity.address}</span>
              </div>
            )}

            {entity.phoneNumbers && entity.phoneNumbers.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{entity.phoneNumbers.length} phone{entity.phoneNumbers.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {entityTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entityTags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag.tag}
                  </Badge>
                ))}
                {entityTags.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{entityTags.length - 2}
                  </Badge>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Layer {layer.layer} • {layer.confidence * 100}% confidence
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRelationships = (layer: OwnershipLayer) => {
    if (layer.relationships.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium">Relationships</h4>
        {layer.relationships.slice(0, 3).map((rel, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span className={`font-medium ${getRelationshipColor(rel.type)}`}>
              {rel.type.replace('_', ' ')}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="truncate">{rel.targetEntity.name}</span>
            {rel.percentage && (
              <Badge variant="outline" className="text-xs">
                {rel.percentage}%
              </Badge>
            )}
          </div>
        ))}
        {layer.relationships.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{layer.relationships.length - 3} more relationships
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Network Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ownership Network Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{layers.filter(l => l.entity.type === 'individual').length}</div>
              <div className="text-sm text-muted-foreground">Individuals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{layers.filter(l => l.entity.type === 'business').length}</div>
              <div className="text-sm text-muted-foreground">Businesses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{layers.filter(l => l.entity.type === 'property').length}</div>
              <div className="text-sm text-muted-foreground">Properties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{autoTags.length}</div>
              <div className="text-sm text-muted-foreground">Auto Tags</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layered Network Visualization */}
      <div className="space-y-8">
        {Object.entries(layersByDepth)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([depth, layerEntities]) => (
            <div key={depth} className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {depth}
                </div>
                Layer {depth}
                {depth === '0' && <Badge variant="default">Target</Badge>}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {layerEntities.map(layer => (
                  <div key={`${layer.entity.type}-${layer.entity.name}`} className="space-y-2">
                    {renderEntityCard(layer)}
                    {renderRelationships(layer)}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Auto Tags Summary */}
      {autoTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Generated Intelligence Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {autoTags.map((tag, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  <span>{tag.tag}</span>
                  <span className="text-xs opacity-70">
                    {(tag.confidence * 100).toFixed(0)}%
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};