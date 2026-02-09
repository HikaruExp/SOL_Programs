# SOL Programs Website - Deep Dive Fix Plan

## Current Problems
1. Program pages show 404
2. Data not loading properly
3. CSP issues (potentially fixed)
4. Client components causing errors

## Root Cause Analysis

### Architecture Issues
- Overly complex data flow: DB → JSON → Build → Static Pages
- Client components with 'use client' causing hydration mismatches
- Data lookup failing at runtime

### Simplification Strategy
1. **PURE STATIC GENERATION** - No DB at build time
2. **JSON ONLY** - Direct import, no async functions
3. **NO CLIENT COMPONENTS** - All server-rendered
4. **SIMPLE LOOKUP** - Direct array find

## Execution Steps

### Step 1: Simplify Data Loading
- Remove all DB connection code
- Use direct JSON import
- Synchronous data access

### Step 2: Fix Program Page
- Remove all client components
- Simple server-side rendering
- Direct program lookup

### Step 3: Test Local Build
- Verify all 108 pages generate
- Test program detail pages
- Check no console errors

### Step 4: Deploy
- Push to GitHub
- Verify Vercel deployment
- Test live site

## Success Criteria
- ✅ Homepage loads with 1,389 programs
- ✅ Program list page works
- ✅ Individual program pages load without 404
- ✅ No console errors
- ✅ All data displays correctly
