-- Rename subscription tier values: starter→brand, pro→build, enterprise→yield
UPDATE public.author_profiles SET subscription_tier = 'brand' WHERE subscription_tier = 'starter';
UPDATE public.author_profiles SET subscription_tier = 'build' WHERE subscription_tier = 'pro';
UPDATE public.author_profiles SET subscription_tier = 'yield' WHERE subscription_tier = 'enterprise';