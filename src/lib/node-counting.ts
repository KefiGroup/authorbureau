/**
 * Frontend re-export of the canonical counter rules.
 * The actual rules live in `supabase/functions/_shared/node-counting.ts`.
 * DO NOT add logic here.
 */
export {
  BUILT_PRODUCT_STATUSES,
  isBuiltProductStatus,
  bookForCountedRow,
} from "../../supabase/functions/_shared/node-counting";
