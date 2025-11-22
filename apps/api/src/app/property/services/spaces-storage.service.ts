import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import * as Papa from "papaparse";

interface PropertyCSVData {
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  ownerName: string;
  estimatedValue: number;
  equityPercent: number;
  yearsOwned: number;
  absenteeOwner: boolean;
  preForeclosure: boolean;
  mlsListed: boolean;
  vacant: boolean;
  lastSaleDate: string;
  lenderName: string;
  loanAmount: number;
  ownerPhone1: string;
  ownerPhone2: string;
  ownerEmail: string;
  [key: string]: any;
}

@Injectable()
export class SpacesStorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private config: ConfigService) {
    const accessKeyId = this.config.get<string>("DO_SPACES_ACCESS_KEY");
    const secretAccessKey = this.config.get<string>("DO_SPACES_SECRET_KEY");
    const endpoint = this.config.get<string>("DO_SPACES_ENDPOINT");
    this.bucketName = this.config.get<string>("DO_SPACES_BUCKET") || "nextier-property-data";
    this.region = this.config.get<string>("DO_SPACES_REGION") || "nyc3";

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      throw new Error("DigitalOcean Spaces credentials not configured");
    }

    this.s3Client = new S3Client({
      endpoint,
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
    });
  }

  async uploadPropertyCSV(
    savedSearchId: string,
    properties: any[],
    searchName: string,
  ): Promise<{ fileUrl: string; fileName: string; recordCount: number }> {
    const csvData = this.transformPropertiesToCSV(properties);
    const csvString = Papa.unparse(csvData);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `saved-searches/${savedSearchId}/${searchName}_${timestamp}.csv`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: csvString,
      ContentType: "text/csv",
      ACL: "private",
      Metadata: {
        savedSearchId,
        searchName,
        recordCount: csvData.length.toString(),
        createdAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    const fileUrl = `https://${this.bucketName}.${this.region}.digitaloceanspaces.com/${fileName}`;

    return {
      fileUrl,
      fileName,
      recordCount: csvData.length,
    };
  }

  async uploadPropertyDetailBatch(
    savedSearchId: string,
    batchNumber: number,
    properties: any[],
  ): Promise<{ fileUrl: string; fileName: string }> {
    const csvData = this.transformPropertiesToCSV(properties);
    const csvString = Papa.unparse(csvData);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `property-details/${savedSearchId}/batch_${batchNumber}_${timestamp}.csv`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: csvString,
      ContentType: "text/csv",
      ACL: "private",
      Metadata: {
        savedSearchId,
        batchNumber: batchNumber.toString(),
        recordCount: csvData.length.toString(),
        createdAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    const fileUrl = `https://${this.bucketName}.${this.region}.digitaloceanspaces.com/${fileName}`;

    return { fileUrl, fileName };
  }

  async uploadSkipTraceBatch(
    savedSearchId: string,
    batchNumber: number,
    skipTraceResults: any[],
  ): Promise<{ fileUrl: string; fileName: string }> {
    const csvData = this.transformSkipTraceToCSV(skipTraceResults);
    const csvString = Papa.unparse(csvData);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `skip-trace/${savedSearchId}/batch_${batchNumber}_${timestamp}.csv`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: csvString,
      ContentType: "text/csv",
      ACL: "private",
      Metadata: {
        savedSearchId,
        batchNumber: batchNumber.toString(),
        recordCount: csvData.length.toString(),
        createdAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    const fileUrl = `https://${this.bucketName}.${this.region}.digitaloceanspaces.com/${fileName}`;

    return { fileUrl, fileName };
  }

  async uploadEventHistory(
    savedSearchId: string,
    events: any[],
  ): Promise<{ fileUrl: string; fileName: string }> {
    const csvData = events.map((event) => ({
      propertyId: event.propertyId,
      eventType: event.event,
      priority: event.priority,
      detectedAt: event.detectedAt,
      oldValue: JSON.stringify(event.oldValue),
      newValue: JSON.stringify(event.newValue),
      campaignTriggered: event.campaignTriggered ? "Yes" : "No",
    }));

    const csvString = Papa.unparse(csvData);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `event-history/${savedSearchId}/events_${timestamp}.csv`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: csvString,
      ContentType: "text/csv",
      ACL: "private",
      Metadata: {
        savedSearchId,
        recordCount: csvData.length.toString(),
        createdAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    const fileUrl = `https://${this.bucketName}.${this.region}.digitaloceanspaces.com/${fileName}`;

    return { fileUrl, fileName };
  }

  private transformPropertiesToCSV(properties: any[]): PropertyCSVData[] {
    return properties.map((prop) => ({
      propertyId: prop.id || prop.propertyId || "",
      address: prop.address?.streetAddress || prop.address || "",
      city: prop.address?.city || prop.city || "",
      state: prop.address?.state || prop.state || "",
      zipCode: prop.address?.zip || prop.zipCode || "",
      propertyType: prop.propertyInfo?.propertyType || prop.propertyType || "",
      ownerName: prop.ownerInfo?.owner1FullName || prop.ownerName || "",
      estimatedValue: prop.estimatedValue || 0,
      equityPercent: prop.equityPercent || 0,
      yearsOwned: prop.yearsOwned || 0,
      absenteeOwner: prop.absenteeOwner || false,
      preForeclosure: prop.preForeclosure || false,
      mlsListed: prop.mlsListed || false,
      vacant: prop.vacant || false,
      lastSaleDate: prop.lastSaleDate || "",
      lenderName: prop.mortgageInfo?.lenderName || "",
      loanAmount: prop.mortgageInfo?.loanAmount || 0,
      ownerPhone1: prop.skipTrace?.identity?.phones?.[0]?.number || "",
      ownerPhone2: prop.skipTrace?.identity?.phones?.[1]?.number || "",
      ownerEmail: prop.skipTrace?.identity?.emails?.[0]?.email || "",
      buildingSquareFeet: prop.propertyInfo?.buildingSquareFeet || 0,
      lotSquareFeet: prop.propertyInfo?.lotSquareFeet || 0,
      yearBuilt: prop.propertyInfo?.yearBuilt || 0,
      bedrooms: prop.propertyInfo?.bedrooms || 0,
      bathrooms: prop.propertyInfo?.bathrooms || 0,
      taxAmount: prop.taxInfo?.taxAmount || 0,
      assessedValue: prop.taxInfo?.assessedValue || 0,
      deedType: prop.deedType || "",
      lisPendens: prop.lisPendens || false,
      taxLien: prop.taxLien || false,
      bankruptcy: prop.bankruptcy || false,
      propertiesOwned: prop.propertiesOwned || 0,
      portfolioValue: prop.portfolioValue || 0,
    }));
  }

  private transformSkipTraceToCSV(skipTraceResults: any[]): any[] {
    return skipTraceResults.map((result) => ({
      propertyId: result.propertyId,
      ownerName: result.ownerName,
      matchConfidence: result.skipTrace?.confidence || 0,
      phone1: result.skipTrace?.identity?.phones?.[0]?.number || "",
      phone1Type: result.skipTrace?.identity?.phones?.[0]?.type || "",
      phone1Valid: result.skipTrace?.identity?.phones?.[0]?.valid ? "Yes" : "No",
      phone2: result.skipTrace?.identity?.phones?.[1]?.number || "",
      phone2Type: result.skipTrace?.identity?.phones?.[1]?.type || "",
      phone2Valid: result.skipTrace?.identity?.phones?.[1]?.valid ? "Yes" : "No",
      email1: result.skipTrace?.identity?.emails?.[0]?.email || "",
      email1Valid: result.skipTrace?.identity?.emails?.[0]?.valid ? "Yes" : "No",
      currentAddress: result.skipTrace?.identity?.currentAddress?.address || "",
      currentCity: result.skipTrace?.identity?.currentAddress?.city || "",
      currentState: result.skipTrace?.identity?.currentAddress?.state || "",
      currentZip: result.skipTrace?.identity?.currentAddress?.zip || "",
    }));
  }

  async getFileUrl(fileName: string): Promise<string> {
    return `https://${this.bucketName}.${this.region}.digitaloceanspaces.com/${fileName}`;
  }

  async listSearchFiles(savedSearchId: string): Promise<string[]> {
    return [
      `saved-searches/${savedSearchId}/`,
      `property-details/${savedSearchId}/`,
      `skip-trace/${savedSearchId}/`,
      `event-history/${savedSearchId}/`,
    ];
  }
}
