
## Fix BP-03 step reset bug — add hasResumed ref guard

### Root cause
The resume `useEffect` at line 50–123 in `BP03Builder.tsx` re-fires whenever `authorId` changes reference (which can happen on parent re-renders of `NodeBuilder.tsx` if `author_profiles` query re-resolves, or if the component briefly remounts during navigation). When it re-fires, it overwrites `step` back to whatever the DB says — but if the await chain is mid-flight and the user has clicked forward, or if there's any flash where state isn't yet synced, the user sees a reset to Step 0/1.

### Fix (single file, exactly as specified)

**File:** `src/components/dashboard/builders/bp03/BP03Builder.tsx`

1. Add a ref at the top of the component (after line 47):
   ```ts
   const hasResumed = useRef(false);
   ```

2. At the start of the resume `useEffect` (line 50), add the guard:
   ```ts
   useEffect(() => {
     if (!authorId) return;
     if (hasResumed.current) return;
     hasResumed.current = true;
     (async () => { ... })();
   }, [authorId]);
   ```

3. Confirm dependency array stays `[authorId]` (already correct — no change needed).

### What stays untouched
- All content generation logic
- Edge functions
- Other node builders (BP-01, 02, 04, 05, 06, 07, 08, 09)
- The book-title resolution and node-status mapping inside the effect

### Test plan
1. Open BP-03 → should land on Step 3 (Review) since `status='content_ready'`/`live`.
2. Navigate to Dashboard, then back to BP-03 → must remain on Step 3.
3. Confirm `[BP-03 mount]` console log fires exactly once per session.
