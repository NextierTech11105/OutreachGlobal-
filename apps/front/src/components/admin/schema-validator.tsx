"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export function SchemaValidator() {
  const [jsonInput, setJsonInput] = useState("");
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateSchema = () => {
    setIsValidating(true);

    // Simulate validation process
    setTimeout(() => {
      try {
        const parsed = JSON.parse(jsonInput);

        // Simple validation rules
        const errors = [];

        // Check if it's an object
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
          errors.push("Schema must be a JSON object");
        } else {
          // Check each entity
          Object.entries(parsed).forEach(([entityKey, entityValue]) => {
            const entity = entityValue as { name?: string; fields?: { name?: string; type?: string }[] };
            if (!entity.name) {
              errors.push(`Entity "${entityKey}" is missing a name property`);
            }

            if (!entity.fields || !Array.isArray(entity.fields)) {
              errors.push(`Entity "${entityKey}" must have a fields array`);
            } else {
              // Check each field
              entity.fields.forEach((field: { name?: string; type?: string }, index: number) => {
                if (!field.name) {
                  errors.push(
                    `Field at index ${index} in "${entityKey}" is missing a name property`,
                  );
                }
                if (!field.type) {
                  errors.push(
                    `Field "${field.name || index}" in "${entityKey}" is missing a type property`,
                  );
                }
              });
            }
          });
        }

        setValidationResult({
          valid: errors.length === 0,
          errors: errors,
        });
      } catch (error) {
        setValidationResult({
          valid: false,
          errors: ["Invalid JSON format: " + (error instanceof Error ? error.message : String(error))],
        });
      }

      setIsValidating(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schema Validator</CardTitle>
        <CardDescription>
          Validate your schema JSON against the expected format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Paste your schema JSON here..."
          className="min-h-[200px] font-mono"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />

        <Button
          onClick={validateSchema}
          disabled={isValidating || !jsonInput.trim()}
          className="w-full"
        >
          {isValidating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            "Validate Schema"
          )}
        </Button>

        {validationResult && (
          <Alert variant={validationResult.valid ? "default" : "destructive"}>
            {validationResult.valid ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your schema is valid and follows the expected format.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Failed</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
