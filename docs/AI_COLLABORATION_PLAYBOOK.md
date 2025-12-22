# AI Collaboration Playbook

## Table of Contents
1. [Quick Reference Prompts](#quick-reference-prompts)
2. [Best Practices for AI Collaboration](#best-practices-for-ai-collaboration)
3. [Development Workflows](#development-workflows)
4. [Testing Strategies](#testing-strategies)
5. [Debugging Processes](#debugging-processes)
6. [Code Optimization](#code-optimization)
7. [Project Management](#project-management)
8. [Emergency Scenarios](#emergency-scenarios)
9. [Prompt Templates Library](#prompt-templates-library)

---

## Quick Reference Prompts

### 🚀 Instant Start Prompts

#### New Feature Development
```
I need to create [FEATURE_NAME] for [PROJECT_CONTEXT]. 

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Current tech stack: [List technologies]
Please provide:
1. Architecture overview
2. Implementation plan
3. Code structure
4. Testing strategy
```

#### Bug Investigation
```
I'm experiencing a bug in [COMPONENT/SYSTEM]:

Error: [Error message]
Expected behavior: [What should happen]
Actual behavior: [What's happening]
Environment: [Dev/Staging/Prod]
Recent changes: [What changed recently]

Please help me:
1. Investigate the root cause
2. Create a fix
3. Add tests to prevent regression
4. Document the solution
```

#### Code Review Request
```
Please review this [CODE SECTION/FILE] for:

1. Code quality and best practices
2. Performance optimization opportunities
3. Security vulnerabilities
4. Testing coverage
5. Documentation completeness

Code to review:
```
[PASTE CODE HERE]
```

Focus areas: [Specific areas of concern]
```

#### Performance Analysis
```
Analyze the performance of [COMPONENT/FEATURE]:

Current issues: [Describe performance problems]
Expected performance: [What performance should be]
Metrics to improve: [List specific metrics]

Please provide:
1. Performance bottlenecks identification
2. Optimization recommendations
3. Implementation plan
4. Monitoring strategy
```

### 🛠️ Development Task Prompts

#### Database Schema Changes
```
I need to modify the database schema for [TABLE_NAME]:

Change type: [Add column/Modify table/Create new table]
Reason: [Why this change is needed]
Impact: [What will be affected]

Current schema:
```sql
[PASTE CURRENT SCHEMA]
```

Proposed changes:
```sql
[PASTE PROPOSED CHANGES]
```

Please provide:
1. Migration script
2. Rollback strategy
3. Testing approach
4. Documentation updates
```

#### API Development
```
Create a new API endpoint for [PURPOSE]:

Endpoint: [HTTP method and path]
Input: [Expected input parameters]
Output: [Expected response format]
Authentication: [Required auth level]
Rate limiting: [If applicable]

Technology stack: [List technologies]
Existing similar endpoints: [List similar endpoints]

Please provide:
1. Endpoint implementation
2. Input validation
3. Error handling
4. Documentation
5. Test cases
```

#### Frontend Component Development
```
Create a React component for [COMPONENT_NAME]:

Props: [List expected props]
State: [Internal state requirements]
Styling: [CSS framework/styling approach]
Integration: [How it integrates with existing components]

Current design system: [List design system components]
Browser support: [Target browsers]
Accessibility requirements: [WCAG level, etc.]

Please provide:
1. Component implementation
2. PropTypes/TypeScript definitions
3. Styling
4. Test cases
5. Usage examples
```

---

## Best Practices for AI Collaboration

### 🎯 Communication Guidelines

#### Effective Prompt Writing
- **Be specific**: Instead of "fix the bug", say "fix the authentication timeout issue in the login flow"
- **Provide context**: Include relevant code snippets, error messages, and background information
- **State constraints**: Mention technical limitations, performance requirements, or compatibility needs
- **Request specific outputs**: Ask for particular deliverables (tests, documentation, code, etc.)

#### Iterative Refinement
- Start with a broad request, then narrow down based on responses
- Ask follow-up questions for clarification
- Request examples or demonstrations when needed
- Use "show me" instead of "tell me about" for better understanding

#### Context Management
- Keep conversation history relevant
- Reference previous decisions or changes
- Summarize complex requirements before diving into implementation
- Use consistent terminology throughout the collaboration

### 🔄 Workflow Integration

#### Version Control
- Always commit changes incrementally
- Write descriptive commit messages
- Include relevant issue/ticket numbers
- Tag important milestones or deployments

#### Code Organization
- Follow established project patterns
- Maintain consistent naming conventions
- Keep functions focused and single-purpose
- Document complex logic and algorithms

#### Testing Strategy
- Write tests before or alongside implementation
- Include unit, integration, and end-to-end tests
- Test edge cases and error conditions
- Maintain test coverage above 80%

---

## Development Workflows

### 🏗️ Feature Development Workflow

#### Phase 1: Planning and Design
```markdown
## Feature: [FEATURE_NAME]

### Requirements
- [ ] Functional requirements
- [ ] Non-functional requirements
- [ ] Integration requirements
- [ ] Performance requirements

### Design
- [ ] Architecture diagram
- [ ] Data flow
- [ ] API design
- [ ] Database schema changes

### Implementation Plan
- [ ] Task breakdown
- [ ] Dependencies identification
- [ ] Risk assessment
- [ ] Timeline estimation

### Success Criteria
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] Documentation complete
```

#### Phase 2: Implementation Template
```
Task: [SPECIFIC TASK]
Context: [BACKGROUND INFORMATION]
Approach: [HOW YOU PLAN TO IMPLEMENT]

Steps:
1. [ ] Set up development environment
2. [ ] Create feature branch
3. [ ] Implement core functionality
4. [ ] Add error handling
5. [ ] Write unit tests
6. [ ] Test integration points
7. [ ] Update documentation
8. [ ] Code review preparation

Expected output: [WHAT YOU EXPECT TO DELIVER]
Timeline: [ESTIMATED COMPLETION TIME]
```

#### Phase 3: Review and Testing
```
Review Checklist:
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No security vulnerabilities
- [ ] Performance impact assessed
- [ ] Documentation updated
- [ ] Migration scripts tested
- [ ] Rollback plan verified

Test Cases to Execute:
- [ ] Happy path scenarios
- [ ] Error handling
- [ ] Edge cases
- [ ] Performance benchmarks
- [ ] Security tests
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness
```

### 🔄 Refactoring Workflow

#### Refactoring Request Template
```
Component/File: [PATH TO COMPONENT]
Current Issues:
- [Issue 1]
- [Issue 2]
- [Issue 3]

Refactoring Goals:
- [Goal 1]
- [Goal 2]
- [Goal 3]

Constraints:
- [Constraint 1]
- [Constraint 2]

Refactoring Approach:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Risk Mitigation:
- [Risk 1] → [Mitigation]
- [Risk 2] → [Mitigation]

Expected Benefits:
- [Benefit 1]
- [Benefit 2]
```

#### Code Modernization Template
```
Legacy Component: [COMPONENT_NAME]
Current Technology: [OLD TECH STACK]
Target Technology: [NEW TECH STACK]

Migration Strategy:
1. Assessment Phase
   - [ ] Inventory current functionality
   - [ ] Identify deprecated patterns
   - [ ] Plan migration order

2. Migration Phase
   - [ ] Update dependencies
   - [ ] Refactor core logic
   - [ ] Update tests
   - [ ] Verify functionality

3. Validation Phase
   - [ ] Performance comparison
   - [ ] Functionality verification
   - [ ] Security audit
   - [ ] Documentation update
```

---

## Testing Strategies

### 🧪 Test-Driven Development

#### TDD Cycle Template
```
Red Phase (Write Failing Test):
- [ ] Write test for new functionality
- [ ] Run test to confirm it fails
- [ ] Define expected behavior

Green Phase (Make Test Pass):
- [ ] Write minimal code to pass test
- [ ] Run test to confirm it passes
- [ ] Refactor if needed

Refactor Phase (Improve Code):
- [ ] Improve code structure
- [ ] Ensure all tests still pass
- [ ] Remove duplication
- [ ] Enhance readability
```

#### Unit Testing Template
```javascript
// Test file: [COMPONENT_NAME].test.js
describe('[COMPONENT_NAME]', () => {
  describe('[FUNCTION/METHOD_NAME]', () => {
    test('should [EXPECTED_BEHAVIOR] when [CONDITION]', () => {
      // Arrange
      const input = [TEST_INPUT];
      const expected = [EXPECTED_OUTPUT];
      
      // Act
      const result = [FUNCTION_CALL](input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    test('should handle [EDGE_CASE] gracefully', () => {
      // Arrange
      const edgeCase = [EDGE_CASE_INPUT];
      
      // Act & Assert
      expect([FUNCTION_CALL](edgeCase)).not.toThrow();
    });
  });
});
```

### 🔗 Integration Testing

#### API Integration Test Template
```javascript
describe('[API_ENDPOINT] Integration', () => {
  beforeAll(async () => {
    // Set up test database
    // Initialize test data
  });
  
  afterAll(async () => {
    // Clean up test data
    // Close connections
  });
  
  test('should [EXPECTED_BEHAVIOR] with valid input', async () => {
    const request = {
      method: 'POST',
      url: '/api/[ENDPOINT]',
      payload: [VALID_PAYLOAD]
    };
    
    const response = await server.inject(request);
    
    expect(response.statusCode).toBe(200);
    expect(response.result).toMatchObject([EXPECTED_RESPONSE]);
  });
  
  test('should return error for invalid input', async () => {
    const request = {
      method: 'POST',
      url: '/api/[ENDPOINT]',
      payload: [INVALID_PAYLOAD]
    };
    
    const response = await server.inject(request);
    
    expect(response.statusCode).toBe(400);
    expect(response.result.error).toBe('Bad Request');
  });
});
```

### 🖥️ End-to-End Testing

#### E2E Test Scenario Template
```javascript
// E2E Test: [USER_JOURNEY]
describe('[USER_JOURNEY] E2E', () => {
  test('should complete [USER_JOURNEY] successfully', async () => {
    // Navigate to application
    await page.goto('[APPLICATION_URL]');
    
    // Step 1: [ACTION]
    await page.click('[SELECTOR_1]');
    await page.fill('[INPUT_SELECTOR]', '[INPUT_VALUE]');
    
    // Step 2: [ACTION]
    await page.click('[SELECTOR_2]');
    await expect(page).toHaveSelector('[SUCCESS_INDICATOR]');
    
    // Step 3: [ACTION]
    await page.click('[SELECTOR_3]');
    
    // Verify final state
    await expect(page.url()).toContain('[EXPECTED_URL]');
    await expect(page.locator('[FINAL_SELECTOR]')).toBeVisible();
  });
});
```

### 📊 Performance Testing

#### Performance Test Template
```javascript
describe('[COMPONENT] Performance', () => {
  test('should render within performance budget', async () => {
    const startTime = performance.now();
    
    // Perform the operation
    await [OPERATION]([INPUT]);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan([PERFORMANCE_BUDGET_MS]);
  });
  
  test('should handle [LOAD_CONDITION] efficiently', async () => {
    const largeDataset = generateLargeDataset([DATASET_SIZE]);
    
    const startTime = performance.now();
    await processLargeDataset(largeDataset);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan([MAX_ACCEPTABLE_TIME]);
  });
});
```

---

## Debugging Processes

### 🔍 Systematic Debugging Approach

#### Debug Investigation Template
```
Problem: [BRIEF_DESCRIPTION]
Environment: [Dev/Staging/Prod]
Reproducibility: [Always/Sometimes/Rarely]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result: [WHAT SHOULD HAPPEN]
Actual Result: [WHAT ACTUALLY HAPPENED]

Error Messages:
```
[PASTE ERROR MESSAGES]
```

Relevant Code:
```[LANGUAGE]
[PASTE RELEVANT CODE]
```

Debugging Plan:
1. [ ] Isolate the problem
2. [ ] Check recent changes
3. [ ] Verify data integrity
4. [ ] Test individual components
5. [ ] Review logs
6. [ ] Implement fix
7. [ ] Verify solution
```

#### Debug Commands Reference
```bash
# Database Debugging
psql -d [DATABASE] -c "SELECT * FROM [TABLE] WHERE [CONDITION];"
mongo --eval "db.[COLLECTION].find([QUERY])"

# Application Debugging
npm run dev  # Development server with hot reload
node --inspect [FILE]  # Debug Node.js application
npm test -- --verbose  # Verbose test output

# Log Analysis
tail -f logs/[APPLICATION].log  # Follow logs in real-time
grep -i "error" logs/[APPLICATION].log  # Filter for errors
grep -A 5 -B 5 "[ERROR_MESSAGE]" logs/[APPLICATION].log  # Context around errors

# Performance Debugging
npm run build  # Check build times
lighthouse [URL]  # Performance audit
npm run analyze  # Bundle size analysis
```

### 🐛 Common Issue Resolution

#### Authentication Issues
```
Issue: Authentication failure
Symptoms: [List symptoms]
Debug Steps:
1. [ ] Check token expiration
2. [ ] Verify token format
3. [ ] Test with fresh credentials
4. [ ] Check server logs
5. [ ] Verify API endpoints

Resolution:
- [ ] Refresh token if expired
- [ ] Fix token parsing
- [ ] Update credentials
- [ ] Fix API endpoint
```

#### Database Connection Issues
```
Issue: Database connection failure
Symptoms: [List symptoms]
Debug Steps:
1. [ ] Check connection string
2. [ ] Verify database server status
3. [ ] Test network connectivity
4. [ ] Check credentials
5. [ ] Review connection pool

Resolution:
- [ ] Update connection string
- [ ] Restart database server
- [ ] Fix network configuration
- [ ] Update credentials
- [ ] Adjust connection pool settings
```

#### Performance Issues
```
Issue: Slow application performance
Symptoms: [List symptoms]
Debug Steps:
1. [ ] Profile application
2. [ ] Check database query performance
3. [ ] Monitor memory usage
4. [ ] Analyze network requests
5. [ ] Review CPU usage

Resolution:
- [ ] Optimize queries
- [ ] Add caching
- [ ] Improve algorithm efficiency
- [ ] Scale resources
- [ ] Implement lazy loading
```

---

## Code Optimization

### ⚡ Performance Optimization

#### Optimization Audit Template
```
Component: [COMPONENT_NAME]
Current Performance: [CURRENT_METRICS]
Target Performance: [TARGET_METRICS]

Performance Bottlenecks Identified:
- [Bottleneck 1]
- [Bottleneck 2]
- [Bottleneck 3]

Optimization Strategies:
1. [Strategy 1]
   - Implementation: [HOW]
   - Expected Impact: [IMPACT]
   - Complexity: [LOW/MEDIUM/HIGH]

2. [Strategy 2]
   - Implementation: [HOW]
   - Expected Impact: [IMPACT]
   - Complexity: [LOW/MEDIUM/HIGH]

3. [Strategy 3]
   - Implementation: [HOW]
   - Expected Impact: [IMPACT]
   - Complexity: [LOW/MEDIUM/HIGH]

Implementation Priority:
1. [High Impact, Low Complexity]
2. [High Impact, High Complexity]
3. [Low Impact, Low Complexity]
```

#### Code Review Optimization Checklist
```
Performance Considerations:
- [ ] Avoid unnecessary re-renders
- [ ] Implement proper memoization
- [ ] Use efficient data structures
- [ ] Optimize database queries
- [ ] Implement caching strategies
- [ ] Minimize bundle size
- [ ] Optimize images and assets
- [ ] Use lazy loading where appropriate

Memory Management:
- [ ] Proper cleanup of resources
- [ ] Avoid memory leaks
- [ ] Efficient data handling
- [ ] Garbage collection friendly code

Network Optimization:
- [ ] Minimize HTTP requests
- [ ] Implement request batching
- [ ] Use compression
- [ ] Optimize payload sizes
- [ ] Implement retry logic
```

### 🔧 Code Quality Improvements

#### Refactoring Template
```markdown
## Refactoring: [COMPONENT_NAME]

### Current Issues
- [Issue 1]: [Description]
- [Issue 2]: [Description]
- [Issue 3]: [Description]

### Target Improvements
- [Improvement 1]: [Description]
- [Improvement 2]: [Description]
- [Improvement 3]: [Description]

### Refactoring Steps
1. **Preparation**
   - [ ] Create backup branch
   - [ ] Run existing tests
   - [ ] Document current behavior

2. **Refactoring**
   - [ ] Extract functions
   - [ ] Simplify complex logic
   - [ ] Improve naming
   - [ ] Remove duplication

3. **Validation**
   - [ ] Run all tests
   - [ ] Verify functionality
   - [ ] Performance testing
   - [ ] Code review

### Expected Benefits
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]
```

---

## Project Management

### 📋 Sprint Planning Template

#### Sprint Planning Request
```
Sprint: [SPRINT_NUMBER]
Duration: [DURATION]
Team Capacity: [CAPACITY_HOURS]

Planned Items:
1. [Item 1]
   - Story Points: [POINTS]
   - Dependencies: [DEPENDENCIES]
   - Owner: [ASSIGNEE]

2. [Item 2]
   - Story Points: [POINTS]
   - Dependencies: [DEPENDENCIES]
   - Owner: [ASSIGNEE]

3. [Item 3]
   - Story Points: [POINTS]
   - Dependencies: [DEPENDENCIES]
   - Owner: [ASSIGNEE]

Total Story Points: [TOTAL]
Capacity Check: [OK/OVER/UNDER]

Risks and Mitigation:
- [Risk 1]: [Mitigation]
- [Risk 2]: [Mitigation]
```

#### Daily Standup Template
```
Date: [DATE]
Team Member: [NAME]

Yesterday:
- [Completed Task 1]
- [Completed Task 2]
- [Completed Task 3]

Today:
- [Planned Task 1]
- [Planned Task 2]
- [Planned Task 3]

Blockers:
- [Blocker 1]
- [Blocker 2]

Help Needed:
- [Help Request 1]
- [Help Request 2]
```

### 🎯 Feature Planning Template

#### Feature Planning Request
```
Feature: [FEATURE_NAME]
Epic: [EPIC_NAME]
Priority: [HIGH/MEDIUM/LOW]
Target Release: [RELEASE_VERSION]

### User Stories
1. As a [USER_TYPE], I want [FUNCTIONALITY] so that [BENEFIT]
2. As a [USER_TYPE], I want [FUNCTIONALITY] so that [BENEFIT]
3. As a [USER_TYPE], I want [FUNCTIONALITY] so that [BENEFIT]

### Acceptance Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] [Criteria 3]

### Technical Requirements
- [ ] API endpoints needed
- [ ] Database changes required
- [ ] Frontend components needed
- [ ] Third-party integrations
- [ ] Security considerations

### Dependencies
- [ ] [Dependency 1]
- [ ] [Dependency 2]

### Definition of Done
- [ ] Code implemented
- [ ] Tests written
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Deployed to staging
- [ ] QA testing passed
```

---

## Emergency Scenarios

### 🚨 Production Issues

#### Incident Response Template
```
Incident: [INCIDENT_DESCRIPTION]
Severity: [P1/P2/P3/P4]
Time Detected: [TIMESTAMP]
Reporter: [PERSON]

### Immediate Actions Taken
- [ ] [Action 1]
- [ ] [Action 2]
- [ ] [Action 3]

### Impact Assessment
- Users Affected: [NUMBER]
- Services Impacted: [SERVICES]
- Data Impact: [NONE/PARTIAL/COMPLETE]
- Business Impact: [DESCRIPTION]

### Root Cause Analysis
- Cause: [ROOT CAUSE]
- Contributing Factors:
  - [Factor 1]
  - [Factor 2]

### Resolution
- [ ] Issue identified
- [ ] Fix implemented
- [ ] Services restored
- [ ] Monitoring confirmed

### Prevention Measures
- [ ] [Preventive Measure 1]
- [ ] [Preventive Measure 2]
- [ ] [Preventive Measure 3]

### Timeline
- [TIMESTAMP]: Issue detected
- [TIMESTAMP]: Response initiated
- [TIMESTAMP]: Fix implemented
- [TIMESTAMP]: Services restored
```

#### Emergency Deployment Template
```
Emergency Fix: [BRIEF_DESCRIPTION]
Severity: [P1/P2/P3]
Urgency: [IMMEDIATE/WITHIN_HOUR/WITHIN_DAY]

Change Details:
- Files Modified: [LIST FILES]
- Database Changes: [YES/NO]
- Configuration Changes: [YES/NO]

Risk Assessment:
- Rollback Complexity: [LOW/MEDIUM/HIGH]
- Data Loss Risk: [LOW/MEDIUM/HIGH]
- Service Disruption: [LOW/MEDIUM/HIGH]

Pre-deployment Checklist:
- [ ] Code review completed
- [ ] Tests run locally
- [ ] Backup created
- [ ] Rollback plan prepared
- [ ] Team notified
- [ ] Monitoring enhanced

Deployment Steps:
1. [ ] Deploy to staging
2. [ ] Smoke tests pass
3. [ ] Deploy to production
4. [ ] Verify functionality
5. [ ] Monitor metrics

Rollback Plan:
- Trigger Conditions: [CONDITIONS]
- Rollback Steps: [STEPS]
- Estimated Rollback Time: [TIME]
```

### 🔒 Security Incidents

#### Security Response Template
```
Security Incident: [INCIDENT_TYPE]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Discovery Time: [TIMESTAMP]
Discovery Method: [HOW_DISCOVERED]

### Immediate Response
- [ ] Incident confirmed
- [ ] Systems isolated if needed
- [ ] Evidence preserved
- [ ] Stakeholders notified

### Impact Assessment
- Systems Affected: [LIST SYSTEMS]
- Data Accessed: [WHAT_DATA]
- User Impact: [HOW_MANY_USERS]
- Business Impact: [DESCRIPTION]

### Investigation
- Attack Vector: [HOW_ATTACKER_GAINED_ACCESS]
- Timeline of Events: [DETAILED_TIMELINE]
- Evidence Collected: [LIST_EVIDENCE]

### Remediation
- [ ] Vulnerability patched
- [ ] Compromised accounts reset
- [ ] Security measures enhanced
- [ ] Monitoring improved

### Lessons Learned
- [ ] [Lesson 1]
- [ ] [Lesson 2]
- [ ] [Lesson 3]
```

### 💾 Data Recovery

#### Data Recovery Template
```
Data Loss Incident
Recovery Type: [ACCIDENTAL_DELETION/CORRUPTION/SYSTEM_FAILURE]
Affected Data: [WHAT_DATA]
Loss Time: [WHEN_LOST]
Recovery Priority: [CRITICAL/HIGH/MEDIUM/LOW]

### Recovery Assessment
- Backup Availability: [YES/NO]
- Backup Freshness: [DATE_OF_LAST_BACKUP]
- Recovery Complexity: [LOW/MEDIUM/HIGH]
- Downtime Estimate: [TIME_ESTIMATE]

### Recovery Plan
1. [ ] Verify backup integrity
2. [ ] Prepare recovery environment
3. [ ] Restore data
4. [ ] Verify data consistency
5. [ ] Update systems
6. [ ] Validate functionality

### Business Continuity
- Alternative Solutions: [OPTIONS]
- Manual Workarounds: [WORKAROUNDS]
- User Communication: [PLAN]

### Post-Recovery
- [ ] Data validation completed
- [ ] System functionality verified
- [ ] Users notified
- [ ] Lessons documented
- [ ] Backup strategy reviewed
```

---

## Prompt Templates Library

### 🎨 UI/UX Development Prompts

#### Component Design Prompt
```
Design a [COMPONENT_TYPE] component for [APPLICATION_CONTEXT].

Requirements:
- Responsive design (mobile, tablet, desktop)
- Accessibility compliant (WCAG 2.1 AA)
- Performance optimized
- Consistent with design system

Design Specifications:
- Primary color: [COLOR]
- Typography: [FONT_STACK]
- Spacing: [SPACING_SYSTEM]
- Border radius: [RADIUS]

Interactions:
- [Interaction 1]: [Behavior]
- [Interaction 2]: [Behavior]
- [Interaction 3]: [Behavior]

State Management:
- Loading state: [Description]
- Error state: [Description]
- Empty state: [Description]

Please provide:
1. HTML structure
2. CSS styling
3. JavaScript functionality
4. Accessibility attributes
5. Test cases
6. Usage examples
```

#### Form Development Prompt
```
Create a [FORM_TYPE] form for [PURPOSE].

Form Fields:
1. [Field 1]
   - Type: [INPUT_TYPE]
   - Validation: [VALIDATION_RULES]
   - Required: [YES/NO]

2. [Field 2]
   - Type: [INPUT_TYPE]
   - Validation: [VALIDATION_RULES]
   - Required: [YES/NO]

Form Requirements:
- Client-side validation
- Server-side validation ready
- Error handling and display
- Loading states
- Success feedback
- Mobile responsive

Accessibility Requirements:
- Proper labeling
- Keyboard navigation
- Screen reader support
- Focus management

Please provide:
1. Form HTML structure
2. Validation logic
3. Styling
4. Submission handling
5. Error handling
6. Test cases
```

### 🔌 API Development Prompts

#### RESTful API Design Prompt
```
Design a RESTful API for [RESOURCE_NAME].

API Purpose: [DESCRIPTION]
Base URL: [BASE_URL]
Authentication: [AUTH_METHOD]

Endpoints Required:
1. GET /[RESOURCE] - List [RESOURCE]
   - Query Parameters: [PARAMETERS]
   - Response Format: [FORMAT]

2. GET /[RESOURCE]/{id} - Get single [RESOURCE]
   - Path Parameters: [PARAMETERS]
   - Response Format: [FORMAT]

3. POST /[RESOURCE] - Create new [RESOURCE]
   - Request Body: [SCHEMA]
   - Response Format: [FORMAT]

4. PUT /[RESOURCE]/{id} - Update [RESOURCE]
   - Request Body: [SCHEMA]
   - Response Format: [FORMAT]

5. DELETE /[RESOURCE]/{id} - Delete [RESOURCE]
   - Response Format: [FORMAT]

Requirements:
- Input validation
- Error handling
- Rate limiting
- Pagination support
- Filtering and sorting
- API documentation

Please provide:
1. OpenAPI/Swagger specification
2. Implementation code
3. Validation logic
4. Error handling
5. Test cases
6. Documentation
```

#### GraphQL API Design Prompt
```
Design a GraphQL API for [APPLICATION_NAME].

Schema Requirements:
- Query types: [LIST_QUERIES]
- Mutation types: [LIST_MUTATIONS]
- Subscription types: [LIST_SUBSCRIPTIONS]

Data Models:
1. [Model 1]
   - Fields: [LIST_FIELDS]
   - Relationships: [RELATIONSHIPS]

2. [Model 2]
   - Fields: [LIST_FIELDS]
   - Relationships: [RELATIONSHIPS]

Requirements:
- Type safety
- Input validation
- Authentication
- Authorization
- Performance optimization
- Real-time updates

Please provide:
1. GraphQL schema definition
2. Resolver implementations
3. Type definitions
4. Query optimization
5. Test cases
6. Documentation
```

### 📊 Database Design Prompts

#### Database Schema Design Prompt
```
Design a database schema for [APPLICATION_NAME].

Entities Required:
1. [Entity 1]
   - Attributes: [LIST_ATTRIBUTES]
   - Relationships: [RELATIONSHIPS]
   - Constraints: [CONSTRAINTS]

2. [Entity 2]
   - Attributes: [LIST_ATTRIBUTES]
   - Relationships: [RELATIONSHIPS]
   - Constraints: [CONSTRAINTS]

Requirements:
- ACID compliance
- Normalization (3NF)
- Performance optimization
- Scalability considerations
- Backup and recovery
- Data integrity

Constraints:
- [Constraint 1]
- [Constraint 2]
- [Constraint 3]

Please provide:
1. ER diagram description
2. CREATE TABLE statements
3. Indexes for performance
4. Foreign key relationships
5. Sample data
6. Migration scripts
```

### 🔐 Security Implementation Prompts

#### Authentication System Prompt
```
Implement authentication system for [APPLICATION_TYPE].

Authentication Methods:
- Email/Password
- OAuth 2.0 (Google, GitHub)
- Multi-factor authentication
- Session management

Security Requirements:
- Password hashing (bcrypt/argon2)
- JWT token management
- CSRF protection
- Rate limiting
- Account lockout
- Password reset flow

Session Management:
- Session timeout: [DURATION]
- Refresh token strategy
- Single sign-on support
- Logout functionality

Please provide:
1. Authentication flow diagram
2. Backend implementation
3. Frontend integration
4. Security middleware
5. Test cases
6. Security checklist
```

#### Authorization System Prompt
```
Implement authorization system for [APPLICATION_TYPE].

User Roles:
1. [Role 1] - [Description]
   - Permissions: [LIST_PERMISSIONS]

2. [Role 2] - [Description]
   - Permissions: [LIST_PERMISSIONS]

3. [Role 3] - [Description]
   - Permissions: [LIST_PERMISSIONS]

Resource Types:
- [Resource 1]: [PERMISSION_SCHEME]
- [Resource 2]: [PERMISSION_SCHEME]
- [Resource 3]: [PERMISSION_SCHEME]

Requirements:
- Role-based access control (RBAC)
- Resource-level permissions
- Dynamic permission checking
- Audit logging
- Permission inheritance

Please provide:
1. Permission matrix
2. Role definitions
3. Middleware implementation
4. Frontend guards
5. Database schema
6. Test cases
```

### 📱 Mobile Development Prompts

#### React Native Component Prompt
```
Create a React Native component for [COMPONENT_NAME].

Platform Support: [iOS/Android/Both]
Component Type: [SCREEN/COMPONENT/UTILITY]

Props:
- [Prop 1]: [Type] - [Description]
- [Prop 2]: [Type] - [Description]
- [Prop 3]: [Type] - [Description]

Styling:
- Design system: [SYSTEM_NAME]
- Theme colors: [COLORS]
- Typography: [FONT_SPECS]

Platform-Specific Features:
- [iOS Feature 1]
- [Android Feature 1]

State Management:
- Local state: [DESCRIPTION]
- Global state: [DESCRIPTION]
- Navigation: [NAVIGATION_TYPE]

Please provide:
1. Component implementation
2. Platform-specific code
3. Styling
4. Navigation integration
5. Test cases
6. Usage examples
```

#### Flutter Widget Prompt
```
Create a Flutter widget for [WIDGET_NAME].

Widget Type: [STATEFUL/STATELESS/CUSTOM]
Platform Support: [iOS/Android/Web]

Properties:
- [Property 1]: [Type] - [Description]
- [Property 2]: [Type] - [Description]
- [Property 3]: [Type] - [Description]

Design Specifications:
- Material Design: [YES/NO]
- Cupertino Design: [YES/NO]
- Custom theme: [THEME_NAME]

State Management:
- Local state: [STATE_MANAGEMENT]
- Global state: [STATE_MANAGEMENT]

Performance Considerations:
- [Performance Requirement 1]
- [Performance Requirement 2]

Please provide:
1. Widget implementation
2. Custom painter if needed
3. Animation code
4. Test cases
5. Usage examples
6. Performance optimization
```

---

## Usage Guide

### 🚀 Getting Started

1. **Copy the relevant template** from this playbook
2. **Fill in the placeholders** with your specific requirements
3. **Paste the template** into your AI collaboration tool
4. **Iterate and refine** based on the responses
5. **Document your results** for future reference

### 📝 Template Customization

Feel free to modify templates based on your:
- Project requirements
- Team preferences
- Technology stack
- Development methodology
- Quality standards

### 🔄 Continuous Improvement

- Update templates based on lessons learned
- Share successful patterns with your team
- Track template effectiveness
- Contribute improvements back to the playbook

### 🤝 Team Collaboration

- Share this playbook with your development team
- Establish team-specific templates
- Create role-based prompt libraries
- Regular playbook review and updates

---

**Version:** 1.0  
**Last Updated:** 2025-12-21  
**Maintained By:** Development Team  
**License:** Internal Use Only

---

*This playbook is a living document. Please contribute improvements and updates to keep it relevant and valuable for your development workflows.*