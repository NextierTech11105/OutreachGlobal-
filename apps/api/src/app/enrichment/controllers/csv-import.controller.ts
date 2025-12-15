import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { businessOwnerTable } from "@/database/schema-alias";
import { AuthGuard } from "@/auth/guards/auth.guard";
import { CsvImportService } from "../services/csv-import.service";

interface CsvImportRequest {
  spacesKey: string; // The S3 key of the uploaded CSV file
  schemaId: string; // e.g., 'ny_business', 'motorcycle_dealers'
}

interface CsvImportResponse {
  success: boolean;
  message: string;
  recordsProcessed: number;
  recordsInserted: number;
  errors: string[];
}

@ApiTags("CSV Import")
@Controller("csv-import")
@UseGuards(AuthGuard)
export class CsvImportController {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private csvImportService: CsvImportService,
  ) {}

  @Post("process")
  @ApiOperation({ summary: "Process uploaded CSV and import business/owner data" })
  @ApiResponse({
    status: 200,
    description: "CSV processed successfully",
    type: Object,
  })
  async processCsv(@Body() importRequest: CsvImportRequest): Promise<CsvImportResponse> {
    const { spacesKey, schemaId } = importRequest;

    try {
      const result = await this.csvImportService.processCsvFile(spacesKey, schemaId);

      return {
        success: true,
        message: `Successfully processed ${result.recordsProcessed} records, inserted ${result.recordsInserted}`,
        recordsProcessed: result.recordsProcessed,
        recordsInserted: result.recordsInserted,
        errors: result.errors,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process CSV: ${error.message}`,
        recordsProcessed: 0,
        recordsInserted: 0,
        errors: [error.message],
      };
    }
  }
}