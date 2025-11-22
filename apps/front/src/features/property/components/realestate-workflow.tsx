"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { $http } from "@/lib/http";
import { CheckCircle2, Circle, Lock } from "lucide-react";

/**
 * PROPER EXECUTION SEQUENCE WORKFLOW
 *
 * STEP 1: STATIC ANCHORS (Required - Foundation)
 * STEP 2: TIME & OCCUPANCY (Macro Filters)
 * STEP 3: COUNT (Get Total + Blocks)
 * STEP 4: DYNAMIC EVENTS (Optional Filters)
 * STEP 5: SAVE SEARCH (Save Property IDs)
 * STEP 6: ENRICH (Batch 250 - Get Detail + Lender + Mortgage)
 * STEP 7: SKIPTRACE (Get Owner Phones/Emails)
 * STEP 8: TRACK (Auto-enabled Daily Monitoring)
 */

type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface WorkflowState {
  step1Complete: boolean; // Static anchors filled
  step2Complete: boolean; // Time & occupancy filled
  step3Complete: boolean; // COUNT executed
  step4Complete: boolean; // Dynamic filters applied (optional)
  step5Complete: boolean; // SAVE executed
  step6Complete: boolean; // ENRICH executed
  step7Complete: boolean; // SKIPTRACE executed
  step8Complete: boolean; // TRACK enabled
}

export function RealEstateWorkflow() {
  const teamId = "test";

  // WORKFLOW STATE MACHINE
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    step1Complete: false,
    step2Complete: false,
    step3Complete: false,
    step4Complete: false,
    step5Complete: false,
    step6Complete: false,
    step7Complete: false,
    step8Complete: false,
  });

  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);

  // STEP 1: STATIC ANCHORS
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [propertyType, setPropertyType] = useState("");

  // STEP 2: TIME & OCCUPANCY
  const [yearsOwned, setYearsOwned] = useState<number>(5); // Default 5+ years
  const [absenteeOwner, setAbsenteeOwner] = useState(false);
  const [ownerOccupied, setOwnerOccupied] = useState(false);

  // STEP 3: COUNT RESULT
  const [countResult, setCountResult] = useState<{count: number; blocks: number} | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  // STEP 4: DYNAMIC EVENT FILTERS
  const [preForeclosure, setPreForeclosure] = useState(false);
  const [noticeOfDefault, setNoticeOfDefault] = useState(false);
  const [lisPendens, setLisPendens] = useState(false);
  const [judgment, setJudgment] = useState(false);
  const [foreclosure, setForeclosure] = useState(false);
  const [mlsListed, setMlsListed] = useState(false);
  const [vacant, setVacant] = useState(false);

  // STEP 5: SAVE SEARCH
  const [searchName, setSearchName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedSearchId, setSavedSearchId] = useState("");

  // STEP 6: ENRICH
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ total: 0, enriched: 0 });

  // STEP 7: SKIPTRACE
  const [skiptraceLoading, setSkiptraceLoading] = useState(false);
  const [skiptraceProgress, setSkiptraceProgress] = useState({ total: 0, traced: 0 });

  /**
   * STEP 1: Validate Static Anchors
   */
  const validateStep1 = () => {
    return state && county && propertyType;
  };

  const completeStep1 = () => {
    if (!validateStep1()) {
      toast.error("Please fill State, County, and Property Type");
      return;
    }
    setWorkflowState({ ...workflowState, step1Complete: true });
    setCurrentStep(2);
    toast.success("Static anchors set! Now configure time & occupancy filters.");
  };

  /**
   * STEP 2: Validate Time & Occupancy
   */
  const validateStep2 = () => {
    return yearsOwned >= 5; // Minimum 5 years ownership
  };

  const completeStep2 = () => {
    if (!validateStep2()) {
      toast.error("Years Owned must be at least 5 years");
      return;
    }
    setWorkflowState({ ...workflowState, step2Complete: true });
    setCurrentStep(3);
    toast.success("Time & occupancy filters set! Ready to COUNT properties.");
  };

  /**
   * STEP 3: Execute COUNT Query
   */
  const executeCount = async () => {
    setCountLoading(true);
    try {
      const { data } = await $http.post(`/${teamId}/realestate-api/property-count`, {
        state,
        county,
        zipCode: zipCode || undefined,
        propertyType,
        // Time & Occupancy (will be client-side filtered in future)
        // yearsOwned,
        // absenteeOwner,
        // ownerOccupied,
      });

      const count = data.count || 0;
      const blocks = Math.ceil(count / 10000);

      setCountResult({ count, blocks });
      setWorkflowState({ ...workflowState, step3Complete: true });
      setCurrentStep(4);

      toast.success(`Found ${count.toLocaleString()} properties! (${blocks} blocks of 10k)`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Count query failed");
    } finally {
      setCountLoading(false);
    }
  };

  /**
   * STEP 4: Apply Dynamic Event Filters (Optional)
   * Re-run COUNT when filters change
   */
  const applyDynamicFilters = async () => {
    setCountLoading(true);
    try {
      const { data } = await $http.post(`/${teamId}/realestate-api/property-count`, {
        state,
        county,
        zipCode: zipCode || undefined,
        propertyType,
        // Dynamic Event Filters
        preForeclosure: preForeclosure || undefined,
        lisPendens: lisPendens || undefined,
        foreclosure: foreclosure || undefined,
        // noticeOfDefault, judgment, mlsListed, vacant will be added when API supports them
      });

      const count = data.count || 0;
      const blocks = Math.ceil(count / 10000);

      setCountResult({ count, blocks });
      setWorkflowState({ ...workflowState, step4Complete: true });

      toast.success(`Filtered to ${count.toLocaleString()} properties! (${blocks} blocks of 10k)`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Filter query failed");
    } finally {
      setCountLoading(false);
    }
  };

  /**
   * STEP 5: SAVE SEARCH
   */
  const saveSearch = async () => {
    if (!searchName) {
      toast.error("Please enter a search name");
      return;
    }

    setSaveLoading(true);
    try {
      const { data } = await $http.post(`/${teamId}/realestate-api/saved-search/create`, {
        searchName,
        searchQuery: {
          state,
          county,
          zipCode,
          propertyType,
          yearsOwned,
          absenteeOwner,
          ownerOccupied,
          preForeclosure,
          lisPendens,
          foreclosure,
        },
        batchJobEnabled: "true", // Enable daily tracking
      });

      setSavedSearchId(data.id);
      setWorkflowState({ ...workflowState, step5Complete: true });
      setCurrentStep(6);

      toast.success(`Saved search "${searchName}"! Property IDs saved to Spaces in ${countResult?.blocks} blocks.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save search");
    } finally {
      setSaveLoading(false);
    }
  };

  /**
   * STEP 6: ENRICH (Batch 250)
   */
  const enrichSearch = async () => {
    setEnrichLoading(true);
    try {
      const { data } = await $http.post(`/${teamId}/realestate-api/enrich-saved-search`, {
        searchName,
        includeSkipTrace: false, // Don't skip trace yet (that's Step 7)
        maxProperties: 1000, // Start with first 1000
      });

      setEnrichProgress({ total: data.totalProcessed, enriched: data.enriched });
      setWorkflowState({ ...workflowState, step6Complete: true });
      setCurrentStep(7);

      toast.success(`Enriched ${data.enriched}/${data.totalProcessed} properties with full detail + lender + mortgage info!`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Enrichment failed");
    } finally {
      setEnrichLoading(false);
    }
  };

  /**
   * STEP 7: SKIPTRACE (Get Owner Phones/Emails)
   */
  const skiptraceSearch = async () => {
    setSkiptraceLoading(true);
    try {
      // Re-run enrichment with skip trace enabled
      const { data } = await $http.post(`/${teamId}/realestate-api/enrich-saved-search`, {
        searchName,
        includeSkipTrace: true, // Enable skip trace
        maxProperties: 1000,
      });

      setSkiptraceProgress({ total: data.totalProcessed, traced: data.enriched });
      setWorkflowState({ ...workflowState, step7Complete: true });
      setCurrentStep(8);

      toast.success(`Skip traced ${data.enriched} owners! Owner phones/emails ready for campaigns.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Skip trace failed");
    } finally {
      setSkiptraceLoading(false);
    }
  };

  /**
   * STEP 8: TRACK (Auto-enabled)
   */
  const enableTracking = () => {
    setWorkflowState({ ...workflowState, step8Complete: true });
    toast.success("Daily tracking enabled! System will monitor for events and trigger campaigns.");
  };

  return (
    <div className="space-y-6">
      {/* WORKFLOW PROGRESS TRACKER */}
      <Card>
        <CardHeader>
          <CardTitle>Property Search Workflow</CardTitle>
          <CardDescription>Follow the proper sequence to execute property search and tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => {
              const stepKey = `step${step}Complete` as keyof WorkflowState;
              const isComplete = workflowState[stepKey];
              const isCurrent = currentStep === step;
              const isLocked = step > currentStep && !isComplete;

              return (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isComplete ? "bg-green-600 text-white" :
                    isCurrent ? "bg-blue-600 text-white" :
                    "bg-gray-200 text-gray-400"
                  }`}>
                    {isComplete ? <CheckCircle2 className="h-5 w-5" /> :
                     isLocked ? <Lock className="h-5 w-5" /> :
                     <Circle className="h-5 w-5" />}
                  </div>
                  <span className="text-xs mt-1">Step {step}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* STEP 1: STATIC ANCHORS */}
      <Card className={currentStep === 1 ? "border-blue-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={workflowState.step1Complete ? "default" : "secondary"}>Step 1</Badge>
            Static Anchors (Required Foundation)
          </CardTitle>
          <CardDescription>Location + Property Type (Long-term, Static Filters)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>State *</Label>
              <Select value={state} onValueChange={setState} disabled={workflowState.step1Complete}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="NJ">New Jersey</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="CT">Connecticut</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>County *</Label>
              <Input
                placeholder="e.g. Nassau"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                disabled={workflowState.step1Complete}
              />
            </div>

            <div>
              <Label>Zip Code (Optional)</Label>
              <Input
                placeholder="e.g. 11530"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                disabled={workflowState.step1Complete}
              />
            </div>

            <div>
              <Label>Property Type *</Label>
              <Select value={propertyType} onValueChange={setPropertyType} disabled={workflowState.step1Complete}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={completeStep1}
            disabled={!validateStep1() || workflowState.step1Complete}
            className="w-full"
          >
            {workflowState.step1Complete ? "Step 1 Complete ✓" : "Continue to Step 2 →"}
          </Button>
        </CardContent>
      </Card>

      {/* STEP 2: TIME & OCCUPANCY */}
      <Card className={currentStep === 2 ? "border-blue-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={workflowState.step2Complete ? "default" : "secondary"}>Step 2</Badge>
            Time & Occupancy (Macro Filters)
          </CardTitle>
          <CardDescription>Years Owned + Occupancy Type (Static, Slow-changing)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Years Owned (Minimum 5)</Label>
              <Input
                type="number"
                value={yearsOwned}
                onChange={(e) => setYearsOwned(parseInt(e.target.value))}
                min={5}
                disabled={!workflowState.step1Complete || workflowState.step2Complete}
              />
            </div>

            <div className="space-y-2">
              <Label>Occupancy Type</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="absentee"
                  checked={absenteeOwner}
                  onCheckedChange={(checked) => setAbsenteeOwner(checked as boolean)}
                  disabled={!workflowState.step1Complete || workflowState.step2Complete}
                />
                <label htmlFor="absentee" className="text-sm">Absentee Owner</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerOcc"
                  checked={ownerOccupied}
                  onCheckedChange={(checked) => setOwnerOccupied(checked as boolean)}
                  disabled={!workflowState.step1Complete || workflowState.step2Complete}
                />
                <label htmlFor="ownerOcc" className="text-sm">Owner Occupied</label>
              </div>
            </div>
          </div>

          <Button
            onClick={completeStep2}
            disabled={!workflowState.step1Complete || !validateStep2() || workflowState.step2Complete}
            className="w-full"
          >
            {workflowState.step2Complete ? "Step 2 Complete ✓" : "Continue to COUNT →"}
          </Button>
        </CardContent>
      </Card>

      {/* STEP 3: COUNT */}
      <Card className={currentStep === 3 ? "border-blue-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={workflowState.step3Complete ? "default" : "secondary"}>Step 3</Badge>
            COUNT Properties
          </CardTitle>
          <CardDescription>Get total count and 10k block estimation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {countResult && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {countResult.count.toLocaleString()} Properties
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                {countResult.blocks} blocks of 10k
              </div>
            </div>
          )}

          <Button
            onClick={executeCount}
            disabled={!workflowState.step2Complete || countLoading}
            size="lg"
            className="w-full h-14 text-xl font-bold bg-blue-600 hover:bg-blue-700"
          >
            {countLoading ? "COUNTING..." : countResult ? "RE-COUNT" : "COUNT"}
          </Button>
        </CardContent>
      </Card>

      {/* STEP 4: DYNAMIC EVENT FILTERS */}
      <Card className={currentStep === 4 ? "border-blue-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={workflowState.step4Complete ? "default" : "secondary"}>Step 4</Badge>
            Dynamic Event Filters (Optional)
          </CardTitle>
          <CardDescription>Narrow by distress signals and property events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-red-600 font-semibold">Distress Events</Label>
              {[
                { label: "Pre-Foreclosure", state: preForeclosure, setter: setPreForeclosure },
                { label: "Notice of Default", state: noticeOfDefault, setter: setNoticeOfDefault },
                { label: "Lis Pendens", state: lisPendens, setter: setLisPendens },
                { label: "Judgment", state: judgment, setter: setJudgment },
                { label: "Foreclosure", state: foreclosure, setter: setForeclosure },
              ].map((filter) => (
                <div key={filter.label} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filter.state}
                    onCheckedChange={(checked) => filter.setter(checked as boolean)}
                    disabled={!workflowState.step3Complete}
                  />
                  <label className="text-sm">{filter.label}</label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-orange-600 font-semibold">Property Events</Label>
              {[
                { label: "MLS Listed", state: mlsListed, setter: setMlsListed },
                { label: "Vacant", state: vacant, setter: setVacant },
              ].map((filter) => (
                <div key={filter.label} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filter.state}
                    onCheckedChange={(checked) => filter.setter(checked as boolean)}
                    disabled={!workflowState.step3Complete}
                  />
                  <label className="text-sm">{filter.label}</label>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={applyDynamicFilters}
            disabled={!workflowState.step3Complete || countLoading}
            className="w-full"
          >
            {countLoading ? "FILTERING..." : "Apply Filters & Re-COUNT"}
          </Button>
        </CardContent>
      </Card>

      {/* STEP 5: SAVE SEARCH */}
      <Card className={currentStep === 5 ? "border-blue-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={workflowState.step5Complete ? "default" : "secondary"}>Step 5</Badge>
            SAVE Search
          </CardTitle>
          <CardDescription>Save property IDs to DigitalOcean Spaces ({countResult?.blocks} blocks)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Search Name</Label>
            <Input
              placeholder="e.g. MFH-Queens-Absentee"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              disabled={!workflowState.step3Complete || workflowState.step5Complete}
            />
          </div>

          <Button
            onClick={saveSearch}
            disabled={!workflowState.step3Complete || !searchName || saveLoading || workflowState.step5Complete}
            size="lg"
            className="w-full h-14 text-xl font-bold bg-green-600 hover:bg-green-700"
          >
            {saveLoading ? "SAVING..." : workflowState.step5Complete ? "SAVED ✓" : "SAVE SEARCH"}
          </Button>
        </CardContent>
      </Card>

      {/* STEP 6: ENRICH */}
      <Card className={currentStep === 6 ? "border-blue-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={workflowState.step6Complete ? "default" : "secondary"}>Step 6</Badge>
            ENRICH (Batch 250)
          </CardTitle>
          <CardDescription>Get Property Detail + Lender + Mortgage Amount</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrichProgress.total > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-sm text-purple-700 dark:text-purple-300">
                Enriched: {enrichProgress.enriched}/{enrichProgress.total} properties
              </div>
            </div>
          )}

          <Button
            onClick={enrichSearch}
            disabled={!workflowState.step5Complete || enrichLoading || workflowState.step6Complete}
            size="lg"
            className="w-full h-14 text-xl font-bold bg-purple-600 hover:bg-purple-700"
          >
            {enrichLoading ? "ENRICHING..." : workflowState.step6Complete ? "ENRICHED ✓" : "ENRICH"}
          </Button>
        </CardContent>
      </Card>

      {/* STEP 7: SKIPTRACE */}
      <Card className={currentStep === 7 ? "border-blue-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={workflowState.step7Complete ? "default" : "secondary"}>Step 7</Badge>
            SKIPTRACE
          </CardTitle>
          <CardDescription>Get Owner Phones + Emails for Campaigns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {skiptraceProgress.total > 0 && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-sm text-orange-700 dark:text-orange-300">
                Skip Traced: {skiptraceProgress.traced}/{skiptraceProgress.total} owners
              </div>
            </div>
          )}

          <Button
            onClick={skiptraceSearch}
            disabled={!workflowState.step6Complete || skiptraceLoading || workflowState.step7Complete}
            size="lg"
            className="w-full h-14 text-xl font-bold bg-orange-600 hover:bg-orange-700"
          >
            {skiptraceLoading ? "SKIP TRACING..." : workflowState.step7Complete ? "SKIP TRACED ✓" : "SKIPTRACE"}
          </Button>
        </CardContent>
      </Card>

      {/* STEP 8: TRACK */}
      <Card className={currentStep === 8 ? "border-blue-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={workflowState.step8Complete ? "default" : "secondary"}>Step 8</Badge>
            TRACK (Auto-Enabled)
          </CardTitle>
          <CardDescription>Daily monitoring for events → Auto-trigger campaigns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-sm text-green-700 dark:text-green-300">
              {workflowState.step7Complete ?
                "Tracking enabled! System will monitor saved property IDs daily at midnight." :
                "Complete Skip Trace to enable tracking"}
            </div>
          </div>

          <Button
            onClick={enableTracking}
            disabled={!workflowState.step7Complete || workflowState.step8Complete}
            size="lg"
            className="w-full h-14 text-xl font-bold bg-green-600 hover:bg-green-700"
          >
            {workflowState.step8Complete ? "TRACKING ENABLED ✓" : "ENABLE TRACKING"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
